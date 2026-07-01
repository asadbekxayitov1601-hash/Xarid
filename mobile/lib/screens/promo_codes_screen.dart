import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';

class PromoCode {
  final String code;
  final String discount;
  final String description;
  final String expiry;
  final bool isUsed;

  PromoCode({
    required this.code,
    required this.discount,
    required this.description,
    required this.expiry,
    this.isUsed = false,
  });
}

class PromoCodesScreen extends StatefulWidget {
  const PromoCodesScreen({super.key});

  @override
  State<PromoCodesScreen> createState() => _PromoCodesScreenState();
}

class _PromoCodesScreenState extends State<PromoCodesScreen> {
  final List<PromoCode> _promoCodes = [];

  final TextEditingController _codeController = TextEditingController();
  String? _errorMessage;
  bool _isActivating = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _activateCode() async {
    final codeText = _codeController.text.trim().toUpperCase();
    if (codeText.isEmpty) return;

    setState(() {
      _isActivating = true;
      _errorMessage = null;
    });

    // Mock network request delay
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    // Check if code is already in the list
    final alreadyExists = _promoCodes.any((element) => element.code == codeText);

    if (alreadyExists) {
      setState(() {
        _isActivating = false;
        _errorMessage = 'Ushbu promokod allaqachon faollashtirilgan.';
      });
      return;
    }

    // Check valid mock promo codes
    PromoCode? newCode;
    if (codeText == 'WELCOME') {
      newCode = PromoCode(
        code: 'WELCOME',
        discount: '10 000 UZS',
        description: 'Yangilangan profil uchun qo\'shimcha bonus',
        expiry: '31.12.2026',
      );
    } else if (codeText == 'OMAD') {
      newCode = PromoCode(
        code: 'OMAD',
        discount: 'Cheksiz baxt',
        description: 'Omadli xaridorlar uchun maxsus sovg\'a',
        expiry: '31.12.2026',
      );
    }

    setState(() {
      _isActivating = false;
    });

    if (newCode != null) {
      setState(() {
        _promoCodes.insert(0, newCode!);
        _codeController.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"$codeText" promokodi muvaffaqiyatli faollashtirildi!'),
          backgroundColor: Brand.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      setState(() {
        _errorMessage = 'Noto\'g\'ri yoki muddati o\'tgan promokod.';
      });
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('"$text" nusxalandi'),
        backgroundColor: Brand.ink,
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.cream,
      appBar: AppBar(
        title: const Text(
          'Promokodlar',
          style: TextStyle(fontWeight: FontWeight.w900, color: Brand.ink),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Promo input section
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _codeController,
                          textCapitalization: TextCapitalization.characters,
                          style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.ink),
                          decoration: InputDecoration(
                            hintText: 'Promokodni kiriting',
                            errorText: _errorMessage,
                            errorStyle: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w600),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        height: 54,
                        child: ElevatedButton(
                          onPressed: _isActivating ? null : _activateCode,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Brand.green,
                            foregroundColor: Brand.onAccent,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                          ),
                          child: _isActivating
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Brand.onAccent, strokeWidth: 2),
                                )
                              : const Text(
                                  'Qo\'shish',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                                ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(color: Brand.border, height: 1),

            // Active promo list
            Expanded(
              child: _promoCodes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.percent_rounded, size: 64, color: Brand.inkSoft.withValues(alpha: 0.3)),
                          const SizedBox(height: 12),
                          const Text(
                            'Promokodlar topilmadi',
                            style: TextStyle(
                              color: Brand.inkSoft,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _promoCodes.length,
                      itemBuilder: (context, index) {
                        final promo = _promoCodes[index];
                        return _buildPromoCard(promo);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPromoCard(PromoCode promo) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Brand.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Brand.border, width: 1.0),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Brand.green.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          promo.code,
                          style: const TextStyle(
                            color: Brand.green,
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        promo.discount,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: Brand.ink,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    promo.description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Brand.inkSoft,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Amal qilish muddati: ${promo.expiry}',
                    style: TextStyle(
                      fontSize: 11,
                      color: Brand.inkSoft.withValues(alpha: 0.7),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            IconButton(
              icon: const Icon(Icons.copy_rounded, color: Brand.green, size: 22),
              onPressed: () => _copyToClipboard(promo.code),
              tooltip: 'Nusxalash',
            ),
          ],
        ),
      ),
    );
  }
}
