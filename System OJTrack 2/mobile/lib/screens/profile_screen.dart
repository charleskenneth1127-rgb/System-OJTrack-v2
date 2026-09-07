import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../theme/ndmu_theme.dart';
import '../utils/submission_helpers.dart';
import 'change_password_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _contactEmailController = TextEditingController();
  bool _savingEmail = false;
  bool _emailDirty = false;
  String? _lastLoadedEmail;
  bool _uploadingPhoto = false;

  @override
  void dispose() {
    _contactEmailController.dispose();
    super.dispose();
  }

  Future<void> _changePhoto(String uid) async {
    // Displayed at 58px at most, so there's no reason to keep a full-size
    // photo around — this keeps uploads fast and Storage usage small.
    final file = await pickAttachment(context, maxWidth: 512, maxHeight: 512);
    if (file == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final photoUrl = await uploadAttachment(file, 'avatars/$uid/photo');
      await FirebaseFirestore.instance.collection('users').doc(uid).update({'photoUrl': photoUrl});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not upload photo: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _saveContactEmail(String uid) async {
    setState(() => _savingEmail = true);
    try {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({
        'contactEmail': _contactEmailController.text.trim(),
      });
      if (mounted) {
        setState(() => _emailDirty = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Contact email updated.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _savingEmail = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: user == null
          ? const Center(child: Text('Sign in to view your profile.'))
          : StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
              stream: FirebaseFirestore.instance.collection('users').doc(user.uid).snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final data = snapshot.data?.data() ?? {};
                final displayName = (data['displayName'] as String?) ?? 'Intern';
                final studentIdCode = (data['studentIdCode'] as String?) ?? '—';
                final contactEmail = (data['contactEmail'] as String?) ?? '';
                final photoUrl = data['photoUrl'] as String?;

                if (_lastLoadedEmail != contactEmail) {
                  _lastLoadedEmail = contactEmail;
                  _contactEmailController.text = contactEmail;
                }

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [NdmuColors.green, NdmuColors.greenDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                width: 58,
                                height: 58,
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha((0.16 * 255).round()),
                                  shape: BoxShape.circle,
                                  image: photoUrl != null
                                      ? DecorationImage(image: NetworkImage(photoUrl), fit: BoxFit.cover)
                                      : null,
                                ),
                                child: photoUrl == null
                                    ? const Icon(Icons.person, color: Colors.white, size: 30)
                                    : null,
                              ),
                              Positioned(
                                bottom: -2,
                                right: -2,
                                child: GestureDetector(
                                  onTap: _uploadingPhoto ? null : () => _changePhoto(user.uid),
                                  child: Container(
                                    padding: const EdgeInsets.all(5),
                                    decoration: const BoxDecoration(
                                      color: NdmuColors.gold,
                                      shape: BoxShape.circle,
                                    ),
                                    child: _uploadingPhoto
                                        ? const SizedBox(
                                            width: 12,
                                            height: 12,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                          )
                                        : const Icon(Icons.camera_alt, color: Colors.white, size: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  displayName,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 19,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Student ID: $studentIdCode',
                                  style: const TextStyle(color: Colors.white70, fontSize: 13.5),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        'Your name and Student ID are set by your coordinator to match school records. '
                        'Contact them if either needs correcting.',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12.5),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text('Contact email', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text(
                      'Used for notifications only — not your sign-in ID.',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12.5),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _contactEmailController,
                      keyboardType: TextInputType.emailAddress,
                      onChanged: (_) => setState(() => _emailDirty = true),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.mail_outline),
                        hintText: 'student@gmail.com',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_emailDirty && !_savingEmail) ? () => _saveContactEmail(user.uid) : null,
                        style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green),
                        child: _savingEmail
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Save contact email'),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text('Security', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: ListTile(
                        leading: const Icon(Icons.lock_outline, color: NdmuColors.green),
                        title: const Text('Change password'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ChangePasswordScreen(standalone: true)),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }
}
