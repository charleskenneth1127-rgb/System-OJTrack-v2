import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds the app's current [ThemeMode] and persists an explicit user choice
/// across launches. Starts on [ThemeMode.system] (follows the phone's own
/// setting) until the student taps the topbar toggle, mirroring the
/// coordinator web portal's light/dark toggle.
class ThemeController extends ValueNotifier<ThemeMode> {
  ThemeController() : super(ThemeMode.system) {
    _load();
  }

  static const _prefsKey = 'ojtrack_theme_mode';

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_prefsKey);
      if (stored == 'light') value = ThemeMode.light;
      if (stored == 'dark') value = ThemeMode.dark;
    } catch (_) {
      // No persisted preference (or platform storage unavailable) — stay on
      // ThemeMode.system.
    }
  }

  /// Flips between light and dark, treating "system" as whatever the device
  /// is currently rendering so the very first tap always feels like a step
  /// in the expected direction.
  Future<void> toggle(BuildContext context) async {
    final isDark = value == ThemeMode.dark ||
        (value == ThemeMode.system && MediaQuery.platformBrightnessOf(context) == Brightness.dark);
    value = isDark ? ThemeMode.light : ThemeMode.dark;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, value == ThemeMode.dark ? 'dark' : 'light');
    } catch (_) {}
  }
}

/// Single app-wide instance — the whole app has exactly one theme, so a
/// singleton avoids threading a controller through every screen's
/// constructor just to reach the toggle button in the topbar.
final themeController = ThemeController();
