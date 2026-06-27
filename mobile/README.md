# Xarid — customer app (Flutter)

The shopper app (Android/iOS) for Xarid. It talks to the existing Next.js backend
over REST + Bearer token (see `/api/auth/token`, `/api/stores`, `/api/orders`, …).
This is the Phase 2 scaffold: auth → stores → store detail → basket → checkout →
orders. Live map tracking + the courier app come next.

## Prerequisites
- Flutter SDK 3.19+ (Dart 3.3+) — https://docs.flutter.dev/get-started/install
- Android Studio (Android) and/or Xcode (iOS)

## Run it
This folder contains `pubspec.yaml` + `lib/` only. Generate the native platform
folders, then run:

```bash
cd mobile
flutter create .          # generates android/, ios/, etc. around the existing lib/
flutter pub get
flutter run --dart-define=API_BASE_URL=https://YOUR-BACKEND-URL
```

`API_BASE_URL` defaults to the value in `lib/config.dart` — point it at your
deployed backend (the web app serves the mobile API too). For the Android
emulator hitting a local backend, use `http://10.0.2.2:3000`.

## Structure
```
lib/
  config.dart      API base URL
  theme.dart       cream + green brand theme
  util.dart        money formatting + image (handles base64 data URLs)
  models.dart      User, Store, Product, OrderSummary
  api.dart         HTTP client + auth/token (ChangeNotifier)
  basket.dart      local basket (ChangeNotifier)
  main.dart        app + auth gate + bottom-nav shell
  screens/         auth, stores, store, basket, orders
```

## Phase 3 — live tracking + courier (included)
This app now also contains the **courier experience** and **live tracking**, in one
codebase routed by role at login:
- A `DRIVER` account lands on the courier home (`screens/courier/`): job list →
  job detail → "Start delivery" streams GPS to `POST /api/driver/location` →
  "Delivered". Couriers are given a phone+password in the admin panel
  (Haydovchilar → "Kuryer ilovasi paroli").
- A customer taps **Kuzatish** on an active order → `TrackScreen` shows the
  courier moving on an OpenStreetMap map, fed by `GET /api/orders/{id}/stream` (SSE).

### Native permissions (add after `flutter create .`)
`geolocator` + `url_launcher` need platform permissions:

**Android** — `android/app/src/main/AndroidManifest.xml`, inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```
(geolocator needs `minSdkVersion 21+` in `android/app/build.gradle`.)

**iOS** — `ios/Runner/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Xarid kuryer ilovasi yetkazib berishni kuzatish uchun joylashuvdan foydalanadi.</string>
<key>LSApplicationQueriesSchemes</key>
<array><string>tel</string><string>https</string></array>
```

## Next
- Push: register the FCM token via `POST /api/me/device` (needs Firebase setup).
- Publishing: app icons, splash, privacy policy, store listings.
- Optionally split customer vs courier into two store listings via build flavors.

> Note: scaffold authored without a local Flutter toolchain — run `flutter analyze`
> after `flutter create .`; minor tweaks (e.g. grid aspect ratios, package API drift)
> may be needed. The backend endpoints are compile-verified.
