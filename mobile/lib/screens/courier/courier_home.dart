import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../api.dart';
import '../../config.dart';
import '../../theme.dart';
import '../../util.dart';
import 'courier_job.dart';

/// One delivery as seen by the courier. Mirrors the JSON returned by
/// GET /api/driver/orders (see integrationNotes for the contract this expects).
class CourierOrder {
  final String id;
  final String status;
  final String address;
  final double? lat;
  final double? lng;
  final String customerName;
  final String customerPhone;
  final int total;
  final int deliveryFee;
  final int courierPayout;
  final int itemCount;
  final List<CourierOrderItem> items;

  CourierOrder({
    required this.id,
    required this.status,
    required this.address,
    this.lat,
    this.lng,
    required this.customerName,
    required this.customerPhone,
    required this.total,
    required this.deliveryFee,
    required this.courierPayout,
    required this.itemCount,
    this.items = const [],
  });

  factory CourierOrder.fromJson(Map<String, dynamic> j) => CourierOrder(
        id: j['id'] as String,
        status: (j['status'] as String?) ?? 'ASSIGNED',
        address: (j['address'] as String?) ?? '',
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
        customerName: (j['customerName'] as String?) ?? (j['buyerName'] as String?) ?? '',
        customerPhone: (j['customerPhone'] as String?) ?? (j['buyerPhone'] as String?) ?? '',
        total: (j['total'] as num?)?.toInt() ?? 0,
        deliveryFee: (j['deliveryFee'] as num?)?.toInt() ?? 0,
        courierPayout: (j['courierPayout'] as num?)?.toInt() ?? 0,
        itemCount: (j['itemCount'] as num?)?.toInt() ??
            ((j['items'] as List?)?.length ?? 0),
        items: ((j['items'] as List?) ?? const [])
            .map((e) => CourierOrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  /// Whether this job is mid-delivery (the courier already tapped "Start").
  bool get isDelivering => status == 'DELIVERING';

  /// Whether the job is finished and should fall off the active list.
  bool get isDone => status == 'DELIVERED' || status == 'CANCELLED';

  CourierOrder copyWith({String? status}) => CourierOrder(
        id: id,
        status: status ?? this.status,
        address: address,
        lat: lat,
        lng: lng,
        customerName: customerName,
        customerPhone: customerPhone,
        total: total,
        deliveryFee: deliveryFee,
        courierPayout: courierPayout,
        itemCount: itemCount,
        items: items,
      );

  String statusLabel() {
    switch (status) {
      case 'ASSIGNED':
        return 'Tayinlandi';
      case 'CONFIRMED':
        return 'Tasdiqlandi';
      case 'DELIVERING':
        return 'Yetkazilmoqda';
      case 'DELIVERED':
        return 'Yetkazildi';
      case 'CANCELLED':
        return 'Bekor qilindi';
      default:
        return status;
    }
  }
}

class CourierOrderItem {
  final String name;
  final double qty;
  final String unit;
  CourierOrderItem({required this.name, required this.qty, required this.unit});

  factory CourierOrderItem.fromJson(Map<String, dynamic> j) => CourierOrderItem(
        name: (j['name'] as String?) ?? (j['nameUz'] as String?) ?? '',
        qty: ((j['qty'] as num?) ?? 0).toDouble(),
        unit: (j['unit'] as String?) ?? '',
      );

  String get qtyLabel {
    final q = qty == qty.roundToDouble() ? qty.toStringAsFixed(0) : qty.toStringAsFixed(1);
    final u = unit.isEmpty ? '' : ' ${unit.toLowerCase()}';
    return '$q$u';
  }
}

/// Thin, self-contained client for the courier endpoints. Reads the Bearer
/// token straight from shared_preferences ('token') so wiring this screen up
/// never requires editing lib/api.dart. All calls are Bearer-authenticated and
/// resolve to the signed-in DRIVER on the server.
class CourierApi {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Map<String, String> _headers(String token, {bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  /// GET /api/driver/orders -> { orders: [...] } : the driver's assigned jobs.
  static Future<List<CourierOrder>> orders() async {
    final token = await _token();
    if (token == null) throw const CourierApiException('unauthorized');
    final res = await http.get(
      Uri.parse('${Config.apiBaseUrl}/api/driver/orders'),
      headers: _headers(token),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw CourierApiException('http_${res.statusCode}');
    }
    final data = res.body.isNotEmpty ? jsonDecode(res.body) : <String, dynamic>{};
    final list = (data['orders'] as List?) ?? const [];
    return list.map((e) => CourierOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// POST /api/driver/orders/{id} { status } -> { order: {...} } : advance a job
  /// (DELIVERING when the courier starts, DELIVERED when dropped off). Returns
  /// the updated order so the UI can reflect the server's canonical status.
  static Future<CourierOrder?> setStatus(String orderId, String status) async {
    final token = await _token();
    if (token == null) throw const CourierApiException('unauthorized');
    final res = await http.post(
      Uri.parse('${Config.apiBaseUrl}/api/driver/orders/$orderId'),
      headers: _headers(token, json: true),
      body: jsonEncode({'status': status}),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw CourierApiException('http_${res.statusCode}');
    }
    final data = res.body.isNotEmpty ? jsonDecode(res.body) : <String, dynamic>{};
    final order = data['order'];
    if (order is Map<String, dynamic>) return CourierOrder.fromJson(order);
    return null;
  }
}

class CourierApiException implements Exception {
  final String code;
  const CourierApiException(this.code);
  @override
  String toString() => 'CourierApiException($code)';
}

/// The courier's home: a pull-to-refresh list of assigned deliveries. Tapping a
/// job opens CourierJob. Shown instead of HomeShell when user.role == 'DRIVER'.
class CourierHome extends StatefulWidget {
  const CourierHome({super.key});
  @override
  State<CourierHome> createState() => _CourierHomeState();
}

class _CourierHomeState extends State<CourierHome> {
  late Future<List<CourierOrder>> _future;

  @override
  void initState() {
    super.initState();
    _future = CourierApi.orders();
  }

  Future<void> _reload() async {
    setState(() => _future = CourierApi.orders());
    await _future;
  }

  Future<void> _openJob(CourierOrder order) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => CourierJob(order: order)),
    );
    // Status may have changed (started/delivered) while inside the job.
    if (mounted) _reload();
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
    final api = context.read<Api>();
    final name = api.user?.name ?? 'Kuryer';
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Yetkazmalar', style: TextStyle(fontWeight: FontWeight.w800)),
            Text(name, style: const TextStyle(fontSize: 12, color: Brand.inkSoft, fontWeight: FontWeight.w500)),
          ],
        ),
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
        child: FutureBuilder<List<CourierOrder>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Brand.green));
            }
            if (snap.hasError) {
              return ListView(children: [
                const SizedBox(height: 120),
                const Icon(Icons.cloud_off, size: 56, color: Brand.inkSoft),
                const SizedBox(height: 12),
                const Center(child: Text('Yuklab boʻlmadi', style: TextStyle(color: Brand.inkSoft))),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(onPressed: _reload, child: const Text('Qayta urinish')),
                ),
              ]);
            }
            final orders = (snap.data ?? []).where((o) => !o.isDone).toList();
            if (orders.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 140),
                Icon(Icons.local_shipping_outlined, size: 56, color: Brand.inkSoft),
                SizedBox(height: 12),
                Center(child: Text('Yangi yetkazma yoʻq', style: TextStyle(color: Brand.inkSoft))),
                SizedBox(height: 6),
                Center(
                  child: Text('Pastga torting — yangilash uchun',
                      style: TextStyle(color: Brand.inkSoft, fontSize: 12)),
                ),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _JobCard(
                order: orders[i],
                statusColor: _statusColor(orders[i].status),
                onTap: () => _openJob(orders[i]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final CourierOrder order;
  final Color statusColor;
  final VoidCallback onTap;
  const _JobCard({required this.order, required this.statusColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Brand.cream,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Brand.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '#${order.id.length > 5 ? order.id.substring(order.id.length - 5) : order.id}',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(order.statusLabel(),
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.w700, fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on_outlined, size: 18, color: Brand.green),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(order.address,
                        style: const TextStyle(color: Brand.ink, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              if (order.customerName.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.person_outline, size: 18, color: Brand.inkSoft),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(order.customerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Text('${order.itemCount} mahsulot',
                      style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                  const Spacer(),
                  if (order.courierPayout > 0)
                    Text('+${uzs(order.courierPayout)}',
                        style: const TextStyle(color: Brand.green, fontWeight: FontWeight.w800, fontSize: 13)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
