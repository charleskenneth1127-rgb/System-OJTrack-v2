import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../models/class_join_request.dart';
import '../theme/ndmu_theme.dart';

/// Shown once a student is signed in but not yet on any class roster
/// (mirrors CodeChum's "enter the class code given to you by your teacher"
/// flow). Submitting creates a class_join_requests/{uid} doc; the coordinator
/// must approve it before the student's dashboard becomes available —
/// AuthGate in main.dart watches for that and swaps this screen out once
/// students/{uid} exists.
class JoinClassScreen extends StatefulWidget {
  final VoidCallback onLogout;

  const JoinClassScreen({super.key, required this.onLogout});

  @override
  State<JoinClassScreen> createState() => _JoinClassScreenState();
}

class _JoinClassScreenState extends State<JoinClassScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleJoin() async {
    final code = _codeController.text.trim().toUpperCase();
    if (code.isEmpty) {
      setState(() => _errorMessage = 'Enter the class code your coordinator gave you.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) throw Exception('Not signed in.');

      final classQuery = await FirebaseFirestore.instance
          .collection('classes')
          .where('joinCode', isEqualTo: code)
          .limit(1)
          .get();
      if (classQuery.docs.isEmpty) {
        setState(() => _errorMessage = 'No class found with that code. Double-check with your coordinator.');
        return;
      }
      final classDoc = classQuery.docs.first;

      final request = ClassJoinRequest(
        id: user.uid,
        classId: classDoc.id,
        joinCode: code,
        studentUid: user.uid,
        studentName: user.displayName ?? '',
        studentEmail: user.email ?? '',
        status: 'pending',
        requestedAt: DateTime.now(),
      );

      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      final displayName = (userDoc.data()?['displayName'] as String?) ?? user.email ?? 'A student';

      await FirebaseFirestore.instance.collection('class_join_requests').doc(user.uid).set({
        ...request.toFirestore(),
        'studentName': displayName,
      });
      // The StreamBuilder in build() picks up the new pending request.
    } catch (e) {
      setState(() => _errorMessage = 'Could not submit your request. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _cancelRequest(String requestId) async {
    await FirebaseFirestore.instance.collection('class_join_requests').doc(requestId).delete();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

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
              child: uid == null
                  ? const SizedBox.shrink()
                  : StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                      stream: FirebaseFirestore.instance.collection('class_join_requests').doc(uid).snapshots(),
                      builder: (context, snapshot) {
                        final data = snapshot.data?.data();
                        if (data != null && data['status'] == 'pending') {
                          return _PendingCard(
                            classId: data['classId'] as String? ?? '',
                            onCancel: () => _cancelRequest(uid),
                            onLogout: widget.onLogout,
                          );
                        }
                        final wasRejected = data != null && data['status'] == 'rejected';
                        return _CodeEntryCard(
                          codeController: _codeController,
                          isLoading: _isLoading,
                          errorMessage: _errorMessage,
                          wasRejected: wasRejected,
                          onJoin: _handleJoin,
                          onLogout: widget.onLogout,
                        );
                      },
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CardShell extends StatelessWidget {
  const _CardShell({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 420),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(color: Color.fromRGBO(0, 0, 0, 0.18), blurRadius: 28, offset: Offset(0, 14)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 6,
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [NdmuColors.gold, NdmuColors.goldLight, NdmuColors.gold]),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeEntryCard extends StatelessWidget {
  const _CodeEntryCard({
    required this.codeController,
    required this.isLoading,
    required this.errorMessage,
    required this.wasRejected,
    required this.onJoin,
    required this.onLogout,
  });

  final TextEditingController codeController;
  final bool isLoading;
  final String? errorMessage;
  final bool wasRejected;
  final VoidCallback onJoin;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
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
            child: const Icon(Icons.group_add_outlined, size: 30, color: Colors.white),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Join Class',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: NdmuColors.greenDark),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter the class code given to you by your coordinator.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 14.5),
        ),
        if (wasRejected) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F0),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Your previous request was declined. You can try a different code below.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFFB42318), fontSize: 12.5),
            ),
          ),
        ],
        const SizedBox(height: 26),
        TextField(
          controller: codeController,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            labelText: 'Class Code',
            filled: true,
            fillColor: const Color(0xFFF6F7F3),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            prefixIcon: const Icon(Icons.vpn_key_outlined, color: NdmuColors.green),
          ),
        ),
        const SizedBox(height: 18),
        if (errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(errorMessage!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
          ),
        ElevatedButton(
          onPressed: isLoading ? null : onJoin,
          style: ElevatedButton.styleFrom(
            backgroundColor: NdmuColors.green,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                )
              : const Text('JOIN CLASS'),
        ),
        const SizedBox(height: 12),
        TextButton(onPressed: onLogout, child: const Text('Sign out')),
      ],
    );
  }
}

class _PendingCard extends StatelessWidget {
  const _PendingCard({required this.classId, required this.onCancel, required this.onLogout});

  final String classId;
  final VoidCallback onCancel;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return _CardShell(
      children: [
        Center(
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(shape: BoxShape.circle, color: NdmuColors.gold.withAlpha((0.18 * 255).round())),
            child: const Icon(Icons.hourglass_top_outlined, size: 30, color: NdmuColors.greenDark),
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Request sent',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: NdmuColors.greenDark),
        ),
        const SizedBox(height: 8),
        FutureBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          future: FirebaseFirestore.instance.collection('classes').doc(classId).get(),
          builder: (context, snapshot) {
            final className = snapshot.data?.data()?['name'] as String?;
            return Text(
              className != null
                  ? "Waiting for your coordinator to approve your request to join $className."
                  : 'Waiting for your coordinator to approve your request.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14.5),
            );
          },
        ),
        const SizedBox(height: 26),
        OutlinedButton(
          onPressed: onCancel,
          style: OutlinedButton.styleFrom(
            foregroundColor: NdmuColors.greenDark,
            side: const BorderSide(color: NdmuColors.gold, width: 1.4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
          child: const Text('Cancel request'),
        ),
        const SizedBox(height: 12),
        TextButton(onPressed: onLogout, child: const Text('Sign out')),
      ],
    );
  }
}
