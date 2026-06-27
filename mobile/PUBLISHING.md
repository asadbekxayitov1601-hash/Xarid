# Publishing Xarid to Google Play + App Store

End-to-end checklist to ship the Flutter app. Do the one-time setup, then repeat
the "build & submit" steps for each release. Listing copy is in `STORE_LISTING.md`.

> **One app or two?** The codebase is one app, routed by role at login (customers
> get the shop, `DRIVER` accounts get the courier UI). Simplest launch: **publish
> one app**; couriers just sign in with a driver account. If you later want two
> separate store listings (Xarid + Xarid Kuryer), split with Flutter **build
> flavors** — not needed for v1.

---

## 0. Accounts & fees (one-time)
- [ ] **Google Play Console** — $25 one-time. https://play.google.com/console
- [ ] **Apple Developer Program** — $99/year. https://developer.apple.com/programs
- [ ] A real **support email** and the **privacy policy URL** live (`/privacy` on the web app).

## 1. App identity (one-time)
- **Application ID / Bundle ID:** `uz.xarid.app` (pick once — it's permanent).
- Set it when generating platforms:
  ```bash
  cd mobile
  flutter create --org uz.xarid --project-name xarid .
  flutter pub get
  ```
- **Icons & splash** (config already in `pubspec.yaml`):
  ```bash
  dart run flutter_launcher_icons
  dart run flutter_native_splash:create
  ```
- **Permissions** (add after `flutter create` — see `README.md`): Android location
  in `AndroidManifest.xml`; iOS `NSLocationWhenInUseUsageDescription` + the
  `LSApplicationQueriesSchemes` (`tel`, `https`) in `Info.plist`.
- **Backend URL:** build with `--dart-define=API_BASE_URL=https://YOUR-PROD-BACKEND`.

## 2. Versioning
Bump `version: 1.0.0+1` in `pubspec.yaml` each release (`name+buildNumber`). The
build number must increase every upload to both stores.

---

## 3. Android — build & submit
**Signing (one-time):**
```bash
keytool -genkey -v -keystore xarid-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias xarid
```
- Keep `xarid-release.jks` **secret** (never commit). Create `android/key.properties`:
  ```
  storePassword=...
  keyPassword=...
  keyAlias=xarid
  storeFile=../../xarid-release.jks
  ```
- Wire it into `android/app/build.gradle` `signingConfigs.release` (standard Flutter
  release-signing snippet — https://docs.flutter.dev/deployment/android#signing-the-app).
- Set `minSdkVersion 21` (geolocator) and a real `applicationId uz.xarid.app`.

**Build:**
```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://YOUR-PROD-BACKEND
# -> build/app/outputs/bundle/release/app-release.aab
```
**Play Console:** create the app → upload the `.aab` to internal testing first →
fill the listing (STORE_LISTING.md) → **Data safety** form (section 6) → content
rating questionnaire → countries (Uzbekistan) → roll out.

## 4. iOS — build & submit
- Open `ios/Runner.xcworkspace` in **Xcode** → Signing & Capabilities → select your
  team, set the bundle id `uz.xarid.app`, enable **Automatically manage signing**.
- In `Info.plist` add `ITSAppUsesNonExemptEncryption` = `NO` (you only use HTTPS).
- Build the archive:
  ```bash
  flutter build ipa --release --dart-define=API_BASE_URL=https://YOUR-PROD-BACKEND
  ```
  then open `build/ios/archive/Runner.xcarchive` in Xcode Organizer → Distribute →
  App Store Connect. (Or `xcrun altool`/Transporter for the `.ipa`.)
- **App Store Connect:** create the app → TestFlight first → listing → **App
  Privacy** form (section 6) → screenshots → submit for review.

---

## 5. Screenshots (required)
Capture from a running build (`flutter run`, then device screenshots):
- **Play:** phone screenshots, min 2 (1080×1920 or similar). Feature graphic 1024×500.
- **App Store:** 6.7" (1290×2796) **and** 5.5" (1242×2208) sets, min 1 each.
- Good shots: stores list, a store with products, basket/checkout, live tracking map.

## 6. Data safety / App privacy (answers)
Xarid collects, tied to the user:
- **Name, phone number, delivery address** — to place and deliver orders.
- **Precise location** — **courier only**, *while using the app*, to share live
  delivery location. Customers' location is optional (delivery pin).
- **No** advertising, **no** third-party data sale, **no** cross-app tracking.
- Data is sent over **HTTPS**; used only to operate the service.
- Users can request deletion via the support email (state this in `/privacy`).

Play "Data safety": Location (Approximate+Precise) — collected, not shared, optional;
Personal info (Name, Phone, Address) — collected, not shared, required for the app.
App Store "App Privacy": Contact Info + Location → "Used for App Functionality", **not**
linked to identity for tracking, **not** used to track.

## 7. Review tips (avoid rejection)
- **Demo accounts:** give reviewers a working **customer** login and a **courier**
  login (phone + password) in the review notes — Apple/Google test the real flow.
- **Apple "minimum functionality":** this is a real native app (not a web wrapper) — fine.
- **Cash on delivery:** no in-app payment, so **no Apple IAP** is required (physical
  goods are exempt). Don't add a payment SDK you don't use.
- **Location justification:** state clearly the courier streams location *only during
  an active delivery, while the app is in use* — matches the Info.plist string.
- Make sure the **privacy policy URL resolves** before submitting.

## 8. Pre-submit checklist
- [ ] `flutter analyze` clean · app runs on a real device
- [ ] Icons + splash generated · permissions added · prod `API_BASE_URL` baked in
- [ ] Privacy + terms URLs live · support email works
- [ ] Release signing configured (Android keystore / iOS team)
- [ ] Listing copy, screenshots, data-safety/app-privacy filled
- [ ] Demo customer + courier accounts in the review notes
