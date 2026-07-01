import 'package:flutter/material.dart';
import '../../theme.dart';
import 'driver_api.dart';

/// Courier onboarding form. Collects the application details the admin reviews
/// before approving: full name, phone, years of experience, vehicle type and
/// plate. On success it hands the new application back so the gate can switch to
/// the "under review" state.
class DriverApplyScreen extends StatefulWidget {
  final String? initialName;
  final String? initialPhone;
  final bool reapply;
  final ValueChanged<DriverProfile> onApplied;

  const DriverApplyScreen({
    super.key,
    this.initialName,
    this.initialPhone,
    this.reapply = false,
    required this.onApplied,
  });

  @override
  State<DriverApplyScreen> createState() => _DriverApplyScreenState();
}

class _DriverApplyScreenState extends State<DriverApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name =
      TextEditingController(text: widget.initialName ?? '');
  late final TextEditingController _phone =
      TextEditingController(text: widget.initialPhone ?? '');
  final _experience = TextEditingController();
  final _carNumber = TextEditingController();
  String _carType = _carTypes.first;
  bool _busy = false;

  static const _carTypes = ['Piyoda', 'Velosiped', 'Skuter', 'Yengil avtomobil', 'Damas', 'Yuk mashinasi'];

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _experience.dispose();
    _carNumber.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final profile = await CourierApi.apply(
        fullName: _name.text.trim(),
        phone: _phone.text.trim(),
        experienceYears: int.tryParse(_experience.text.trim()) ?? 0,
        carType: _carType,
        carNumber: _carNumber.text.trim(),
      );
      if (!mounted) return;
      widget.onApplied(profile);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Yuborilmadi — qayta urinib koʻring')));
        setState(() => _busy = false);
      }
    }
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Toʻldiring' : null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kuryer arizasi', style: TextStyle(fontWeight: FontWeight.w800)),
        automaticallyImplyLeading: widget.reapply,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            const Text(
              'Xarid kuryeri boʻlish uchun maʼlumotlaringizni kiriting. Administrator '
              'arizangizni koʻrib chiqadi.',
              style: TextStyle(color: Brand.inkSoft, height: 1.4),
            ),
            const SizedBox(height: 20),
            _label('Toʻliq ism'),
            TextFormField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              validator: _required,
              decoration: const InputDecoration(hintText: 'Ism Familiya'),
            ),
            const SizedBox(height: 16),
            _label('Telefon raqami'),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              validator: _required,
              decoration: const InputDecoration(hintText: '+998 90 123 45 67'),
            ),
            const SizedBox(height: 16),
            _label('Ish tajribasi (yil)'),
            TextFormField(
              controller: _experience,
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse((v ?? '').trim());
                if (n == null || n < 0 || n > 70) return 'Notoʻgʻri qiymat';
                return null;
              },
              decoration: const InputDecoration(hintText: '2'),
            ),
            const SizedBox(height: 16),
            _label('Transport turi'),
            DropdownButtonFormField<String>(
              initialValue: _carType,
              items: _carTypes
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _carType = v ?? _carTypes.first),
            ),
            const SizedBox(height: 16),
            _label('Davlat raqami'),
            TextFormField(
              controller: _carNumber,
              textCapitalization: TextCapitalization.characters,
              validator: _required,
              decoration: const InputDecoration(hintText: '01 A 123 BC'),
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.onAccent),
                    )
                  : const Text('Ariza yuborish'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6, left: 2),
        child: Text(text,
            style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600, fontSize: 13)),
      );
}
