import 'package:flutter/material.dart';

// Xarid brand palette (cream + green), mirrored from the web app's tokens.
class Brand {
  static const cream = Color(0xFFFFFDF1); // --bg-primary (light)
  static const card = Color(0xFFF5EFDF); // --bg-secondary (light)
  static const green = Color(0xFF3DA233); // --accent (light)
  static const greenBright = Color(0xFF59C749); // --accent-2 (light)
  static const ink = Color(0xFF17210F); // --text-primary
  static const inkSoft = Color(0xFF5A6150); // --text-secondary
  static const onAccent = Color(0xFF07260A); // --on-accent (dark ink on green)
  static const amber = Color(0xFFD97706); // discount badge
  static const border = Color(0x1A17210F); // --border-color
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.green,
    primary: Brand.green,
    surface: Brand.cream,
    brightness: Brightness.light,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Brand.cream,
    appBarTheme: const AppBarTheme(
      backgroundColor: Brand.cream,
      foregroundColor: Brand.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.green,
        foregroundColor: Brand.onAccent,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Brand.card,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.green, width: 1.5),
      ),
    ),
  );
}
