# Push notifications (FCM) — enable guide

The **backend already sends pushes** — when an order goes out for delivery /
is delivered / cancelled the buyer gets one, and when a courier is assigned they
get a "new job" push (`lib/notifications.ts`). They no-op until you set
`FCM_SERVER_KEY` on the backend. This guide turns on the **receiving** side in the
Flutter app.

> Firebase is intentionally **not** wired into the default app, because the
> Android build fails without `google-services.json`. Follow this once you have a
> Firebase project, so the base app keeps building in the meantime.

## 1. Firebase project (one-time)
1. https://console.firebase.google.com → create a project.
2. Add an **Android app** (package `uz.xarid.app`) → download `google-services.json`
   → put it in `android/app/`.
3. Add an **iOS app** (bundle id `uz.xarid.app`) → download `GoogleService-Info.plist`
   → add it to `ios/Runner/` (via Xcode). For iOS push you also need an **APNs key**
   uploaded in Firebase → Project settings → Cloud Messaging, and the
   **Push Notifications** + **Background Modes → Remote notifications** capabilities
   in Xcode.

## 2. Backend key
Firebase → Project settings → **Cloud Messaging** → Server key. Set it on the
backend (Railway/Vercel env): `FCM_SERVER_KEY=...`. (`lib/push.ts` uses the legacy
HTTP API; migrate to HTTP v1 before high volume.)

## 3. Flutter — add the dependencies
`pubspec.yaml` → dependencies:
```yaml
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3
```
Then `flutter pub get`. (Android: the FlutterFire/google-services Gradle plugin is
added automatically by recent templates; if not, follow
https://firebase.flutter.dev/docs/messaging/overview.)

## 4. Flutter — add `lib/services/push_service.dart`
```dart
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
}
```

## 5. Flutter — wire it in
`lib/main.dart` — make `main` async and init before `runApp`:
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushService.init();         // import 'services/push_service.dart'
  runApp(const XaridApp());
}
```
`lib/api.dart` — register the token after a successful login and on launch when
already logged in. In `authenticate(...)` after `notifyListeners();`, and in
`load()` after `_user = await me();`, add:
```dart
  PushService.registerToken(); // fire-and-forget; import services/push_service.dart
```
On `logout()`, optionally `DELETE /api/me/device` with the current token.

## 6. Test
Send a test from Firebase → Cloud Messaging, or place an order and advance its
status from the admin panel — the buyer device should receive the push.
