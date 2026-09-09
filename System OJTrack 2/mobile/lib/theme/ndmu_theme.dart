import 'package:flutter/material.dart';

/// Notre Dame of Marbel University brand palette (gold & green),
/// per https://www.ndmu.edu.ph/ndmu-colors.
class NdmuColors {
  NdmuColors._();

  static const Color green = Color(0xFF1B5E20);
  static const Color greenDark = Color(0xFF0B3D24);
  static const Color greenLight = Color(0xFF3E8E56);
  static const Color gold = Color(0xFFC9A227);
  static const Color goldLight = Color(0xFFF0C93D);
  static const Color ivory = Color(0xFFFAF7EF);
  static const Color ink = Color(0xFF152A1D);

  // Dark-mode surfaces — near-black with a faint green tint rather than a
  // neutral grey, so the palette still reads as OJTrack's own rather than a
  // generic Material dark theme.
  static const Color darkBackground = Color(0xFF10140F);
  static const Color darkSurface = Color(0xFF1B231C);
  static const Color darkTextPrimary = Color(0xFFE9EDE6);
}

ThemeData buildNdmuTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: NdmuColors.green,
    brightness: Brightness.light,
    secondary: NdmuColors.gold,
    tertiary: NdmuColors.goldLight,
  );

  return ThemeData(
    colorScheme: colorScheme,
    useMaterial3: true,
    scaffoldBackgroundColor: NdmuColors.ivory,
    appBarTheme: AppBarTheme(
      backgroundColor: colorScheme.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      surfaceTintColor: colorScheme.primary,
      titleTextStyle: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: Colors.white,
        letterSpacing: 0.2,
      ),
    ),
    cardTheme: CardThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 0,
      color: colorScheme.surface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: colorScheme.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: NdmuColors.greenDark,
        side: const BorderSide(color: NdmuColors.gold, width: 1.4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: NdmuColors.greenDark),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: NdmuColors.gold.withAlpha((0.28 * 255).round()),
      surfaceTintColor: Colors.white,
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: NdmuColors.ink),
      bodyLarge: TextStyle(color: NdmuColors.ink),
    ),
  );
}

/// Dark counterpart of [buildNdmuTheme]. Keeps the same green/gold brand
/// accents but on dark surfaces — a lighter green is used as the seed since
/// the light theme's deep [NdmuColors.green] doesn't have enough contrast
/// against a near-black background.
ThemeData buildNdmuDarkTheme() {
  final colorScheme = ColorScheme.fromSeed(
    seedColor: NdmuColors.greenLight,
    brightness: Brightness.dark,
    secondary: NdmuColors.gold,
    tertiary: NdmuColors.goldLight,
    surface: NdmuColors.darkSurface,
  );

  return ThemeData(
    colorScheme: colorScheme,
    useMaterial3: true,
    scaffoldBackgroundColor: NdmuColors.darkBackground,
    appBarTheme: AppBarTheme(
      backgroundColor: NdmuColors.greenDark,
      foregroundColor: Colors.white,
      elevation: 0,
      surfaceTintColor: NdmuColors.greenDark,
      titleTextStyle: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: Colors.white,
        letterSpacing: 0.2,
      ),
    ),
    cardTheme: CardThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 0,
      color: colorScheme.surface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: NdmuColors.greenLight,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: NdmuColors.goldLight,
        side: const BorderSide(color: NdmuColors.gold, width: 1.4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: NdmuColors.goldLight),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: NdmuColors.darkSurface,
      indicatorColor: NdmuColors.gold.withAlpha((0.32 * 255).round()),
      surfaceTintColor: NdmuColors.darkSurface,
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: NdmuColors.darkTextPrimary),
      bodyLarge: TextStyle(color: NdmuColors.darkTextPrimary),
    ),
  );
}
