import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';
import 'store_screen.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  late Future<List<Store>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<Api>().stores();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<Api>().stores());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Do'konlar", style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Chiqish',
            onPressed: () => context.read<Api>().logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reload,
        color: Brand.green,
        child: FutureBuilder<List<Store>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Brand.green));
            }
            if (snap.hasError) {
              return _Message(icon: Icons.cloud_off, text: 'Hozircha ulanib bo\'lmadi.', onRetry: _reload);
            }
            final stores = snap.data ?? [];
            if (stores.isEmpty) {
              return const _Message(icon: Icons.storefront, text: 'Hozircha do\'kon yo\'q.');
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: stores.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _StoreCard(store: stores[i]),
            );
          },
        ),
      ),
    );
  }
}

class _StoreCard extends StatelessWidget {
  final Store store;
  const _StoreCard({required this.store});

  @override
  Widget build(BuildContext context) {
    final eta = store.etaText();
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => StoreScreen(storeId: store.id)),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Brand.cream,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Brand.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AspectRatio(aspectRatio: 16 / 9, child: AppImage(url: store.image)),
                if (store.discountPct != null)
                  Positioned(
                    left: 10,
                    top: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: Brand.amber, borderRadius: BorderRadius.circular(999)),
                      child: Text('-${store.discountPct}%',
                          style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(store.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink)),
                  const SizedBox(height: 6),
                  Row(children: [
                    if (eta != null) ...[
                      const Icon(Icons.schedule, size: 14, color: Brand.inkSoft),
                      const SizedBox(width: 4),
                      Text(eta, style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                      const SizedBox(width: 12),
                    ],
                    Text('${store.productCount} mahsulot',
                        style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  final IconData icon;
  final String text;
  final Future<void> Function()? onRetry;
  const _Message({required this.icon, required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 56, color: Brand.inkSoft),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Brand.inkSoft)),
        if (onRetry != null) ...[
          const SizedBox(height: 16),
          Center(
            child: OutlinedButton(onPressed: () => onRetry!(), child: const Text('Qayta urinish')),
          ),
        ],
      ],
    );
  }
}
