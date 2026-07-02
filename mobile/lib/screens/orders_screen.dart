import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';
import '../widgets/skeleton.dart';
import 'track_screen.dart';

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
      appBar: AppBar(title: Text(context.t('orders.title'), style: const TextStyle(fontWeight: FontWeight.w800))),
      body: RefreshIndicator(
        onRefresh: _reload,
        color: Brand.green,
        child: FutureBuilder<List<OrderSummary>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const _OrdersSkeleton();
            }
            if (snap.hasError) {
              return EmptyMessage(
                  icon: Icons.cloud_off,
                  text: context.t('common.load_failed'),
                  onRetry: _reload,
                  scrollable: true);
            }
            final orders = snap.data ?? [];
            if (orders.isEmpty) {
              return EmptyMessage(
                  icon: Icons.receipt_long,
                  text: context.t('orders.empty'),
                  scrollable: true);
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
                                color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                            child: Text(context.t('status.${o.status}'),
                                style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('${context.t('orders.items', {'n': '${o.itemCount}'})}  ·  ${uzs(o.total + o.deliveryFee)}',
                          style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(o.address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                      if (o.status != 'DELIVERED' && o.status != 'CANCELLED') ...[
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => TrackScreen(orderId: o.id)),
                            ),
                            icon: const Icon(Icons.location_on_outlined, size: 18, color: Brand.green),
                            label: Text(context.t('orders.track'), style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w700)),
                            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 32)),
                          ),
                        ),
                      ],
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

// Placeholder list shown while orders load — mirrors an order card.
class _OrdersSkeleton extends StatelessWidget {
  const _OrdersSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 6,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Brand.cream,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Brand.border),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Pulse(width: 60, height: 14),
                Spacer(),
                Pulse(width: 90, height: 22, radius: 999),
              ],
            ),
            SizedBox(height: 12),
            Pulse(width: 180, height: 14),
            SizedBox(height: 8),
            Pulse(width: 130, height: 12),
          ],
        ),
      ),
    );
  }
}
