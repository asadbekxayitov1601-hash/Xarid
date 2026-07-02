import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  // The OS shows the notification; deep-link routing could go here.
}

class PushService {
  // Call once at startup (after Firebase.initializeApp).
  static Future<void> init() async {
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(_bgHandler);
      await FirebaseMessaging.instance.requestPermission();
      FirebaseMessaging.instance.onTokenRefresh.listen(_register);
      FirebaseMessaging.onMessage.listen((m) => debugPrint('push: ${m.notification?.title}'));
    } catch (e) {
      debugPrint('PushService.init skipped (Firebase not configured): $e');
    }
  }

  // Call after login (the backend needs a Bearer token to bind the device).
  static Future<void> registerToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _register(token);
    } catch (e) {
      debugPrint('PushService.registerToken skipped: $e');
    }
  }

  static Future<void> _register(String fcmToken) async {
    final prefs = await SharedPreferences.getInstance();
    final auth = prefs.getString('token');
    if (auth == null) return;
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID';
    try {
      await http.post(
        Uri.parse('${Config.apiBaseUrl}/api/me/device'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $auth'},
        body: jsonEncode({'token': fcmToken, 'platform': platform}),
      );
    } catch (e) {
      debugPrint('device register failed: $e');
    }
  }

  // Call on logout to remove the device registration from the backend.
  static Future<void> deleteToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        final prefs = await SharedPreferences.getInstance();
        final auth = prefs.getString('token');
        if (auth == null) return;
        await http.delete(
          Uri.parse('${Config.apiBaseUrl}/api/me/device'),
          headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $auth'},
          body: jsonEncode({'token': token}),
        );
      }
    } catch (e) {
      debugPrint('PushService.deleteToken failed: $e');
    }
  }
}
