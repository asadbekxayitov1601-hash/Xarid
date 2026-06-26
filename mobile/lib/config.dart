class Config {
  // Your deployed backend (the Next.js web app serves the mobile API too).
  // Override at build time:  flutter run --dart-define=API_BASE_URL=https://...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://xarid-nu.vercel.app',
  );
}
