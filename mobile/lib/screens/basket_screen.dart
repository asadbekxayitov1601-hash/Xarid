import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../basket.dart';
import '../theme.dart';
import '../util.dart';

class BasketScreen extends StatelessWidget {
  const BasketScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final basket = context.watch<Basket>();
    return Scaffold(
      appBar: AppBar(title: const Text('Savat', style: TextStyle(fontWeight: FontWeight.w800))),
      body: basket.items.isEmpty
          ? const _EmptyBasket()
          : ListView.separated(
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
      bottomNavigationBar: basket.items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: () => _openCheckout(context),
                  child: Text('Buyurtma berish  ·  ${uzs(basket.total)}'),
                ),
              ),
            ),
    );
  }

  void _openCheckout(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Brand.cream,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const _CheckoutSheet(),
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
            const Text('Savat bo\'sh',
                textAlign: TextAlign.center,
                style: TextStyle(color: Brand.inkSoft, fontSize: 15)),
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
  const _CheckoutSheet();
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
      setState(() => _error = "Barcha maydonlarni to'ldiring.");
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
        const SnackBar(content: Text('Buyurtma qabul qilindi!'), backgroundColor: Brand.green),
      );
    } catch (_) {
      setState(() => _error = "Buyurtma berilmadi. Qayta urinib ko'ring.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Yetkazib berish',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Brand.ink)),
          const SizedBox(height: 16),
          TextField(controller: _name, decoration: const InputDecoration(hintText: 'Ismingiz')),
          const SizedBox(height: 10),
          TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: 'Telefon')),
          const SizedBox(height: 10),
          TextField(controller: _address, decoration: const InputDecoration(hintText: 'Manzil')),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Brand.onAccent))
                : const Text('Tasdiqlash (naqd to\'lov)'),
          ),
        ],
      ),
    );
  }
}
