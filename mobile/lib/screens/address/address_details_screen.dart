import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../theme.dart';
import '../../services/address_service.dart';

/// Address details (Uzum/Yandex style): confirm the map-resolved street, name
/// the address (Uy/Ish/Boshqa), and add the door details a courier needs
/// (entrance, floor, apartment, note). Saving with no apartment prompts a
/// "continue without apartment?" confirmation. Pops the saved [SavedAddress].
class AddressDetailsScreen extends StatefulWidget {
  final SavedAddress draft;
  const AddressDetailsScreen({super.key, required this.draft});

  @override
  State<AddressDetailsScreen> createState() => _AddressDetailsScreenState();
}

IconData _iconForLabel(String label) {
  final l = label.toLowerCase();
  if (l.contains('ish')) return Icons.work_rounded;
  if (l.contains('boshqa')) return Icons.location_on_rounded;
  return Icons.home_rounded;
}

class _AddressDetailsScreenState extends State<AddressDetailsScreen> {
  late final TextEditingController _name =
      TextEditingController(text: widget.draft.label.isEmpty ? 'Uy' : widget.draft.label);
  late final TextEditingController _entrance = TextEditingController(text: widget.draft.entrance);
  late final TextEditingController _floor = TextEditingController(text: widget.draft.floor);
  late final TextEditingController _apartment = TextEditingController(text: widget.draft.apartment);
  late final TextEditingController _notes = TextEditingController(text: widget.draft.notes);
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _entrance.dispose();
    _floor.dispose();
    _apartment.dispose();
    _notes.dispose();
    super.dispose();
  }

  LatLng? get _point =>
      widget.draft.lat != null && widget.draft.lng != null ? LatLng(widget.draft.lat!, widget.draft.lng!) : null;

  Future<void> _pickType() async {
    final chosen = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Brand.cream,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _TypeSheet(current: _name.text),
    );
    if (chosen != null) setState(() => _name.text = chosen);
  }

  Future<void> _save() async {
    if (_apartment.text.trim().isEmpty) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (_) => const _NoApartmentDialog(),
      );
      if (proceed != true) return;
    }
    await _persist();
  }

  Future<void> _persist() async {
    if (_saving) return;
    setState(() => _saving = true);
    final addr = widget.draft.copyWith(
      label: _name.text.trim().isEmpty ? 'Uy' : _name.text.trim(),
      entrance: _entrance.text.trim(),
      floor: _floor.text.trim(),
      apartment: _apartment.text.trim(),
      notes: _notes.text.trim(),
    );
    await AddressService.upsert(addr, select: true);
    if (!mounted) return;
    Navigator.of(context).pop(addr);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manzil tafsilotlari', style: TextStyle(fontWeight: FontWeight.w800)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const Text('Manzil', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Brand.ink)),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: const BoxDecoration(color: Brand.card, shape: BoxShape.circle),
                child: const Icon(Icons.location_on_rounded, color: Brand.ink, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.draft.primaryLine,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink)),
                    if (widget.draft.city.isNotEmpty)
                      Text(widget.draft.city, style: const TextStyle(color: Brand.inkSoft)),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 28, color: Brand.border),

          // Label type + name.
          Row(
            children: [
              InkWell(
                onTap: _pickType,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  height: 58,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: Brand.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Brand.border),
                  ),
                  child: Row(
                    children: [
                      Icon(_iconForLabel(_name.text), color: Brand.green, size: 22),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down_rounded, color: Brand.inkSoft, size: 20),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _field(controller: _name, label: 'Manzil nomi'),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Entrance / floor / apartment.
          Row(
            children: [
              Expanded(child: _field(controller: _entrance, label: 'Kirish', keyboard: TextInputType.text)),
              const SizedBox(width: 10),
              Expanded(child: _field(controller: _floor, label: 'Qavat', keyboard: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: _field(controller: _apartment, label: 'Xonadon', keyboard: TextInputType.number)),
            ],
          ),
          const SizedBox(height: 12),

          _field(controller: _notes, label: 'Belgilangan joy va manzil tafsilotlari', maxLines: 2),
          const SizedBox(height: 6),
          const Text('Bu kuryerga sizni tezroq topishga yordam beradi',
              style: TextStyle(color: Brand.inkSoft, fontSize: 12)),

          if (_point != null) ...[
            const SizedBox(height: 20),
            const Text('Kirish qayerda?',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Brand.ink)),
            const SizedBox(height: 10),
            _miniMap(_point!),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(16),
        child: FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  height: 22, width: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.onAccent))
              : const Text('Manzilni saqlash'),
        ),
      ),
    );
  }

  Widget _miniMap(LatLng point) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 150,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: point,
            initialZoom: 16,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'uz.xarid.app',
            ),
            MarkerLayer(markers: [
              Marker(
                point: point,
                width: 40, height: 40,
                child: const Icon(Icons.location_on, color: Brand.green, size: 40),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    TextInputType? keyboard,
    int maxLines = 1,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboard,
      maxLines: maxLines,
      style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600),
        floatingLabelBehavior: FloatingLabelBehavior.auto,
        filled: true,
        fillColor: Brand.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
      ),
    );
  }
}

class _TypeSheet extends StatelessWidget {
  final String current;
  const _TypeSheet({required this.current});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Brand.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Manzil turi',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Brand.ink)),
            const SizedBox(height: 8),
            _row(context, 'Boshqa', Icons.location_on_rounded),
            _row(context, 'Uy', Icons.home_rounded),
            _row(context, 'Ish', Icons.work_rounded),
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, String label, IconData icon) {
    final selected = current.toLowerCase() == label.toLowerCase();
    return InkWell(
      onTap: () => Navigator.of(context).pop(label),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Brand.border, width: 0.5))),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: selected ? Brand.green.withValues(alpha: 0.15) : Brand.card,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: selected ? Brand.green : Brand.ink, size: 22),
            ),
            const SizedBox(width: 14),
            Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Brand.ink)),
            const Spacer(),
            if (selected) const Icon(Icons.check_rounded, color: Brand.green),
          ],
        ),
      ),
    );
  }
}

class _NoApartmentDialog extends StatelessWidget {
  const _NoApartmentDialog();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Brand.cream,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Kvartirasiz davom etilsinmi?',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Brand.ink)),
            const SizedBox(height: 12),
            const Text(
              'Kuryer manzilingiz tafsilotlarini bilsa, sizni tezroq topoladi.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Brand.inkSoft, height: 1.4),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text("Ma'lumot qo'shish"),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Kvartirasiz davom etish',
                  style: TextStyle(color: Brand.green, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
