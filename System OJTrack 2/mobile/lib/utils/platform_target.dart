/// Whether the app is currently running on iOS. `dart:io`'s `Platform`
/// class doesn't compile for web, so this picks between a stub (web) and
/// the real implementation (Android/iOS/desktop) at compile time — see
/// platform_target_stub.dart / platform_target_io.dart.
library;

export 'platform_target_stub.dart' if (dart.library.io) 'platform_target_io.dart';
