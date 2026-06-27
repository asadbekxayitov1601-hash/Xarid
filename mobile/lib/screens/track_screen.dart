import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../services/sse_client.dart';
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

class _TrackScreenState extends State<TrackScreen> {
  // Kokand (Qo'qon) city center — sensible default before we have any point.
  static const _kokand = LatLng(40.5283, 70.9425);

  final MapController _map = MapController();
  SseClient? _sse;
  StreamSubscription<Map<String, dynamic>>? _eventSub;
  StreamSubscription<bool>? _reconnectSub;

  bool _loading = true;
  bool _reconnecting = false;

  String _status = 'PLACED';
  int? _etaMin;

  LatLng? _driver;
  LatLng? _destination;
  String? _driverName;
  String? _address;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    _reconnectSub?.cancel();
    _sse?.close();
    _map.dispose();
    super.dispose();
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
          final dp = _asLatLng(driver['lat'], driver['lng']);
          if (dp != null) _driver = dp;
        }
      });
    } catch (_) {
      // Snapshot is best-effort; ignore and rely on the live stream.
    }
  }

  void _onEvent(Map<String, dynamic> ev) {
    if (!mounted) return;
    final type = ev['type'];
    setState(() {
      if (type == 'status') {
        if (ev['status'] is String) _status = ev['status'] as String;
        _etaMin = _asInt(ev['eta']);
      } else if (type == 'location') {
        final p = _asLatLng(ev['lat'], ev['lng']);
        if (p != null) {
          _driver = p;
          if (ev['name'] is String) _driverName = ev['name'] as String;
        }
      }
    });

    // Keep the courier comfortably in view as it moves.
    if (type == 'location' && _driver != null) {
      _fitToPoints();
    }
  }

  void _fitToPoints() {
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
    } catch (_) {
      // Map may not be laid out yet on the very first frame; harmless.
    }
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
                  etaMin: _etaMin,
                  reconnecting: _reconnecting,
                ),
                Expanded(
                  child: _driver == null && _destination == null
                      ? _NoLocationYet(status: _status)
                      : _MapView(
                          controller: _map,
                          driver: _driver,
                          destination: _destination,
                          fallbackCenter: _kokand,
                          driverName: _driverName,
                        ),
                ),
                if (_address != null && _address!.isNotEmpty) _AddressFooter(address: _address!),
              ],
            ),
    );
  }
}

/// Status pill + ETA, plus a calm "reconnecting" hint when the SSE drops.
class _StatusBar extends StatelessWidget {
  const _StatusBar({required this.status, required this.etaMin, required this.reconnecting});

  final String status;
  final int? etaMin;
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
                  color: color.withOpacity(0.12),
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
                      etaMin! <= 0 ? 'Yaqinda' : '~$etaMin daq',
                      style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ],
                ),
            ],
          ),
          if (reconnecting) ...[
            const SizedBox(height: 10),
            Row(
              children: const [
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
    required this.fallbackCenter,
    required this.driverName,
  });

  final MapController controller;
  final LatLng? driver;
  final LatLng? destination;
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
        if (driver != null && destination != null)
          PolylineLayer(
            polylines: [
              Polyline(
                points: [driver!, destination!],
                color: Brand.green.withOpacity(0.5),
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
