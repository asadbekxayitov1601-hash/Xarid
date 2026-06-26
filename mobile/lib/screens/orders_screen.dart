import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<OrderSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<Api>().orders();
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<Api>().orders());
    await _future;
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'DELIVERED':
        return const Color(0xFF0D9488);
      case 'DELIVERING':
        return const Color(0xFF7C3AED);
      case 'CANCELLED':
        return Brand.inkSoft;
      default:
        return Brand.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buyurtmalar', style: TextStyle(fontWeight: FontWeight.w800))),
      body: RefreshIndicator(
        onRefresh: _reload,
        color: Brand.green,
        child: FutureBuilder<List<OrderSummary>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Brand.green));
            }
            final orders = snap.data ?? [];
            if (orders.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 140),
                Icon(Icons.receipt_long, size: 56, color: Brand.inkSoft),
                SizedBox(height: 12),
                Center(child: Text('Buyurtmalar yo\'q', style: TextStyle(color: Brand.inkSoft))),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final o = orders[i];
                final color = _statusColor(o.status);
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Brand.cream,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Brand.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text('#${o.id.length > 5 ? o.id.substring(o.id.length - 5) : o.id}',
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink)),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                                color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
                            child: Text(o.statusLabel,
                                style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('${o.itemCount} mahsulot  ·  ${uzs(o.total + o.deliveryFee)}',
                          style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(o.address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
