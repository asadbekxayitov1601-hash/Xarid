import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../config.dart';

/// Thin, self-contained client for the courier endpoints. Reads the Bearer
/// token straight from shared_preferences ('token', the same key lib/api.dart
/// writes) so the courier screens never have to depend on the customer Api.
/// All calls are Bearer-authenticated and resolve to the signed-in user.
class CourierApi {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Map<String, String> _headers(String token, {bool json = false}) => {
        if (json) 'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      };

  static Future<Map<String, dynamic>> _get(String path) async {
    final token = await _token();
    if (token == null) throw const CourierApiException('unauthorized');
    final res = await http
        .get(Uri.parse('${Config.apiBaseUrl}$path'), headers: _headers(token))
        .timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw CourierApiException('http_${res.statusCode}');
    }
    return res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : <String, dynamic>{};
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final token = await _token();
    if (token == null) throw const CourierApiException('unauthorized');
    final res = await http
        .post(
          Uri.parse('${Config.apiBaseUrl}$path'),
          headers: _headers(token, json: true),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw CourierApiException('http_${res.statusCode}');
    }
    return res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : <String, dynamic>{};
  }

  /// GET /api/driver/orders -> the driver's assigned jobs.
  static Future<List<CourierOrder>> orders() async {
    final data = await _get('/api/driver/orders');
    final list = (data['orders'] as List?) ?? const [];
    return list.map((e) => CourierOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// POST /api/driver/orders/{id} { status } -> the updated order. Advances a job
  /// (DELIVERING when the courier starts, DELIVERED when dropped off).
  static Future<CourierOrder?> setStatus(String orderId, String status) async {
    final data = await _post('/api/driver/orders/$orderId', {'status': status});
    final order = data['order'];
    return order is Map<String, dynamic> ? CourierOrder.fromJson(order) : null;
  }

  /// GET /api/driver/me -> the signed-in user's role + driver application state.
  static Future<DriverMe> me() async {
    final data = await _get('/api/driver/me');
    return DriverMe.fromJson(data);
  }

  /// POST /api/driver/apply -> creates/updates a PENDING application.
  static Future<DriverProfile> apply({
    required String fullName,
    required String phone,
    required int experienceYears,
    required String carType,
    required String carNumber,
  }) async {
    final data = await _post('/api/driver/apply', {
      'fullName': fullName,
      'phone': phone,
      'experienceYears': experienceYears,
      'carType': carType,
      'carNumber': carNumber,
    });
    return DriverProfile.fromJson(data['driver'] as Map<String, dynamic>);
  }

  /// GET /api/driver/earnings -> balance + delivered-order history.
  static Future<EarningsSummary> earnings() async {
    final data = await _get('/api/driver/earnings');
    return EarningsSummary.fromJson(data);
  }

  /// PUT /api/driver/me { photoUrl } -> sets the driver's profile photo.
  static Future<DriverProfile> setPhoto(String dataUrl) async {
    final token = await _token();
    if (token == null) throw const CourierApiException('unauthorized');
    final res = await http
        .put(
          Uri.parse('${Config.apiBaseUrl}/api/driver/me'),
          headers: _headers(token, json: true),
          body: jsonEncode({'photoUrl': dataUrl}),
        )
        .timeout(const Duration(seconds: 30));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw CourierApiException('http_${res.statusCode}');
    }
    final data = res.body.isNotEmpty ? jsonDecode(res.body) as Map<String, dynamic> : <String, dynamic>{};
    return DriverProfile.fromJson(data['driver'] as Map<String, dynamic>);
  }
}

class CourierApiException implements Exception {
  final String code;
  const CourierApiException(this.code);
  @override
  String toString() => 'CourierApiException($code)';
}

/// The signed-in user's role plus their driver application (null if they have
/// never applied). Drives the courier app's gate (apply / pending / approved).
class DriverMe {
  final String role;
  final DriverProfile? driver;
  DriverMe({required this.role, this.driver});

  factory DriverMe.fromJson(Map<String, dynamic> j) => DriverMe(
        role: (j['role'] as String?) ?? 'OWNER',
        driver: j['driver'] is Map<String, dynamic>
            ? DriverProfile.fromJson(j['driver'] as Map<String, dynamic>)
            : null,
      );

  /// True once the courier can take jobs: an approved application or a
  /// server-provisioned DRIVER account (which may have no application row).
  bool get isApproved => driver?.status == 'APPROVED' || (driver == null && role == 'DRIVER');
  bool get isPending => driver?.status == 'PENDING';
  bool get isRejected => driver?.status == 'REJECTED';
}

class DriverProfile {
  final String status;
  final String name;
  final String phone;
  final int? experienceYears;
  final String? carType;
  final String? carNumber;
  final String? photoUrl;
  final double? ratingAvg;
  final int ratingCount;

  DriverProfile({
    required this.status,
    required this.name,
    required this.phone,
    this.experienceYears,
    this.carType,
    this.carNumber,
    this.photoUrl,
    this.ratingAvg,
    this.ratingCount = 0,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> j) => DriverProfile(
        status: (j['status'] as String?) ?? 'PENDING',
        name: (j['name'] as String?) ?? '',
        phone: (j['phone'] as String?) ?? '',
        experienceYears: (j['experienceYears'] as num?)?.toInt(),
        carType: j['carType'] as String?,
        carNumber: j['carNumber'] as String?,
        photoUrl: j['photoUrl'] as String?,
        ratingAvg: (j['ratingAvg'] as num?)?.toDouble(),
        ratingCount: (j['ratingCount'] as num?)?.toInt() ?? 0,
      );
}

class EarningsSummary {
  final int balance;
  final int deliveredCount;
  final List<EarningEntry> history;
  EarningsSummary({required this.balance, required this.deliveredCount, required this.history});

  factory EarningsSummary.fromJson(Map<String, dynamic> j) => EarningsSummary(
        balance: (j['balance'] as num?)?.toInt() ?? 0,
        deliveredCount: (j['deliveredCount'] as num?)?.toInt() ?? 0,
        history: ((j['history'] as List?) ?? const [])
            .map((e) => EarningEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class EarningEntry {
  final String id;
  final String address;
  final int payout;
  final DateTime? deliveredAt;
  EarningEntry({required this.id, required this.address, required this.payout, this.deliveredAt});

  factory EarningEntry.fromJson(Map<String, dynamic> j) => EarningEntry(
        id: (j['id'] as String?) ?? '',
        address: (j['address'] as String?) ?? '',
        payout: (j['payout'] as num?)?.toInt() ?? 0,
        deliveredAt: j['deliveredAt'] != null ? DateTime.tryParse(j['deliveredAt'].toString()) : null,
      );
}

/// One delivery as seen by the courier. Mirrors GET /api/driver/orders.
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
        itemCount: (j['itemCount'] as num?)?.toInt() ?? ((j['items'] as List?)?.length ?? 0),
        items: ((j['items'] as List?) ?? const [])
            .map((e) => CourierOrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  bool get isDelivering => status == 'DELIVERING';
  bool get isDone => status == 'DELIVERED' || status == 'CANCELLED';
  bool get hasPin => lat != null && lng != null && (lat != 0 || lng != 0);

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
      case 'PARTIAL':
        return 'Qisman';
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
