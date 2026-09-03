/// Fallback used when neither dart:io nor dart:html is available.
/// Neither Android nor iOS in that case, so the "is this iOS" question is
/// simply false — see platform_target.dart for how this is selected.
bool get isIOSPlatform => false;
