import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../theme.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _signup = false;
  bool _busy = false;
  String? _error;
  final _phone = TextEditingController(text: '+998 ');
  final _password = TextEditingController();
  final _name = TextEditingController();

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<Api>().authenticate(
            mode: _signup ? 'signup' : 'signin',
            phone: _phone.text.trim(),
            password: _password.text,
            name: _signup ? _name.text.trim() : null,
          );
      // The auth gate in main.dart rebuilds to HomeShell on success.
    } on ApiException catch (e) {
      setState(() => _error = _msg(e.code));
    } catch (_) {
      setState(() => _error = "Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _msg(String code) {
    switch (code) {
      case 'taken':
        return "Bu raqam allaqachon ro'yxatdan o'tgan.";
      case 'phone':
        return 'Telefon raqamni tekshiring (+998 ...).';
      case 'password':
        return "Parol kamida 6 belgidan iborat bo'lsin.";
      default:
        return "Telefon yoki parol noto'g'ri.";
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Image.asset(
                      'assets/logo.png',
                      width: 100,
                      height: 100,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Xarid',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Brand.ink)),
                  const SizedBox(height: 4),
                  const Text("Qo'qonda tez yetkazib berish",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Brand.inkSoft)),
                  const SizedBox(height: 28),
                  _SegToggle(
                      signup: _signup,
                      onChanged: (v) => setState(() {
                            _signup = v;
                            _error = null;
                          })),
                  const SizedBox(height: 16),
                  if (_signup) ...[
                    TextField(controller: _name, decoration: const InputDecoration(hintText: 'Ismingiz')),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(hintText: '+998 90 123 45 67')),
                  const SizedBox(height: 12),
                  TextField(
                      controller: _password,
                      obscureText: true,
                      decoration: const InputDecoration(hintText: 'Parol')),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Brand.onAccent))
                        : Text(_signup ? "Ro'yxatdan o'tish" : 'Kirish'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SegToggle extends StatelessWidget {
  final bool signup;
  final ValueChanged<bool> onChanged;
  const _SegToggle({required this.signup, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
          color: Brand.card,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: Brand.border)),
      child: Row(children: [
        _seg('Kirish', !signup, () => onChanged(false)),
        _seg("Ro'yxat", signup, () => onChanged(true)),
      ]),
    );
  }

  Widget _seg(String label, bool active, VoidCallback onTap) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
                color: active ? Brand.green : Colors.transparent,
                borderRadius: BorderRadius.circular(999)),
            child: Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontWeight: FontWeight.w700, color: active ? Brand.onAccent : Brand.inkSoft)),
          ),
        ),
      );
}
