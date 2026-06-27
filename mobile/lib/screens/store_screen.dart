import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../basket.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';
import 'basket_screen.dart';

class StoreScreen extends StatefulWidget {
  final String storeId;
  const StoreScreen({super.key, required this.storeId});
  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  late Future<({Store store, List<Product> products})> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<Api>().storeDetail(widget.storeId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Do\'kon')),
      body: FutureBuilder<({Store store, List<Product> products})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Brand.green));
          }
          if (snap.hasError || snap.data == null) {
            return const Center(child: Text('Ochib bo\'lmadi.', style: TextStyle(color: Brand.inkSoft)));
          }
          final store = snap.data!.store;
          final products = snap.data!.products;
          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _Header(store: store)),
              if (products.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: Text('Mahsulotlar yo\'q.', style: TextStyle(color: Brand.inkSoft))),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.all(12),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.62,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _ProductCard(product: products[i]),
                      childCount: products.length,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: const _BasketBottomBar(),
    );
  }
}

class _Header extends StatelessWidget {
  final Store store;
  const _Header({required this.store});

  @override
  Widget build(BuildContext context) {
    final eta = store.etaText();
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AppImage(url: store.image, width: 72, height: 72),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(store.name,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Brand.ink)),
                const SizedBox(height: 6),
                Row(children: [
                  if (store.discountPct != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Brand.amber, borderRadius: BorderRadius.circular(999)),
                      child: Text('-${store.discountPct}%',
                          style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (eta != null)
                    Row(children: [
                      const Icon(Icons.schedule, size: 14, color: Brand.inkSoft),
                      const SizedBox(width: 4),
                      Text(eta, style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                    ]),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    final basket = context.watch<Basket>();
    final qty = basket.qtyOf(product.offerId);
    return Container(
      decoration: BoxDecoration(
        color: Brand.cream,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Brand.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            children: [
              AspectRatio(aspectRatio: 4 / 3, child: AppImage(url: product.image)),
              if (product.hasDiscount)
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Brand.amber, borderRadius: BorderRadius.circular(999)),
                    child: Text('-${product.discountPct}%',
                        style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800, fontSize: 11)),
                  ),
                ),
              Positioned(right: 8, bottom: 8, child: _AddControl(product: product, qty: qty)),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(uzs(product.discountedPrice),
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: product.hasDiscount ? Brand.green : Brand.ink)),
                    if (product.hasDiscount) ...[
                      const SizedBox(width: 6),
                      Text(uzs(product.price),
                          style: const TextStyle(
                              fontSize: 12,
                              color: Brand.inkSoft,
                              decoration: TextDecoration.lineThrough)),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(product.nameUz,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, color: Brand.ink, height: 1.2)),
                const SizedBox(height: 4),
                Text(product.unitLabel, style: const TextStyle(fontSize: 12, color: Brand.inkSoft)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AddControl extends StatelessWidget {
  final Product product;
  final double qty;
  const _AddControl({required this.product, required this.qty});

  @override
  Widget build(BuildContext context) {
    final basket = context.read<Basket>();
    final start = product.minQty > 0 ? product.minQty : 1.0;
    if (qty <= 0) {
      return Material(
        color: Brand.cream,
        shape: const CircleBorder(side: BorderSide(color: Brand.border)),
        elevation: 2,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => basket.setQty(product, start),
          child: const SizedBox(width: 40, height: 40, child: Icon(Icons.add, color: Brand.green)),
        ),
      );
    }
    return Container(
      decoration: BoxDecoration(color: Brand.green, borderRadius: BorderRadius.circular(999)),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _round(Icons.remove, () => basket.setQty(product, qty - 1)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(qty % 1 == 0 ? qty.toInt().toString() : qty.toString(),
                style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800)),
          ),
          _round(Icons.add, () => basket.setQty(product, qty + 1)),
        ],
      ),
    );
  }

  Widget _round(IconData icon, VoidCallback onTap) => InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 28, height: 28, child: Icon(icon, size: 16, color: Brand.onAccent)),
      );
}

class _BasketBottomBar extends StatelessWidget {
  const _BasketBottomBar();

  @override
  Widget build(BuildContext context) {
    final basket = context.watch<Basket>();
    if (basket.items.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: Brand.cream,
        border: const Border(
          top: BorderSide(color: Brand.border, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Brand.ink.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Free delivery notification
              InkWell(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BasketScreen()),
                ),
                child: const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Icon(Icons.delivery_dining, color: Brand.green, size: 22),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Bepul yetkazib berish',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Brand.ink,
                          ),
                        ),
                      ),
                      Icon(Icons.chevron_right, color: Brand.inkSoft, size: 20),
                    ],
                  ),
                ),
              ),
              // Cart button
              Material(
                color: Brand.green,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const BasketScreen()),
                  ),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        // Quantity badge
                        Container(
                          width: 26,
                          height: 26,
                          decoration: const BoxDecoration(
                            color: Brand.onAccent,
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${basket.count}',
                            style: const TextStyle(
                              color: Brand.cream,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const Expanded(
                          child: Text(
                            'Savatga',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Brand.onAccent,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Text(
                          uzs(basket.total),
                          style: const TextStyle(
                            color: Brand.onAccent,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

