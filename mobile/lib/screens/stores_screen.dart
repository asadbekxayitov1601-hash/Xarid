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
              return const _StoresSkeleton();
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

// Centered, branded empty / error state. Wrapped in a scroll view so it stays
// pull-to-refresh friendly inside a RefreshIndicator.
class _Message extends StatelessWidget {
  final IconData icon;
  final String text;
  final Future<void> Function()? onRetry;
  const _Message({required this.icon, required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: const BoxDecoration(color: Brand.card, shape: BoxShape.circle),
                    child: Icon(icon, size: 40, color: Brand.inkSoft),
                  ),
                  const SizedBox(height: 16),
                  Text(text,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Brand.inkSoft, fontSize: 15)),
                  if (onRetry != null) ...[
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      onPressed: () => onRetry!(),
                      icon: const Icon(Icons.refresh, size: 18, color: Brand.green),
                      label: const Text('Qayta urinish',
                          style: TextStyle(color: Brand.green, fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Brand.green),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// A gentle pulsing grey box used to build loading skeletons. Pulses opacity with
// a looping TweenAnimationBuilder so no extra packages are needed.
class _Pulse extends StatefulWidget {
  final double? width;
  final double? height;
  final double radius;
  const _Pulse({this.width, this.height, this.radius = 8});

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> {
  bool _dim = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _dim = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _dim ? 0.45 : 1.0,
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeInOut,
      onEnd: () {
        if (mounted) setState(() => _dim = !_dim);
      },
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Brand.card,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

// Placeholder list shown while stores load — mirrors the _StoreCard layout.
class _StoresSkeleton extends StatelessWidget {
  const _StoresSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(
          color: Brand.cream,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Brand.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(aspectRatio: 16 / 9, child: _Pulse(radius: 0)),
            Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Pulse(width: 160, height: 16),
                  SizedBox(height: 10),
                  _Pulse(width: 110, height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
