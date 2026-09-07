import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../theme/ndmu_theme.dart';
import '../utils/student_account.dart';

class LoginScreen extends StatefulWidget {
  final bool offlineMode;
  final void Function(String displayName)? onOfflineSignIn;
  final VoidCallback? onCreateAccount;

  const LoginScreen({
    super.key,
    this.offlineMode = false,
    this.onOfflineSignIn,
    this.onCreateAccount,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    if (widget.offlineMode) {
      await Future.delayed(const Duration(milliseconds: 500));
      widget.onOfflineSignIn?.call(_idController.text.trim());
      return;
    }

    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: resolveLoginEmail(_idController.text),
        password: _passwordController.text,
      );
      // Navigation is handled by the auth state listener in main.dart
    } on FirebaseAuthException catch (e) {
      setState(() {
        _errorMessage = e.code == 'invalid-credential' || e.code == 'user-not-found'
            ? 'Student ID or password is incorrect.'
            : e.message;
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _idController.dispose();
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
                    // Gold seal stripe
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
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [NdmuColors.gold, NdmuColors.goldLight],
                                ),
                              ),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: [NdmuColors.green, NdmuColors.greenDark],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.school,
                                  size: 34,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'OJTrack',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.w800,
                              color: NdmuColors.greenDark,
                              letterSpacing: 0.4,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'NOTRE DAME OF MARBEL UNIVERSITY',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: NdmuColors.gold,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Student Internship Portal',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 15.5),
                          ),
                          const SizedBox(height: 28),
                          TextField(
                            controller: _idController,
                            decoration: InputDecoration(
                              labelText: widget.offlineMode ? 'Name or ID' : 'Student ID or Email',
                              filled: true,
                              fillColor: const Color(0xFFF6F7F3),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                                borderSide: BorderSide.none,
                              ),
                              prefixIcon: const Icon(Icons.badge_outlined, color: NdmuColors.green),
                            ),
                            keyboardType: TextInputType.text,
                          ),
                          if (!widget.offlineMode) ...[
                            const SizedBox(height: 6),
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Text(
                                'Use the Student ID your coordinator gave you, or your email.',
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                              ),
                            ),
                          ],
                          const SizedBox(height: 18),
                          TextField(
                            controller: _passwordController,
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
                            obscureText: _obscurePassword,
                          ),
                          const SizedBox(height: 22),
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
                            onPressed: _isLoading ? null : _handleLogin,
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
                                : Text(widget.offlineMode ? 'START OFFLINE' : 'SIGN IN'),
                          ),
                          if (widget.offlineMode) ...[
                            const SizedBox(height: 16),
                            Text(
                              'Offline mode active. Enter any name or ID to keep using the app.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey.shade600),
                            ),
                          ] else ...[
                            if (widget.onCreateAccount != null) ...[
                              const SizedBox(height: 10),
                              TextButton(
                                onPressed: widget.onCreateAccount,
                                child: const Text("Don't have an account? Create one"),
                              ),
                            ],
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () {},
                              child: const Text('Need help signing in?'),
                            ),
                          ],
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
