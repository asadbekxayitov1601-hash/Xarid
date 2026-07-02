import 'package:flutter/material.dart';
import '../theme.dart';

class EditNameScreen extends StatefulWidget {
  final String initialName;
  final String phone;
  final Future<void> Function(String) onSave;

  const EditNameScreen({
    super.key,
    required this.initialName,
    required this.phone,
    required this.onSave,
  });

  @override
  State<EditNameScreen> createState() => _EditNameScreenState();
}

class _EditNameScreenState extends State<EditNameScreen> {
  late TextEditingController _nameController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _submit() async {
    setState(() => _isSaving = true);
    try {
      await widget.onSave(_nameController.text.trim());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Ismni saqlab bo'lmadi. Qayta urinib ko'ring."),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.cream,
      appBar: AppBar(
        title: const Text(
          "Shaxsiy ma'lumot",
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),
                    // Name input
                    const Text(
                      "Ism",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Brand.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _nameController,
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Brand.card,
                        hintText: "Kuryer sizga qanday murojaat qilishi mumkin?",
                        hintStyle: TextStyle(
                          color: Brand.inkSoft.withValues(alpha: 0.6),
                          fontWeight: FontWeight.normal,
                          fontSize: 14,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Phone label (non-editable, styled like Uzum)
                    const Text(
                      "Raqam",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Brand.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      decoration: BoxDecoration(
                        color: Brand.card.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Brand.border, width: 0.5),
                      ),
                      child: Text(
                        widget.phone,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Brand.ink.withValues(alpha: 0.6),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    RichText(
                      text: const TextSpan(
                        style: TextStyle(color: Brand.inkSoft, fontSize: 13, height: 1.4),
                        children: [
                          TextSpan(text: "Telefon raqamini almashtirish uchun "),
                          TextSpan(
                            text: "Xarid yordam xizmati bilan bog'laning.",
                            style: TextStyle(
                              color: Brand.green,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Save Button at bottom
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: FilledButton(
                onPressed: _isSaving ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: Brand.green,
                  foregroundColor: Brand.onAccent,
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Brand.onAccent, strokeWidth: 2.5),
                      )
                    : const Text(
                        "Saqlash",
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
