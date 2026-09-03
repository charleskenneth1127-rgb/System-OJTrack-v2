/// Domain used for the synthetic email behind every student account.
/// Students never see this — they sign in with their Student ID, which is
/// mapped to `${studentId}@$studentAccountDomain` before calling Firebase
/// Auth. Must match `STUDENT_ACCOUNT_DOMAIN` in the coordinator web app.
const studentAccountDomain = 'ojtrack.local';

String studentIdToEmail(String studentId) {
  final sanitized = studentId.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9._-]'), '-');
  return '$sanitized@$studentAccountDomain';
}

/// The login field accepts either the student's school-issued ID or a full
/// email address — whichever the student finds easier to remember. An "@"
/// in the input means they typed an email; otherwise it's treated as an ID
/// and mapped to the synthetic Firebase Auth email.
String resolveLoginEmail(String input) {
  final trimmed = input.trim();
  if (trimmed.contains('@')) {
    return trimmed.toLowerCase();
  }
  return studentIdToEmail(trimmed);
}

/// Returns null if [password] satisfies the required password policy,
/// otherwise a message describing what's missing.
String? validatePasswordStrength(String password) {
  final missing = <String>[];
  if (password.length < 8) missing.add('at least 8 characters');
  if (!RegExp(r'[A-Z]').hasMatch(password)) missing.add('an uppercase letter');
  if (!RegExp(r'[a-z]').hasMatch(password)) missing.add('a lowercase letter');
  if (!RegExp(r'[0-9]').hasMatch(password)) missing.add('a number');
  if (!RegExp(r'''[!@#$%^&*(),.?":{}|<>_\-+=\[\]/;~`]''').hasMatch(password)) {
    missing.add('a special character');
  }
  if (missing.isEmpty) return null;
  return 'Password needs ${missing.join(', ')}.';
}
