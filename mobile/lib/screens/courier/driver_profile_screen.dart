import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../api.dart';
import '../../theme.dart';
import '../../util.dart';
import '../support_screen.dart';
import 'driver_api.dart';

/// The courier's profile tab: their balance (earned from delivered jobs), a
/// short profile summary, a delivery history list, an in-app support entry and
/// sign-out. Pulls the balance + history from GET /api/driver/earnings.
class DriverProfileScreen extends StatefulWidget {
  const DriverProfileScreen({super.key});
  @override
  State<DriverProfileScreen> createState() => _DriverProfileScreenState();
}

class _DriverProfileScreenState extends State<DriverProfileScreen> {
  late Future<EarningsSummary> _future;
  DriverProfile? _profile;
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _future = CourierApi.earnings();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final me = await CourierApi.me();
      if (mounted) setState(() => _profile = me.driver);
    } catch (_) {
      // Header falls back to the session name/initial.
    }
  }

  Future<void> _reload() async {
    setState(() => _future = CourierApi.earnings());
    _loadProfile();
    await _future;
  }

  // Detect the image type from magic bytes so the data URL mime is honest
  // (the server only accepts jpeg/png/webp).
  String _mimeOf(Uint8List b) {
    if (b.length >= 3 && b[0] == 0xFF && b[1] == 0xD8) return 'image/jpeg';
    if (b.length >= 4 && b[0] == 0x89 && b[1] == 0x50) return 'image/png';
    if (b.length >= 12 && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) {
      return 'image/webp';
    }
    return 'image/jpeg';
  }

  Future<void> _changePhoto() async {
    if (_uploadingPhoto) return;
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 70,
      );
      if (picked == null) return;
      final bytes = await picked.readAsBytes();
      final dataUrl = 'data:${_mimeOf(bytes)};base64,${base64Encode(bytes)}';
      if (mounted) setState(() => _uploadingPhoto = true);
      final updated = await CourierApi.setPhoto(dataUrl);
      if (mounted) setState(() => _profile = updated);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Rasm yuklanmadi — qayta urinib koʻring')));
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<Api>();
    final name = api.user?.name ?? 'Kuryer';
    final phone = api.user?.phone ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Chiqish',
            icon: const Icon(Icons.logout, color: Brand.inkSoft),
            onPressed: () => api.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        color: Brand.green,
        child: FutureBuilder<EarningsSummary>(
          future: _future,
          builder: (context, snap) {
            final data = snap.data;
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                _Header(
                  name: name,
                  phone: phone,
                  photoUrl: _profile?.photoUrl,
                  ratingAvg: _profile?.ratingAvg,
                  ratingCount: _profile?.ratingCount ?? 0,
                  uploading: _uploadingPhoto,
                  onChangePhoto: _changePhoto,
                ),
                const SizedBox(height: 16),
                _BalanceCard(
                  balance: data?.balance ?? 0,
                  deliveredCount: data?.deliveredCount ?? 0,
                  loading: snap.connectionState == ConnectionState.waiting,
                  error: snap.hasError,
                ),
                const SizedBox(height: 20),
                _MenuTile(
                  icon: Icons.support_agent_outlined,
                  label: 'Yordam',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SupportScreen()),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Yetkazmalar tarixi',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Brand.ink)),
                const SizedBox(height: 8),
                if (snap.connectionState == ConnectionState.waiting)
                  const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: Center(child: CircularProgressIndicator(color: Brand.green)),
                  )
                else if (snap.hasError)
                  _InlineError(onRetry: _reload)
                else if ((data?.history ?? const []).isEmpty)
                  const _EmptyHistory()
                else
                  ...data!.history.map((e) => _HistoryTile(entry: e)),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String name;
  final String phone;
  final String? photoUrl;
  final double? ratingAvg;
  final int ratingCount;
  final bool uploading;
  final VoidCallback onChangePhoto;
  const _Header({
    required this.name,
    required this.phone,
    required this.photoUrl,
    required this.ratingAvg,
    required this.ratingCount,
    required this.uploading,
    required this.onChangePhoto,
  });

  @override
  Widget build(BuildContext context) {
    final hasPhoto = photoUrl != null && photoUrl!.isNotEmpty;
    final rated = ratingAvg != null && ratingCount > 0;
    return Row(
      children: [
        GestureDetector(
          onTap: uploading ? null : onChangePhoto,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              ClipOval(
                child: hasPhoto
                    ? AppImage(url: photoUrl, width: 64, height: 64)
                    : Container(
                        width: 64,
                        height: 64,
                        color: Brand.green.withValues(alpha: 0.12),
                        alignment: Alignment.center,
                        child: Text(
                          name.isNotEmpty ? name.characters.first.toUpperCase() : 'K',
                          style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w900, fontSize: 26),
                        ),
                      ),
              ),
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Brand.green,
                    shape: BoxShape.circle,
                    border: Border.all(color: Brand.cream, width: 2),
                  ),
                  child: uploading
                      ? const Padding(
                          padding: EdgeInsets.all(4),
                          child: CircularProgressIndicator(strokeWidth: 2, color: Brand.onAccent),
                        )
                      : const Icon(Icons.camera_alt, color: Brand.onAccent, size: 12),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Brand.ink)),
              if (phone.isNotEmpty)
                Text(phone, style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                  const SizedBox(width: 3),
                  Text(
                    rated ? '${ratingAvg!.toStringAsFixed(1)} · $ratingCount baho' : 'Hali baho yoʻq',
                    style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final int balance;
  final int deliveredCount;
  final bool loading;
  final bool error;
  const _BalanceCard({
    required this.balance,
    required this.deliveredCount,
    required this.loading,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Brand.green, Brand.greenBright],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Balans',
              style: TextStyle(color: Brand.onAccent.withValues(alpha: 0.8), fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          if (loading)
            const SizedBox(
              height: 34,
              child: Align(
                alignment: Alignment.centerLeft,
                child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.onAccent)),
              ),
            )
          else
            Text(
              error ? '—' : uzs(balance),
              style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w900, fontSize: 30),
            ),
          const SizedBox(height: 14),
          Container(height: 1, color: Brand.onAccent.withValues(alpha: 0.15)),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined, size: 18, color: Brand.onAccent),
              const SizedBox(width: 8),
              Text(
                '$deliveredCount ta yetkazilgan buyurtma',
                style: TextStyle(color: Brand.onAccent.withValues(alpha: 0.9), fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Brand.card,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(icon, color: Brand.green),
              const SizedBox(width: 14),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink, fontSize: 15)),
              const Spacer(),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Brand.inkSoft),
            ],
          ),
        ),
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final EarningEntry entry;
  const _HistoryTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Brand.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Brand.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.address.isEmpty ? 'Manzil koʻrsatilmagan' : entry.address,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Brand.ink),
                ),
                if (entry.deliveredAt != null) ...[
                  const SizedBox(height: 2),
                  Text(_fmtDate(entry.deliveredAt!),
                      style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (entry.payout > 0)
            Text('+${uzs(entry.payout)}',
                style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  static String _fmtDate(DateTime d) {
    final local = d.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(local.day)}.${two(local.month)}.${local.year} ${two(local.hour)}:${two(local.minute)}';
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      alignment: Alignment.center,
      child: const Column(
        children: [
          Icon(Icons.inbox_outlined, size: 48, color: Brand.inkSoft),
          SizedBox(height: 10),
          Text('Hali yetkazmalar yoʻq', style: TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  final VoidCallback onRetry;
  const _InlineError({required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(Icons.cloud_off, size: 44, color: Brand.inkSoft),
          const SizedBox(height: 8),
          const Text('Yuklab boʻlmadi', style: TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
          TextButton(onPressed: onRetry, child: const Text('Qayta urinish')),
        ],
      ),
    );
  }
}
