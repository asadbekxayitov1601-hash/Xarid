import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../theme.dart';
import '../../util.dart';
import '../../services/location_service.dart';
import 'driver_api.dart';
import 'courier_job.dart';

/// Kokand (Qoʻqon) centre — the map's fallback focus before we get a GPS fix.
const LatLng _kokandCenter = LatLng(40.5286, 70.9425);

/// The courier's home: a full-screen live map (Yandex-driver style). The driver
/// taps "Go online" to start streaming GPS and become dispatchable; assigned
/// jobs appear both as map pins and in a draggable bottom sheet. Tapping a job
/// opens the delivery detail (start / delivered / call / navigate).
class DriverMapScreen extends StatefulWidget {
  const DriverMapScreen({super.key});
  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> with WidgetsBindingObserver {
  final _map = MapController();
  LatLng? _me;
  bool _online = false;
  bool _toggling = false;
  List<CourierOrder> _jobs = [];
  bool _loadingJobs = true;
  bool _jobsFailed = false;
  Timer? _refresh;
  StreamSubscription<Position>? _posSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _online = LocationService.instance.isStreaming;
    _locate();
    _loadJobs();
    // Keep the active job board fresh while the courier watches the map.
    _refresh = Timer.periodic(const Duration(seconds: 20), (_) => _loadJobs(silent: true));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refresh?.cancel();
    _posSub?.cancel();
    _map.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    try {
      if (!await LocationService.instance.ensurePermission()) return;
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() => _me = LatLng(pos.latitude, pos.longitude));
      _map.move(_me!, 14);
      // Follow the device so the blue dot tracks the courier on the map.
      _posSub ??= Geolocator.getPositionStream(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 15),
      ).listen((p) {
        if (mounted) setState(() => _me = LatLng(p.latitude, p.longitude));
      }, onError: (_) {});
    } catch (_) {
      // No fix yet — the map stays on Kokand until one arrives.
    }
  }

  Future<void> _loadJobs({bool silent = false}) async {
    if (!silent) setState(() => _loadingJobs = true);
    try {
      final all = await CourierApi.orders();
      if (!mounted) return;
      setState(() {
        _jobs = all.where((o) => !o.isDone).toList();
        _loadingJobs = false;
        _jobsFailed = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingJobs = false;
        if (!silent) _jobsFailed = true;
      });
    }
  }

  Future<void> _toggleOnline() async {
    if (_toggling) return;
    setState(() => _toggling = true);
    try {
      if (_online) {
        await LocationService.instance.stop();
        if (mounted) setState(() => _online = false);
      } else {
        final ok = await LocationService.instance.start();
        if (!ok) {
          if (mounted) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(const SnackBar(content: Text('Joylashuvga ruxsat bering (Sozlamalar)')));
          }
        } else {
          if (mounted) setState(() => _online = true);
          _locate();
        }
      }
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  Future<void> _openJob(CourierOrder order) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => CourierJob(order: order)));
    if (mounted) _loadJobs();
  }

  void _recenter() {
    if (_me != null) _map.move(_me!, 15);
  }

  @override
  Widget build(BuildContext context) {
    final center = _me ?? _kokandCenter;
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 13,
              minZoom: 4,
              maxZoom: 18,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'uz.xarid.courier',
              ),
              MarkerLayer(markers: _jobMarkers()),
              if (_me != null)
                MarkerLayer(markers: [
                  Marker(
                    point: _me!,
                    width: 26,
                    height: 26,
                    child: const _MeDot(),
                  ),
                ]),
            ],
          ),

          // Online/offline status pill (top).
          SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: _StatusPill(online: _online),
            ),
          ),

          // Recenter button.
          SafeArea(
            child: Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 12, bottom: 220),
                child: FloatingActionButton.small(
                  heroTag: 'recenter',
                  backgroundColor: Brand.cream,
                  foregroundColor: Brand.green,
                  onPressed: _recenter,
                  child: const Icon(Icons.my_location),
                ),
              ),
            ),
          ),

          // Jobs bottom sheet + the go online/offline action.
          _JobsSheet(
            jobs: _jobs,
            loading: _loadingJobs,
            failed: _jobsFailed,
            online: _online,
            toggling: _toggling,
            onToggle: _toggleOnline,
            onTapJob: _openJob,
            onRetry: _loadJobs,
          ),
        ],
      ),
    );
  }

  List<Marker> _jobMarkers() {
    return _jobs.where((o) => o.hasPin).map((o) {
      return Marker(
        point: LatLng(o.lat!, o.lng!),
        width: 120,
        height: 56,
        child: GestureDetector(
          onTap: () => _openJob(o),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (o.courierPayout > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Brand.green,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text('+${uzs(o.courierPayout)}',
                      style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800, fontSize: 11)),
                ),
              const Icon(Icons.location_on, color: Brand.green, size: 34),
            ],
          ),
        ),
      );
    }).toList();
  }
}

class _MeDot extends StatelessWidget {
  const _MeDot();
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF2563EB),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [BoxShadow(color: Color(0x402563EB), blurRadius: 8, spreadRadius: 2)],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final bool online;
  const _StatusPill({required this.online});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Brand.cream,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Brand.border),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: online ? Brand.green : Brand.inkSoft,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            online ? 'Liniyadasiz' : 'Liniyadan tashqarida',
            style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _JobsSheet extends StatelessWidget {
  final List<CourierOrder> jobs;
  final bool loading;
  final bool failed;
  final bool online;
  final bool toggling;
  final VoidCallback onToggle;
  final ValueChanged<CourierOrder> onTapJob;
  final VoidCallback onRetry;

  const _JobsSheet({
    required this.jobs,
    required this.loading,
    required this.failed,
    required this.online,
    required this.toggling,
    required this.onToggle,
    required this.onTapJob,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.28,
      minChildSize: 0.16,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Brand.cream,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, -4))],
          ),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: Brand.border, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  children: [
                    Text(
                      jobs.isEmpty ? 'Yetkazmalar' : '${jobs.length} ta yetkazma',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Brand.ink),
                    ),
                    const Spacer(),
                    _ToggleButton(online: online, busy: toggling, onTap: onToggle),
                  ],
                ),
              ),
              Expanded(child: _list(scrollController)),
            ],
          ),
        );
      },
    );
  }

  Widget _list(ScrollController controller) {
    if (loading && jobs.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: Brand.green));
    }
    if (failed && jobs.isEmpty) {
      return _emptyState(
        controller,
        icon: Icons.cloud_off,
        text: 'Yuklab boʻlmadi',
        action: TextButton(onPressed: onRetry, child: const Text('Qayta urinish')),
      );
    }
    if (jobs.isEmpty) {
      return _emptyState(
        controller,
        icon: Icons.local_shipping_outlined,
        text: online ? 'Yangi yetkazma kutilmoqda' : 'Liniyaga chiqing',
        subtitle: online
            ? 'Buyurtma tayinlanganda shu yerda paydo boʻladi'
            : 'Buyurtma olish uchun “Liniyaga chiqish” tugmasini bosing',
      );
    }
    return ListView.separated(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: jobs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _JobTile(order: jobs[i], onTap: () => onTapJob(jobs[i])),
    );
  }

  Widget _emptyState(
    ScrollController controller, {
    required IconData icon,
    required String text,
    String? subtitle,
    Widget? action,
  }) {
    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      children: [
        Icon(icon, size: 52, color: Brand.inkSoft),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink)),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: Brand.inkSoft)),
        ],
        if (action != null) Center(child: action),
      ],
    );
  }
}

class _ToggleButton extends StatelessWidget {
  final bool online;
  final bool busy;
  final VoidCallback onTap;
  const _ToggleButton({required this.online, required this.busy, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onTap,
      style: FilledButton.styleFrom(
        backgroundColor: online ? Brand.card : Brand.green,
        foregroundColor: online ? Brand.ink : Brand.onAccent,
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        side: online ? const BorderSide(color: Brand.border) : null,
      ),
      child: busy
          ? const SizedBox(
              width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4, color: Brand.green))
          : Text(online ? 'Liniyadan chiqish' : 'Liniyaga chiqish',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
    );
  }
}

class _JobTile extends StatelessWidget {
  final CourierOrder order;
  final VoidCallback onTap;
  const _JobTile({required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Brand.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.location_on_outlined, size: 18, color: Brand.green),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(order.address,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Brand.green.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(order.statusLabel(),
                        style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w700, fontSize: 12)),
                  ),
                  const SizedBox(width: 8),
                  Text('${order.itemCount} mahsulot', style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                  const Spacer(),
                  if (order.courierPayout > 0)
                    Text('+${uzs(order.courierPayout)}',
                        style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w800)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
