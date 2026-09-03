import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../theme/ndmu_theme.dart';
import '../utils/student_account.dart';

class ChangePasswordScreen extends StatefulWidget {
  /// True when opened voluntarily from Profile (shows a back button and
  /// pops with a confirmation on success) rather than as the forced
  /// first-login gate (where AuthGate's listener navigates away instead).
  final bool standalone;

  const ChangePasswordScreen({super.key, this.standalone = false});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscure = true;
  bool _isSaving = false;
  String? _errorMessage;

  static const _requirements = <String, bool Function(String)>{
    'At least 8 characters': _hasMinLength,
    'An uppercase letter (A-Z)': _hasUppercase,
    'A lowercase letter (a-z)': _hasLowercase,
    'A number (0-9)': _hasDigit,
    'A special character (e.g. ! @ # \$)': _hasSpecialChar,
  };

  static bool _hasMinLength(String v) => v.length >= 8;
  static bool _hasUppercase(String v) => RegExp(r'[A-Z]').hasMatch(v);
  static bool _hasLowercase(String v) => RegExp(r'[a-z]').hasMatch(v);
  static bool _hasDigit(String v) => RegExp(r'[0-9]').hasMatch(v);
  static bool _hasSpecialChar(String v) =>
      RegExp(r'''[!@#$%^&*(),.?":{}|<>_\-+=\[\]/;~`]''').hasMatch(v);

  bool get _passwordsMatch =>
      _newPasswordController.text.isNotEmpty &&
      _newPasswordController.text == _confirmPasswordController.text;

  bool get _isValid =>
      validatePasswordStrength(_newPasswordController.text) == null && _passwordsMatch;

  Future<void> _handleSubmit() async {
    if (!_isValid) return;
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception('No signed-in user.');
      await user.updatePassword(_newPasswordController.text);
      await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
        'mustChangePassword': false,
      });
      if (widget.standalone && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password updated.')),
        );
        Navigator.pop(context);
      }
      // Otherwise this is the forced first-login gate — AuthGate's
      // Firestore listener picks up the cleared flag and navigates to the
      // dashboard automatically.
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage = e.code == 'requires-recent-login'
            ? 'For security, please sign out and sign back in with your temporary password, then try again.'
            : (e.message ?? 'Could not update your password.');
      });
    } catch (e) {
      setState(() => _errorMessage = 'Could not update your password. Please try again.');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.standalone
          ? AppBar(
              title: const Text('Change Password'),
              backgroundColor: NdmuColors.greenDark,
              foregroundColor: Colors.white,
            )
          : null,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [NdmuColors.greenDark, NdmuColors.green],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 420),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: const [
                    BoxShadow(
                      color: Color.fromRGBO(0, 0, 0, 0.18),
                      blurRadius: 28,
                      offset: Offset(0, 14),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      height: 6,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [NdmuColors.gold, NdmuColors.goldLight, NdmuColors.gold],
                        ),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [NdmuColors.green, NdmuColors.greenDark],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: const Icon(Icons.lock_reset, size: 30, color: Colors.white),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            widget.standalone ? 'Change Password' : 'Set a New Password',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: NdmuColors.greenDark,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.standalone
                                ? "Choose a new password below. You'll use it the next time you sign in."
                                : 'This is your first time signing in. For your security, create a new password before continuing.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 14.5),
                          ),
                          const SizedBox(height: 26),
                          TextField(
                            controller: _newPasswordController,
                            obscureText: _obscure,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              labelText: 'New password',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.lock_outline, color: NdmuColors.green),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: Colors.grey,
                                ),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _confirmPasswordController,
                            obscureText: _obscure,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              labelText: 'Confirm new password',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.lock_outline, color: NdmuColors.green),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF6F7F3),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                for (final entry in _requirements.entries)
                                  Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                    child: _RequirementRow(
                                      label: entry.key,
                                      met: entry.value(_newPasswordController.text),
                                    ),
                                  ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 3),
                                  child: _RequirementRow(
                                    label: 'Passwords match',
                                    met: _passwordsMatch,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 16),
                            Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.red),
                              textAlign: TextAlign.center,
                            ),
                          ],
                          const SizedBox(height: 22),
                          ElevatedButton(
                            onPressed: (_isValid && !_isSaving) ? _handleSubmit : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NdmuColors.green,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey.shade300,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : const Text('UPDATE PASSWORD'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RequirementRow extends StatelessWidget {
  const _RequirementRow({required this.label, required this.met});

  final String label;
  final bool met;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          met ? Icons.check_circle : Icons.radio_button_unchecked,
          size: 16,
          color: met ? NdmuColors.green : Colors.grey.shade400,
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            color: met ? NdmuColors.greenDark : Colors.grey.shade600,
            fontWeight: met ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ],
    );
  }
}
