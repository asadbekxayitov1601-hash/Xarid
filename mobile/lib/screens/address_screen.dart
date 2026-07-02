import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../theme.dart';
import '../services/address_service.dart';
import '../services/location_service.dart';

/// First-run (and edit) delivery-address capture. On open it tries to detect the
/// user's location over GPS, then asks them to write the address manually
/// (street + apartment/house). GPS is best-effort — a denial never blocks manual
/// entry; the fix's coordinates, when granted, are saved alongside the text so
/// checkout and dispatch can use a real pin.
class AddressScreen extends StatefulWidget {
  final SavedAddress? initial;
  const AddressScreen({super.key, this.initial});

  @override
  State<AddressScreen> createState() => _AddressScreenState();
}

enum _GpsState { idle, locating, located, denied }

class _AddressScreenState extends State<AddressScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _street =
      TextEditingController(text: widget.initial?.street ?? '');
  late final TextEditingController _house =
      TextEditingController(text: widget.initial?.house ?? '');
  late String _label = widget.initial?.label ?? 'Uy';
  double? _lat;
  double? _lng;
  _GpsState _gps = _GpsState.idle;
  bool _saving = false;

  static const _labels = ['Uy', 'Ish', 'Boshqa'];

  @override
  void initState() {
    super.initState();
    _lat = widget.initial?.lat;
    _lng = widget.initial?.lng;
    // Get location first (per the onboarding flow), then the user types the rest.
    WidgetsBinding.instance.addPostFrameCallback((_) => _detectLocation());
  }

  @override
  void dispose() {
    _street.dispose();
    _house.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() => _gps = _GpsState.locating);
    try {
      if (!await LocationService.instance.ensurePermission()) {
        if (mounted) setState(() => _gps = _GpsState.denied);
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        _gps = _GpsState.located;
      });
    } catch (_) {
      if (mounted) setState(() => _gps = _GpsState.denied);
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final address = SavedAddress(
      label: _label,
      street: _street.text.trim(),
      house: _house.text.trim(),
      lat: _lat,
      lng: _lng,
    );
    await AddressService.save(address);
    if (!mounted) return;
    Navigator.of(context).pop(address);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yetkazish manzili', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            _GpsBanner(state: _gps, onRetry: _detectLocation),
            const SizedBox(height: 20),
            const Text('Manzil turi',
                style: TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _labels.map((l) {
                final selected = _label == l;
                return ChoiceChip(
                  label: Text(l),
                  selected: selected,
                  onSelected: (_) => setState(() => _label = l),
                  showCheckmark: false,
                  selectedColor: Brand.green,
                  backgroundColor: Brand.card,
                  side: BorderSide(color: selected ? Brand.green : Brand.border),
                  labelStyle: TextStyle(
                    color: selected ? Brand.onAccent : Brand.ink,
                    fontWeight: FontWeight.w700,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            _label2('Koʻcha nomi'),
            TextFormField(
              controller: _street,
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().length < 2) ? 'Koʻcha nomini kiriting' : null,
              decoration: const InputDecoration(hintText: "Masalan: Imom Buxoriy koʻchasi"),
            ),
            const SizedBox(height: 16),
            _label2('Uy / xonadon raqami'),
            TextFormField(
              controller: _house,
              decoration: const InputDecoration(hintText: 'Masalan: 25, 12-xonadon'),
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 22, width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.onAccent))
                  : const Text('Saqlash'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label2(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6, left: 2),
        child: Text(text,
            style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
      );
}

class _GpsBanner extends StatelessWidget {
  final _GpsState state;
  final VoidCallback onRetry;
  const _GpsBanner({required this.state, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    late final IconData icon;
    late final Color color;
    late final String title;
    late final String subtitle;
    Widget? trailing;

    switch (state) {
      case _GpsState.locating:
        icon = Icons.my_location;
        color = Brand.green;
        title = 'Joylashuv aniqlanmoqda...';
        subtitle = 'GPS orqali hududingizni topyapmiz';
        trailing = const SizedBox(
            width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Brand.green));
        break;
      case _GpsState.located:
        icon = Icons.check_circle;
        color = Brand.green;
        title = 'Joylashuv aniqlandi';
        subtitle = 'Endi koʻcha va uy raqamini yozing';
        break;
      case _GpsState.denied:
        icon = Icons.location_off;
        color = Brand.amber;
        title = 'Joylashuv aniqlanmadi';
        subtitle = 'Manzilni qoʻlda kiritishingiz mumkin';
        trailing = TextButton(onPressed: onRetry, child: const Text('Qayta'));
        break;
      case _GpsState.idle:
        icon = Icons.my_location;
        color = Brand.inkSoft;
        title = 'Joylashuv';
        subtitle = '';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.ink)),
                if (subtitle.isNotEmpty)
                  Text(subtitle, style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }
}
