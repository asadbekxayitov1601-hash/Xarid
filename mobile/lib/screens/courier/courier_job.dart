import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme.dart';
import '../../util.dart';
import '../../services/location_service.dart';
import 'driver_api.dart';

/// Kokand (Qoʻqon) centre — the map's fallback focus when an order has no pin.
const LatLng _kokandCenter = LatLng(40.5286, 70.9425);

/// One delivery in detail: the drop address + customer, a map pin (when the
/// order carries coordinates), and the two job actions. "Start delivery" flips
/// the order to DELIVERING and begins streaming the courier's GPS to the buyer;
/// "Delivered" flips it to DELIVERED and stops the stream.
class CourierJob extends StatefulWidget {
  final CourierOrder order;
  const CourierJob({super.key, required this.order});

  @override
  State<CourierJob> createState() => _CourierJobState();
}

class _CourierJobState extends State<CourierJob> {
  late CourierOrder _order;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
  }

  bool get _hasPin =>
      _order.lat != null && _order.lng != null && (_order.lat != 0 || _order.lng != 0);

  LatLng get _dropPoint =>
      _hasPin ? LatLng(_order.lat!, _order.lng!) : _kokandCenter;

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg), backgroundColor: Brand.ink));
  }

  Future<void> _startDelivery() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final ok = await LocationService.instance.start();
      if (!ok) {
        _toast('Joylashuvga ruxsat bering (Sozlamalar)');
        setState(() => _busy = false);
        return;
      }
      final updated = await CourierApi.setStatus(_order.id, 'DELIVERING');
      if (updated != null) {
        setState(() => _order = updated);
      } else {
        setState(() => _order = _order.copyWith(status: 'DELIVERING'));
      }
      _toast('Yetkazish boshlandi');
    } catch (_) {
      // Don't leave the GPS streaming if the status update failed.
      await LocationService.instance.stop();
      _toast('Xatolik — qayta urinib koʻring');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _markDelivered() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final updated = await CourierApi.setStatus(_order.id, 'DELIVERED');
      await LocationService.instance.stop();
      if (updated != null) {
        setState(() => _order = updated);
      } else {
        setState(() => _order = _order.copyWith(status: 'DELIVERED'));
      }
      _toast('Yetkazildi');
      if (mounted) Navigator.of(context).maybePop();
    } catch (_) {
      _toast('Xatolik — qayta urinib koʻring');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _callCustomer() async {
    final phone = _order.customerPhone.trim();
    if (phone.isEmpty) return;
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      _toast('Qoʻngʻiroq qilib boʻlmadi');
    }
  }

  Future<void> _openInMaps() async {
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${_dropPoint.latitude},${_dropPoint.longitude}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final delivering = _order.isDelivering;
    final delivered = _order.status == 'DELIVERED';
    final grandTotal = _order.total + _order.deliveryFee;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Yetkazma #${_order.id.length > 5 ? _order.id.substring(_order.id.length - 5) : _order.id}',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          _MapCard(point: _dropPoint, hasPin: _hasPin, onOpenMaps: _openInMaps),
          const SizedBox(height: 16),

          // Drop address
          _Section(
            icon: Icons.location_on_outlined,
            title: 'Manzil',
            child: Text(_order.address,
                style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600, height: 1.3)),
          ),

          // Customer + call
          if (_order.customerName.isNotEmpty || _order.customerPhone.isNotEmpty)
            _Section(
              icon: Icons.person_outline,
              title: 'Mijoz',
              trailing: _order.customerPhone.isNotEmpty
                  ? IconButton(
                      onPressed: _callCustomer,
                      icon: const Icon(Icons.call, color: Brand.green),
                      tooltip: 'Qoʻngʻiroq',
                    )
                  : null,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_order.customerName.isNotEmpty)
                    Text(_order.customerName,
                        style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
                  if (_order.customerPhone.isNotEmpty)
                    Text(_order.customerPhone, style: const TextStyle(color: Brand.inkSoft)),
                ],
              ),
            ),

          // Items
          if (_order.items.isNotEmpty)
            _Section(
              icon: Icons.shopping_basket_outlined,
              title: 'Mahsulotlar (${_order.itemCount})',
              child: Column(
                children: [
                  for (final it in _order.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(it.name, style: const TextStyle(color: Brand.ink)),
                          ),
                          Text(it.qtyLabel,
                              style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                ],
              ),
            ),

          // Money — cash on delivery
          _Section(
            icon: Icons.payments_outlined,
            title: 'Naqd toʻlov',
            child: Column(
              children: [
                _moneyRow('Mahsulotlar', uzs(_order.total)),
                _moneyRow('Yetkazib berish', uzs(_order.deliveryFee)),
                const Divider(height: 18, color: Brand.border),
                _moneyRow('Mijozdan olinadi', uzs(grandTotal), bold: true),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _ActionBar(
        delivering: delivering,
        delivered: delivered,
        busy: _busy,
        onStart: _startDelivery,
        onDelivered: _markDelivered,
      ),
    );
  }

  Widget _moneyRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: bold ? Brand.ink : Brand.inkSoft, fontWeight: bold ? FontWeight.w800 : FontWeight.w400)),
          const Spacer(),
          Text(value, style: TextStyle(color: Brand.ink, fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}

class _MapCard extends StatelessWidget {
  final LatLng point;
  final bool hasPin;
  final VoidCallback onOpenMaps;
  const _MapCard({required this.point, required this.hasPin, required this.onOpenMaps});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 200,
        child: Stack(
          children: [
            FlutterMap(
              options: MapOptions(
                initialCenter: point,
                initialZoom: hasPin ? 15 : 12,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'uz.xarid.app',
                ),
                if (hasPin)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: point,
                        width: 44,
                        height: 44,
                        child: const Icon(Icons.location_on, color: Brand.green, size: 44),
                      ),
                    ],
                  ),
              ],
            ),
            if (!hasPin)
              const Positioned(
                left: 12,
                bottom: 12,
                child: _Chip(text: 'Manzil xaritada belgilanmagan'),
              ),
            Positioned(
              right: 12,
              bottom: 12,
              child: FloatingActionButton.small(
                heroTag: 'open_maps',
                backgroundColor: Brand.cream,
                foregroundColor: Brand.green,
                onPressed: onOpenMaps,
                child: const Icon(Icons.navigation_outlined),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  const _Chip({required this.text});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Brand.cream.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Brand.border),
      ),
      child: Text(text, style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
    );
  }
}

class _Section extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget child;
  final Widget? trailing;
  const _Section({required this.icon, required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Brand.cream,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Brand.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: Brand.green),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w700, fontSize: 13)),
              if (trailing != null) ...[const Spacer(), trailing!],
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  final bool delivering;
  final bool delivered;
  final bool busy;
  final VoidCallback onStart;
  final VoidCallback onDelivered;
  const _ActionBar({
    required this.delivering,
    required this.delivered,
    required this.busy,
    required this.onStart,
    required this.onDelivered,
  });

  @override
  Widget build(BuildContext context) {
    if (delivered) {
      return SafeArea(
        minimum: const EdgeInsets.all(16),
        child: Container(
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0x1A0D9488),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Text('Yetkazildi',
              style: TextStyle(color: Color(0xFF0D9488), fontWeight: FontWeight.w800)),
        ),
      );
    }
    return SafeArea(
      minimum: const EdgeInsets.all(16),
      child: busy
          ? const FilledButton(
              onPressed: null,
              child: SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.onAccent),
              ),
            )
          : delivering
              ? FilledButton.icon(
                  onPressed: onDelivered,
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Yetkazildi'),
                )
              : FilledButton.icon(
                  onPressed: onStart,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Yetkazishni boshlash'),
                ),
    );
  }
}
