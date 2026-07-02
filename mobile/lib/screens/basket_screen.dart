import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../basket.dart';
import '../i18n.dart';
import '../theme.dart';
import '../util.dart';
import '../services/address_service.dart';

class BasketScreen extends StatefulWidget {
  const BasketScreen({super.key});

  @override
  State<BasketScreen> createState() => _BasketScreenState();
}

class _BasketScreenState extends State<BasketScreen> {
  bool _isFirstOrder = false;

  @override
  void initState() {
    super.initState();
    _loadOrderHistory();
  }

  Future<void> _loadOrderHistory() async {
    try {
      final orders = await context.read<Api>().orders();
      if (mounted) {
        setState(() {
          _isFirstOrder = orders.isEmpty;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final basket = context.watch<Basket>();
    final hasDiscount = _isFirstOrder && basket.total >= 80000;
    final displayTotal = hasDiscount ? basket.total - 20000 : basket.total;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('basket.title'), style: const TextStyle(fontWeight: FontWeight.w800))),
      body: basket.items.isEmpty
          ? const _EmptyBasket()
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: basket.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 24, color: Brand.border),
                    itemBuilder: (context, i) {
                      final item = basket.items[i];
                      final p = item.product;
                      return Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: AppImage(url: p.image, width: 56, height: 56),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p.nameUz,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w600, color: Brand.ink)),
                                const SizedBox(height: 2),
                                Text('${uzs(p.discountedPrice)} / ${p.unitLabel}',
                                    style: const TextStyle(color: Brand.inkSoft, fontSize: 12)),
                              ],
                            ),
                          ),
                          _Stepper(
                            qty: item.qty,
                            onMinus: () => basket.setQty(p, item.qty - 1),
                            onPlus: () => basket.setQty(p, item.qty + 1),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                if (hasDiscount)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Brand.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Brand.green.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.celebration_rounded, color: Brand.green, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            context.t('basket.first_reward'),
                            style: const TextStyle(
                              color: Brand.green,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
      bottomNavigationBar: basket.items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: () => _openCheckout(context, hasDiscount),
                  child: Text('${context.t('basket.order_cta')}  ·  ${uzs(displayTotal)}'),
                ),
              ),
            ),
    );
  }

  void _openCheckout(BuildContext context, bool hasDiscount) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Brand.cream,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CheckoutSheet(hasDiscount: hasDiscount),
    );
  }
}

// Branded empty state, consistent with the stores / orders screens.
class _EmptyBasket extends StatelessWidget {
  const _EmptyBasket();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(color: Brand.card, shape: BoxShape.circle),
              child: const Icon(Icons.shopping_basket_outlined, size: 40, color: Brand.inkSoft),
            ),
            const SizedBox(height: 16),
            Text(context.t('basket.empty'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Brand.inkSoft, fontSize: 15)),
          ],
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  final double qty;
  final VoidCallback onMinus;
  final VoidCallback onPlus;
  const _Stepper({required this.qty, required this.onMinus, required this.onPlus});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Brand.green, borderRadius: BorderRadius.circular(999)),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onMinus,
            icon: const Icon(Icons.remove, size: 16, color: Brand.onAccent)),
        Text(qty % 1 == 0 ? qty.toInt().toString() : qty.toString(),
            style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800)),
        IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onPlus,
            icon: const Icon(Icons.add, size: 16, color: Brand.onAccent)),
      ]),
    );
  }
}

class _CheckoutSheet extends StatefulWidget {
  final bool hasDiscount;
  const _CheckoutSheet({required this.hasDiscount});
  @override
  State<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<_CheckoutSheet> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  final _address = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final u = context.read<Api>().user;
    _name = TextEditingController(text: u?.name ?? '');
    _phone = TextEditingController(text: u?.phone ?? '+998 ');
    // Prefill the delivery address from the selected saved address.
    AddressService.selected().then((a) {
      if (a != null && mounted && _address.text.trim().isEmpty) {
        _address.text = a.full;
      }
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty || _phone.text.trim().isEmpty || _address.text.trim().isEmpty) {
      setState(() => _error = context.tr('basket.fill_all'));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final api = context.read<Api>();
    final basket = context.read<Basket>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await api.placeOrder(
        items: basket.toOrderItems(),
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        address: _address.text.trim(),
      );
      basket.clear();
      if (!mounted) return;
      navigator.pop();
      messenger.showSnackBar(
        SnackBar(content: Text(context.tr('basket.placed')), backgroundColor: Brand.green),
      );
    } catch (_) {
      setState(() => _error = context.tr('basket.failed'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final basket = context.watch<Basket>();
    final displayTotal = widget.hasDiscount ? basket.total - 20000 : basket.total;

    return Padding(
      padding: EdgeInsets.only(
          left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(context.t('basket.checkout_title'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Brand.ink)),
          const SizedBox(height: 16),
          TextField(controller: _name, decoration: InputDecoration(hintText: context.t('auth.name'))),
          const SizedBox(height: 10),
          TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(hintText: context.t('auth.phone'))),
          const SizedBox(height: 10),
          TextField(controller: _address, decoration: InputDecoration(hintText: context.t('basket.address_hint'))),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const Divider(height: 24, color: Brand.border),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('basket.products'), style: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
              Text(uzs(basket.total), style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w700)),
            ],
          ),
          if (widget.hasDiscount) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(context.t('basket.first_discount'), style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w700)),
                Text('-${uzs(20000)}', style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w900)),
              ],
            ),
          ],
          const Divider(height: 24, color: Brand.border),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(context.t('basket.total'), style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w800, fontSize: 16)),
              Text(
                uzs(displayTotal),
                style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w900, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Brand.onAccent))
                : Text(context.t('basket.confirm')),
          ),
        ],
      ),
    );
  }
}
