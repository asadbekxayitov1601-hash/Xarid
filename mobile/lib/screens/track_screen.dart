import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../services/sse_client.dart';
import '../services/routing_service.dart';
import '../theme.dart';

/// Live order tracking. Opens the SSE stream
/// `GET {apiBaseUrl}/api/orders/{orderId}/stream`, renders the order status and
/// an OpenStreetMap map with the courier's moving marker and the destination.
/// Seeds itself from the one-shot `GET /api/orders/{orderId}/track` snapshot so
/// the map has something to draw before the first SSE frame arrives.
///
/// Self-contained on purpose (no edits to shared api.dart): it reads the bearer
/// token from `shared_preferences` ('token') and talks to [Config.apiBaseUrl]
/// directly.
class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> with SingleTickerProviderStateMixin {
  // Kokand (Qo'qon) city center — sensible default before we have any point.
  static const _kokand = LatLng(40.5283, 70.9425);

  final MapController _map = MapController();
  SseClient? _sse;
  StreamSubscription<Map<String, dynamic>>? _eventSub;
  StreamSubscription<bool>? _reconnectSub;

  // Smoothly tween the courier marker from its previous fix to the new one so
  // it glides between live events instead of teleporting. The backend pushes a
  // fresh location roughly every ~15s (driver app cadence).
  late final AnimationController _moveCtl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
  LatLng? _driverFrom;
  LatLng? _driverTo;

  bool _loading = true;
  bool _reconnecting = false;

  String _status = 'PLACED';
  int? _etaMin;

  LatLng? _driver;
  LatLng? _destination;
  String? _driverName;
  String? _driverPhone;
  String? _driverCarType;
  String? _driverCarNumber;
  String? _address;

  // The OSRM road route from the courier to the drop, refreshed as the courier
  // moves. Its duration/distance also feed the live ETA in the status bar.
  RoutePath? _route;
  final Distance _distance = const Distance();
  LatLng? _lastRouteOrigin;
  DateTime? _lastRouteAt;
  bool _routeLoading = false;
  // Auto-frame the map only once (with the courier present); afterwards respect
  // the user's own pan/zoom instead of yanking back every location frame.
  bool _framedOnce = false;
  // Backfill the courier's vehicle at most once when the driver first appears
  // over SSE (the 'location' event carries name + position but no car info).
  bool _driverDetailsRequested = false;

  @override
  void initState() {
    super.initState();
    // Drive the interpolated courier position as the tween animates.
    _moveCtl.addListener(_onMoveTick);
    _bootstrap();
  }

  @override
  void dispose() {
    _moveCtl.removeListener(_onMoveTick);
    _moveCtl.dispose();
    _eventSub?.cancel();
    _reconnectSub?.cancel();
    _sse?.close();
    _map.dispose();
    super.dispose();
  }

  /// Interpolate the rendered courier position along the active tween.
  void _onMoveTick() {
    final from = _driverFrom;
    final to = _driverTo;
    if (from == null || to == null) return;
    final t = _moveCtl.value;
    setState(() {
      _driver = LatLng(
        from.latitude + (to.latitude - from.latitude) * t,
        from.longitude + (to.longitude - from.longitude) * t,
      );
    });
  }

  /// Move the courier marker to [next], gliding from its current rendered
  /// position. The very first fix snaps into place (no start point to glide from).
  void _moveCourierTo(LatLng next) {
    final start = _driver;
    if (start == null) {
      _driverFrom = next;
      _driverTo = next;
      _driver = next;
      return;
    }
    _driverFrom = start;
    _driverTo = next;
    _moveCtl
      ..reset()
      ..forward();
  }

  Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<void> _bootstrap() async {
    final token = await _token();
    final authHeaders = <String, String>{
      if (token != null) 'Authorization': 'Bearer $token',
    };

    // 1) One-shot snapshot so the UI is populated immediately. Best-effort —
    //    if it fails, the SSE stream will still fill everything in.
    await _loadSnapshot(authHeaders);

    if (!mounted) return;
    setState(() => _loading = false);

    // Already finished before we even opened: render the static snapshot and
    // skip the live stream entirely (nothing left to push).
    if (_isTerminal(_status)) return;

    // 2) Live stream. Reconnect/backoff is handled inside SseClient.
    final sse = SseClient(
      '${Config.apiBaseUrl}/api/orders/${widget.orderId}/stream',
      headers: authHeaders,
    );
    _sse = sse;
    _eventSub = sse.events.listen(_onEvent);
    _reconnectSub = sse.reconnecting.listen((r) {
      if (mounted) setState(() => _reconnecting = r);
    });
    sse.connect();
  }

  Future<void> _loadSnapshot(Map<String, String> authHeaders) async {
    try {
      final res = await http
          .get(
            Uri.parse('${Config.apiBaseUrl}/api/orders/${widget.orderId}/track'),
            headers: authHeaders,
          )
          .timeout(const Duration(seconds: 12));
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      final data = jsonDecode(res.body);
      if (data is! Map) return;

      final buyer = data['buyer'];
      final driver = data['driver'];

      setState(() {
        if (data['status'] is String) _status = data['status'] as String;
        _etaMin = _asInt(data['eta']);
        if (buyer is Map) {
          _address = buyer['address'] as String?;
          final dest = _asLatLng(buyer['lat'], buyer['lng']);
          if (dest != null) _destination = dest;
        }
        if (driver is Map) {
          _driverName = driver['name'] as String?;
          _driverPhone = driver['phone'] as String?;
          _driverCarType = driver['carType'] as String?;
          _driverCarNumber = driver['carNumber'] as String?;
          final dp = _asLatLng(driver['lat'], driver['lng']);
          if (dp != null) {
            // Snap (no glide) — this is the first known position.
            _driverFrom = dp;
            _driverTo = dp;
            _driver = dp;
          }
        }
      });

      // Frame both points once we have them so the map opens already framed.
      if (_driver != null || _destination != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _fitToPoints());
      }
      _maybeLoadRoute();
    } catch (_) {
      // Snapshot is best-effort; ignore and rely on the live stream.
    }
  }

  void _onEvent(Map<String, dynamic> ev) {
    if (!mounted) return;
    final type = ev['type'];

    if (type == 'status') {
      setState(() {
        if (ev['status'] is String) _status = ev['status'] as String;
        _etaMin = _asInt(ev['eta']);
      });
      // The order reached a terminal state — there will be no more movement, so
      // tear the live stream down. The marker stays where it last was.
      if (_isTerminal(_status)) _stopStream();
      return;
    }

    if (type == 'location') {
      if (ev['name'] is String) {
        setState(() => _driverName = ev['name'] as String);
      }
      // Courier just appeared over SSE -> backfill the vehicle once, since the
      // location event has no car info.
      if (_driverCarType == null && !_driverDetailsRequested) {
        _driverDetailsRequested = true;
        _backfillDriverDetails();
      }
      final p = _asLatLng(ev['lat'], ev['lng']);
      if (p != null) {
        _moveCourierTo(p);
        // Keep the courier comfortably in view as it moves.
        _fitToPoints();
        // Refresh the road route + ETA as the courier advances (throttled).
        _maybeLoadRoute();
      }
    }
  }

  /// Permanently stop the live stream (e.g. on DELIVERED/CANCELLED). Idempotent.
  void _stopStream() {
    _moveCtl.stop();
    _eventSub?.cancel();
    _eventSub = null;
    _reconnectSub?.cancel();
    _reconnectSub = null;
    _sse?.close();
    _sse = null;
    if (mounted && _reconnecting) setState(() => _reconnecting = false);
  }

  // Fetch (or refresh) the courier -> drop road route. Throttled: skipped unless
  // there is no route yet or the courier has moved > 200m since the last fetch,
  // so the public OSRM server isn't hit on every ~15s location frame.
  Future<void> _maybeLoadRoute() async {
    final from = _driverTo ?? _driver;
    final dest = _destination;
    if (from == null || dest == null || _routeLoading) return;
    // Throttle every ATTEMPT (independent of whether a route already exists) so
    // a degraded/rate-limited OSRM isn't hit on every ~15s frame: skip only when
    // the last attempt was both nearby (<200m) AND recent (<20s). Moving >200m
    // or 20s elapsing lets the next frame retry, so a transient failure recovers
    // without spamming the server.
    if (_lastRouteOrigin != null && _lastRouteAt != null) {
      final moved = _distance.as(LengthUnit.Meter, _lastRouteOrigin!, from);
      final elapsed = DateTime.now().difference(_lastRouteAt!);
      if (moved < 200 && elapsed < const Duration(seconds: 20)) return;
    }
    _routeLoading = true;
    _lastRouteOrigin = from;
    _lastRouteAt = DateTime.now();
    try {
      final path = await RoutingService.route(from, dest);
      if (mounted && path != null) setState(() => _route = path);
    } finally {
      _routeLoading = false;
    }
  }

  // The SSE stream carries the courier's name + position but not the vehicle.
  // When the courier first appears mid-session, fetch the one-shot /track
  // snapshot once to fill in the car type/number (and phone) for the card.
  Future<void> _backfillDriverDetails() async {
    final token = await _token();
    try {
      final res = await http
          .get(
            Uri.parse('${Config.apiBaseUrl}/api/orders/${widget.orderId}/track'),
            headers: {if (token != null) 'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 12));
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      final data = jsonDecode(res.body);
      if (data is! Map || data['driver'] is! Map) return;
      final driver = data['driver'] as Map;
      if (!mounted) return;
      setState(() {
        _driverName ??= driver['name'] as String?;
        _driverPhone ??= driver['phone'] as String?;
        _driverCarType = driver['carType'] as String?;
        _driverCarNumber = driver['carNumber'] as String?;
      });
    } catch (_) {
      // Best-effort; the card still shows the name + call button.
    }
  }

  void _fitToPoints() {
    // Auto-frame only until we've framed once with the courier on screen, so
    // the camera stops fighting the user's manual pan/zoom on later frames.
    if (_framedOnce) return;
    final pts = <LatLng>[
      if (_driver != null) _driver!,
      if (_destination != null) _destination!,
    ];
    if (pts.isEmpty) return;
    try {
      if (pts.length == 1) {
        _map.move(pts.first, 15);
      } else {
        _map.fitCamera(
          CameraFit.coordinates(
            coordinates: pts,
            padding: const EdgeInsets.all(64),
            maxZoom: 16,
          ),
        );
      }
      // Lock only once the courier is actually present, so a destination-only
      // early fit doesn't prevent framing both when the courier appears.
      if (_driver != null) _framedOnce = true;
    } catch (_) {
      // Map may not be laid out yet on the very first frame; harmless.
    }
  }

  Future<void> _callDriver(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  static int? _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.round();
    if (v is String) return int.tryParse(v);
    return null;
  }

  static LatLng? _asLatLng(dynamic lat, dynamic lng) {
    final a = lat is num ? lat.toDouble() : (lat is String ? double.tryParse(lat) : null);
    final b = lng is num ? lng.toDouble() : (lng is String ? double.tryParse(lng) : null);
    if (a == null || b == null) return null;
    return LatLng(a, b);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Buyurtmani kuzatish', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Brand.green))
          : Column(
              children: [
                _StatusBar(
                  status: _status,
                  // Prefer the OSRM driving time when we have a route; fall back
                  // to the server's straight-line ETA otherwise.
                  etaMin: _route?.durationMin ?? _etaMin,
                  distanceKm: _route?.distanceKm,
                  reconnecting: _reconnecting,
                ),
                Expanded(
                  child: _driver == null && _destination == null
                      ? _NoLocationYet(status: _status)
                      : _MapView(
                          controller: _map,
                          driver: _driver,
                          destination: _destination,
                          route: _route,
                          fallbackCenter: _kokand,
                          driverName: _driverName,
                        ),
                ),
                if (_driverName != null && _driverName!.isNotEmpty && !_isTerminal(_status))
                  _CourierCard(
                    name: _driverName!,
                    carType: _driverCarType,
                    carNumber: _driverCarNumber,
                    etaMin: _route?.durationMin ?? _etaMin,
                    onCall: _driverPhone != null && _driverPhone!.isNotEmpty
                        ? () => _callDriver(_driverPhone!)
                        : null,
                  ),
                if (_address != null && _address!.isNotEmpty) _AddressFooter(address: _address!),
              ],
            ),
    );
  }
}

/// Courier info shown to the buyer: name, vehicle, a call button, and the
/// approximate arrival clock time derived from the live ETA.
class _CourierCard extends StatelessWidget {
  const _CourierCard({
    required this.name,
    this.carType,
    this.carNumber,
    this.etaMin,
    this.onCall,
  });

  final String name;
  final String? carType;
  final String? carNumber;
  final int? etaMin;
  final VoidCallback? onCall;

  String get _vehicle {
    final parts = <String>[
      if (carType != null && carType!.isNotEmpty) carType!,
      if (carNumber != null && carNumber!.isNotEmpty) carNumber!,
    ];
    return parts.isEmpty ? 'Kuryer' : parts.join(' · ');
  }

  String? _arrivalClock() {
    final e = etaMin;
    if (e == null || e < 0) return null;
    final t = DateTime.now().add(Duration(minutes: e));
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(t.hour)}:${two(t.minute)}';
  }

  @override
  Widget build(BuildContext context) {
    final arrival = _arrivalClock();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: const BoxDecoration(
        color: Brand.cream,
        border: Border(top: BorderSide(color: Brand.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(color: Brand.green.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: const Icon(Icons.delivery_dining, color: Brand.green, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink)),
                    Text(_vehicle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                  ],
                ),
              ),
              if (onCall != null)
                Material(
                  color: Brand.green,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: onCall,
                    child: const SizedBox(width: 46, height: 46, child: Icon(Icons.call, color: Brand.onAccent)),
                  ),
                ),
            ],
          ),
          if (etaMin != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: Brand.card, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  const Icon(Icons.schedule, size: 18, color: Brand.green),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      arrival != null ? 'Taxminan $arrival da yetib keladi' : 'Yetib kelmoqda',
                      style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w700, fontSize: 13.5),
                    ),
                  ),
                  if (etaMin! > 0)
                    Text('~$etaMin daq',
                        style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Status pill + ETA, plus a calm "reconnecting" hint when the SSE drops.
class _StatusBar extends StatelessWidget {
  const _StatusBar({
    required this.status,
    required this.etaMin,
    required this.reconnecting,
    this.distanceKm,
  });

  final String status;
  final int? etaMin;
  final double? distanceKm;
  final bool reconnecting;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: const BoxDecoration(
        color: Brand.cream,
        border: Border(bottom: BorderSide(color: Brand.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _statusLabel(status),
                  style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 13),
                ),
              ),
              const Spacer(),
              if (etaMin != null && !_isTerminal(status))
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 16, color: Brand.inkSoft),
                    const SizedBox(width: 4),
                    Text(
                      [
                        if (distanceKm != null)
                          distanceKm! >= 10
                              ? '${distanceKm!.toStringAsFixed(0)} km'
                              : '${distanceKm!.toStringAsFixed(1)} km',
                        etaMin! <= 0 ? 'Yaqinda' : '~$etaMin daq',
                      ].join(' · '),
                      style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ],
                ),
            ],
          ),
          if (reconnecting && !_isTerminal(status)) ...[
            const SizedBox(height: 10),
            const Row(
              children: [
                SizedBox(
                  width: 13,
                  height: 13,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Brand.inkSoft),
                ),
                SizedBox(width: 8),
                Text(
                  'Qayta ulanmoqda...',
                  style: TextStyle(color: Brand.inkSoft, fontSize: 12.5),
                ),
              ],
            ),
          ],
          if (_isTerminal(status)) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  status == 'DELIVERED' ? Icons.check_circle : Icons.cancel,
                  size: 16,
                  color: color,
                ),
                const SizedBox(width: 6),
                Text(
                  status == 'DELIVERED'
                      ? 'Buyurtmangiz yetkazildi. Rahmat!'
                      : 'Buyurtma bekor qilindi.',
                  style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The flutter_map widget with OSM tiles (no API key), a destination marker and
/// the courier marker.
class _MapView extends StatelessWidget {
  const _MapView({
    required this.controller,
    required this.driver,
    required this.destination,
    required this.route,
    required this.fallbackCenter,
    required this.driverName,
  });

  final MapController controller;
  final LatLng? driver;
  final LatLng? destination;
  final RoutePath? route;
  final LatLng fallbackCenter;
  final String? driverName;

  @override
  Widget build(BuildContext context) {
    final initialCenter = driver ?? destination ?? fallbackCenter;
    return FlutterMap(
      mapController: controller,
      options: MapOptions(
        initialCenter: initialCenter,
        initialZoom: driver != null || destination != null ? 14 : 12,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'uz.xarid.app',
          maxZoom: 19,
        ),
        // The actual road route when we have it; a straight hint line otherwise.
        if (route != null)
          PolylineLayer(
            polylines: [
              Polyline(points: route!.points, color: Brand.green, strokeWidth: 4),
            ],
          )
        else if (driver != null && destination != null)
          PolylineLayer(
            polylines: [
              Polyline(
                points: [driver!, destination!],
                color: Brand.green.withValues(alpha: 0.5),
                strokeWidth: 3,
              ),
            ],
          ),
        MarkerLayer(
          markers: [
            if (destination != null)
              Marker(
                point: destination!,
                width: 44,
                height: 44,
                alignment: Alignment.topCenter,
                child: const _Pin(icon: Icons.location_on, color: Brand.amber),
              ),
            if (driver != null)
              Marker(
                point: driver!,
                width: 48,
                height: 48,
                child: const _CourierPin(),
              ),
          ],
        ),
      ],
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.icon, required this.color});
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Icon(icon, color: color, size: 40, shadows: const [
      Shadow(color: Color(0x55000000), blurRadius: 4, offset: Offset(0, 2)),
    ]);
  }
}

class _CourierPin extends StatelessWidget {
  const _CourierPin();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Brand.green,
        shape: BoxShape.circle,
        border: Border.all(color: Brand.cream, width: 3),
        boxShadow: const [BoxShadow(color: Color(0x44000000), blurRadius: 6, offset: Offset(0, 2))],
      ),
      child: const Icon(Icons.delivery_dining, color: Brand.onAccent, size: 24),
    );
  }
}

/// Shown when there is no courier location yet (not assigned / not moving). We
/// keep the customer reassured with the current status instead of a blank map.
class _NoLocationYet extends StatelessWidget {
  const _NoLocationYet({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.local_shipping_outlined, size: 56, color: Brand.inkSoft),
            const SizedBox(height: 16),
            Text(
              _statusLabel(status),
              style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 18),
            ),
            const SizedBox(height: 8),
            const Text(
              'Kuryer tayinlanishini kutmoqdamiz. Joylashuvi paydo bo\'lishi bilan xaritada ko\'rinadi.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Brand.inkSoft, fontSize: 14, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddressFooter extends StatelessWidget {
  const _AddressFooter({required this.address});
  final String address;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Brand.cream,
        border: Border(top: BorderSide(color: Brand.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_on, size: 18, color: Brand.amber),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              address,
              style: const TextStyle(color: Brand.ink, fontSize: 14, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Status helpers (mirror lib/driver.ts GoPhase + the web tracking page) ---

bool _isTerminal(String status) => status == 'DELIVERED' || status == 'CANCELLED';

Color _statusColor(String status) {
  switch (status) {
    case 'DELIVERED':
      return const Color(0xFF0D9488); // teal success
    case 'PICKED_UP':
    case 'EN_ROUTE':
    case 'DELIVERING':
      return const Color(0xFF7C3AED); // in-motion purple
    case 'CANCELLED':
      return Brand.inkSoft;
    default:
      return Brand.amber; // PLACED / CONFIRMED / PARTIAL / ASSIGNED
  }
}

String _statusLabel(String status) {
  switch (status) {
    case 'PLACED':
      return 'Joylashtirildi';
    case 'CONFIRMED':
    case 'PARTIAL':
      return 'Tasdiqlandi';
    case 'ASSIGNED':
      return 'Kuryer tayinlandi';
    case 'PICKED_UP':
      return 'Olib ketildi';
    case 'EN_ROUTE':
    case 'DELIVERING':
      return 'Yetkazilmoqda';
    case 'DELIVERED':
      return 'Yetkazildi';
    case 'CANCELLED':
      return 'Bekor qilindi';
    default:
      return status;
  }
}
