import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  final int status;
  final String code;
  ApiException(this.status, this.code);
  @override
  String toString() => 'ApiException($status, $code)';
}

// Talks to the Xarid backend and holds the auth token + current user. The token
// is sent as `Authorization: Bearer <token>` (see lib/session.ts on the server)
// and persisted in shared_preferences so the session survives app restarts.
class Api extends ChangeNotifier {
  String? _token;
  AppUser? _user;
  bool _ready = false;

  AppUser? get user => _user;
  bool get ready => _ready;
  bool get isLoggedIn => _token != null;

  // Loads any stored token and re-validates it on launch.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    if (_token != null) {
      try {
        _user = await me();
      } catch (_) {
        _token = null;
        await prefs.remove('token');
      }
    }
    _ready = true;
    notifyListeners();
  }

  Uri _u(String path) => Uri.parse('${Config.apiBaseUrl}$path');

  Map<String, String> _headers({bool json = false}) {
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (_token != null) h['Authorization'] = 'Bearer $_token';
    return h;
  }

  Future<dynamic> _get(String path) async {
    final res = await http.get(_u(path), headers: _headers());
    return _decode(res);
  }

  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(_u(path), headers: _headers(json: true), body: jsonEncode(body));
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final dynamic data = res.body.isNotEmpty ? jsonDecode(res.body) : null;
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    final code = (data is Map && data['error'] != null) ? data['error'].toString() : 'error';
    throw ApiException(res.statusCode, code);
  }

  Future<void> authenticate({
    required String mode,
    required String phone,
    required String password,
    String? name,
  }) async {
    final data = await _post('/api/auth/token', {
      'mode': mode,
      'phone': phone,
      'password': password,
      if (name != null) 'name': name,
    });
    _token = data['token'] as String;
    _user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', _token!);
    notifyListeners();
  }

  Future<AppUser> me() async {
    final data = await _get('/api/me');
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<List<Store>> stores() async {
    final data = await _get('/api/stores');
    return (data['stores'] as List).map((e) => Store.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<({Store store, List<Product> products})> storeDetail(String id) async {
    final data = await _get('/api/stores/$id');
    final store = Store.fromJson(data['store'] as Map<String, dynamic>);
    final products =
        (data['products'] as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
    return (store: store, products: products);
  }

  Future<List<OrderSummary>> orders() async {
    final data = await _get('/api/orders');
    return (data['orders'] as List).map((e) => OrderSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<String> placeOrder({
    required List<Map<String, dynamic>> items,
    required String name,
    required String phone,
    required String address,
  }) async {
    final data = await _post('/api/orders', {
      'items': items,
      'buyerName': name,
      'buyerPhone': phone,
      'address': address,
    });
    return data['orderId'] as String;
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    notifyListeners();
  }
}
