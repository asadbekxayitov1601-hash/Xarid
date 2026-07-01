import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api.dart';
import '../config.dart';
import '../theme.dart';
import 'edit_name_screen.dart';
import 'orders_screen.dart';
import 'promo_codes_screen.dart';
import 'support_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  @override
  Widget build(BuildContext context) {
    final api = context.watch<Api>();
    final user = api.user;

    if (user == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Brand.green),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Brand.cream,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          children: [
            const SizedBox(height: 16),
            
            // Header: Clickable Name & Phone (Uzum layout)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => EditNameScreen(
                      initialName: user.name ?? '',
                      phone: user.phone ?? '',
                      onSave: (newName) async {
                        await context.read<Api>().updateName(newName);
                      },
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name ?? 'Foydalanuvchi',
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: Brand.ink,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            user.phone ?? '',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Brand.inkSoft.withValues(alpha: 0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: Brand.inkSoft,
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Profile menu list: Buyurtmalar tarixi, Topshiriqlar, Promokodlar, etc.
            _menuItem(
              icon: Icons.receipt_long_outlined,
              label: 'Buyurtmalar tarixi',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const OrdersScreen()),
                );
              },
            ),

            _menuItem(
              icon: Icons.percent_outlined,
              label: 'Promokodlar',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const PromoCodesScreen()),
                );
              },
            ),
            _menuItem(
              icon: Icons.chat_bubble_outline_rounded,
              label: 'Yordam',
              onTap: () => _showHelpBottomSheet(context),
            ),
            _menuItem(
              icon: Icons.language_outlined,
              label: 'Til',
              trailing: const Text(
                "O'zbek",
                style: TextStyle(
                  color: Brand.inkSoft,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              onTap: () => _showLanguageBottomSheet(context),
            ),
            _menuItem(
              icon: Icons.lock_outline_rounded,
              label: 'Maxfiylik siyosati',
              onTap: () async {
                final uri = Uri.parse('${Config.apiBaseUrl}/privacy');
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
            _menuItem(
              icon: Icons.description_outlined,
              label: 'Foydalanuvchi shartnomasi',
              onTap: () async {
                final uri = Uri.parse('${Config.apiBaseUrl}/terms');
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
            _menuItem(
              icon: Icons.delivery_dining_outlined,
              label: 'Kuryer bo\'lish',
              onTap: () => _showCourierBottomSheet(context),
            ),
            _menuItem(
              icon: Icons.logout_rounded,
              label: 'Chiqish',
              textColor: Colors.redAccent,
              iconColor: Colors.redAccent,
              onTap: () => api.logout(),
            ),
            
            const SizedBox(height: 32),
            
            // App Version metadata
            Center(
              child: Text(
                "Ilova",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Brand.inkSoft.withValues(alpha: 0.5),
                ),
              ),
            ),
            const SizedBox(height: 2),
            Center(
              child: Text(
                "Versiya 1.131.0(379)",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Brand.inkSoft.withValues(alpha: 0.5),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showHelpBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Brand.cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Yordam xizmati',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Brand.ink,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sizga qanday yordam bera olamiz? Quyidagi usullardan biri orqali biz bilan bog\'laning.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Brand.inkSoft,
                  ),
                ),
                const SizedBox(height: 20),
                _contactOption(
                  icon: Icons.forum_outlined,
                  title: 'Ilova orqali yozish',
                  subtitle: 'Operator bilan jonli chat',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SupportScreen()),
                    );
                  },
                ),
                const SizedBox(height: 12),
                _contactOption(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Telegram orqali bog\'lanish',
                  subtitle: 'Tezkor va oson yordam',
                  onTap: () async {
                    Navigator.pop(context);
                    final uri = Uri.parse('https://t.me/xarid_support_bot');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                ),
                const SizedBox(height: 12),
                _contactOption(
                  icon: Icons.phone_outlined,
                  title: 'Qo\'ng\'iroq qilish',
                  subtitle: '+998 71 200 88 44',
                  onTap: () async {
                    Navigator.pop(context);
                    final uri = Uri(scheme: 'tel', path: '+998712008844');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri);
                    }
                  },
                ),
                const SizedBox(height: 12),
                _contactOption(
                  icon: Icons.mail_outline_rounded,
                  title: 'E-pochta orqali yozish',
                  subtitle: 'support@xarid.uz',
                  onTap: () async {
                    Navigator.pop(context);
                    final uri = Uri(
                      scheme: 'mailto',
                      path: 'support@xarid.uz',
                      queryParameters: {'subject': 'Xarid Ilovasi Yordam'},
                    );
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri);
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _contactOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Brand.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Brand.border, width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Brand.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Brand.green, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Brand.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Brand.inkSoft,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Brand.inkSoft),
          ],
        ),
      ),
    );
  }

  void _showLanguageBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Brand.cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Muloqot tili',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Brand.ink,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Ilova tilini tanlang:',
                  style: TextStyle(
                    fontSize: 14,
                    color: Brand.inkSoft,
                  ),
                ),
                const SizedBox(height: 20),
                _languageOption(
                  title: "O'zbekcha",
                  isSelected: true,
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
                const SizedBox(height: 10),
                _languageOption(
                  title: "Русский",
                  isSelected: false,
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Rus tili tez kunda qo'shiladi!"),
                        backgroundColor: Brand.inkSoft,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),
                _languageOption(
                  title: "English",
                  isSelected: false,
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("English language will be added soon!"),
                        backgroundColor: Brand.inkSoft,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _languageOption({
    required String title,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? Brand.green.withValues(alpha: 0.08) : Brand.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? Brand.green.withValues(alpha: 0.3) : Brand.border,
            width: isSelected ? 1.5 : 0.5,
          ),
        ),
        child: Row(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Brand.green : Brand.ink,
              ),
            ),
            const Spacer(),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: Brand.green, size: 20)
            else
              const Icon(Icons.circle_outlined, color: Brand.inkSoft, size: 20),
          ],
        ),
      ),
    );
  }

  void _showCourierBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Brand.cream,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.55,
          minChildSize: 0.4,
          maxChildSize: 0.7,
          expand: false,
          builder: (context, scrollController) {
            return SafeArea(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Brand.border,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Xarid kuryeri bo\'ling',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Brand.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Bizning faol va do\'stona kuryerlar jamoamizga qo\'shiling va mustaqil daromad olishni boshlang.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Brand.inkSoft,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _benefitRow(
                      icon: Icons.schedule_outlined,
                      title: 'Moslashuvchan grafik',
                      description: 'O\'zingiz xohlagan paytda va soatda ishlang.',
                    ),
                    const SizedBox(height: 16),
                    _benefitRow(
                      icon: Icons.payments_outlined,
                      title: 'Kunlik va haftalik to\'lovlar',
                      description: 'Har bir yetkazilgan buyurtma uchun kafolatlangan to\'lov.',
                    ),
                    const SizedBox(height: 16),
                    _benefitRow(
                      icon: Icons.support_agent_outlined,
                      title: '24/7 operator ko\'magi',
                      description: 'Yo\'lda har qanday vaziyatda sizga yordam beramiz.',
                    ),
                    const SizedBox(height: 28),
                    FilledButton(
                      onPressed: () async {
                        Navigator.pop(context);
                        final uri = Uri.parse('https://t.me/xarid_support_bot?start=courier');
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: Brand.green,
                        foregroundColor: Brand.onAccent,
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.telegram_rounded, size: 24),
                          SizedBox(width: 10),
                          Text(
                            'Telegram bot orqali ariza berish',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _benefitRow({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Brand.green.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Brand.green, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Brand.ink,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 13,
                  color: Brand.inkSoft,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _menuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Widget? trailing,
    Color? textColor,
    Color? iconColor,
  }) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Brand.border, width: 0.5),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
        leading: Icon(icon, color: iconColor ?? Brand.inkSoft, size: 24),
        title: Text(
          label,
          style: TextStyle(
            color: textColor ?? Brand.ink,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        trailing: trailing ??
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: Brand.inkSoft,
              size: 16,
            ),
        onTap: onTap,
      ),
    );
  }
}
