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

## Next
- Live order tracking: consume `GET /api/orders/{id}/stream` (SSE) + a map.
- Push: register the FCM token via `POST /api/me/device` (needs the FCM setup).
- Courier app: separate Flutter app that streams GPS to `POST /api/driver/location`.

> Note: scaffold authored without a local Flutter toolchain — run `flutter analyze`
> after `flutter create .`; minor layout tweaks (e.g. grid aspect ratios) may be needed.
