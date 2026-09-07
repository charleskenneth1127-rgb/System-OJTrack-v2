import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../theme/ndmu_theme.dart';
import '../utils/student_account.dart';

/// Self-registration for students. The account's actual Firebase Auth email
/// is always the synthetic `studentId@ojtrack.local` — the same convention
/// coordinator-provisioned accounts use (see updateStudentLoginId in Cloud
/// Functions) — so a Student ID works as a login credential everywhere,
/// self-registered or not. The optional "contact email" a student types
/// here is stored separately (users/{uid}.contactEmail) purely for the
/// coordinator to reach them; it never backs sign-in. Unlike
/// coordinator-provisioned accounts, a self-registered student picks their
/// own password up front, so there's no forced first-login change
/// afterward. Once signed up, AuthGate routes them to JoinClassScreen since
/// they won't have a students/{uid} doc yet.
class SignUpScreen extends StatefulWidget {
  final VoidCallback onBackToLogin;

  const SignUpScreen({super.key, required this.onBackToLogin});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _nameController = TextEditingController();
  final _studentIdController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  Future<void> _handleSignUp() async {
    final name = _nameController.text.trim();
    final studentId = _studentIdController.text.trim();
    final contactEmail = _emailController.text.trim();
    final password = _passwordController.text;

    if (name.isEmpty) {
      setState(() => _errorMessage = 'Enter your full name.');
      return;
    }
    if (studentId.isEmpty) {
      setState(() => _errorMessage = 'Enter your Student ID.');
      return;
    }
    if (contactEmail.isNotEmpty && !contactEmail.contains('@')) {
      setState(() => _errorMessage = 'Enter a valid email address, or leave it blank.');
      return;
    }
    final passwordIssue = validatePasswordStrength(password);
    if (passwordIssue != null) {
      setState(() => _errorMessage = passwordIssue);
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final loginEmail = studentIdToEmail(studentId);
      final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: loginEmail,
        password: password,
      );
      await FirebaseFirestore.instance.collection('users').doc(credential.user!.uid).set({
        'role': 'student',
        'email': loginEmail,
        'studentIdCode': studentId,
        if (contactEmail.isNotEmpty) 'contactEmail': contactEmail,
        'displayName': name,
        'createdAt': DateTime.now().toIso8601String(),
        'mustChangePassword': false,
      });
      // Navigation is handled by the auth state listener in main.dart.
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage = e.code == 'email-already-in-use'
            ? 'This Student ID is already registered. Try signing in instead, or double-check the ID.'
            : (e.message ?? 'Could not create your account.');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _studentIdController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                              child: const Icon(Icons.person_add_alt_1, size: 30, color: Colors.white),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Create your account',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: NdmuColors.greenDark,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "You'll join your coordinator's class using a code on the next step.",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 14.5),
                          ),
                          const SizedBox(height: 26),
                          TextField(
                            controller: _nameController,
                            decoration: InputDecoration(
                              labelText: 'Full name',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.badge_outlined, color: NdmuColors.green),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _studentIdController,
                            decoration: InputDecoration(
                              labelText: 'Student ID',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.badge, color: NdmuColors.green),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Text(
                              'Your school-issued Student ID. You can sign in with it later instead of an email.',
                              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                            decoration: InputDecoration(
                              labelText: 'Contact email (optional)',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.mail_outline, color: NdmuColors.green),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.lock_outline, color: NdmuColors.green),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: NdmuColors.green,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Text(
                              'At least 8 characters, with uppercase, lowercase, a number, and a special character.',
                              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                            ),
                          ),
                          const SizedBox(height: 18),
                          if (_errorMessage != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Colors.red),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleSignUp,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NdmuColors.green,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : const Text('CREATE ACCOUNT'),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: widget.onBackToLogin,
                            child: const Text('Already have an account? Sign in'),
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
