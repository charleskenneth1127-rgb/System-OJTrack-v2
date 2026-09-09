import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/ndmu_theme.dart';
import '../utils/submission_helpers.dart';
import '../widgets/empty_state.dart';
import '../widgets/stream_error.dart';

const _docTypes = ['MOA', 'waiver', 'other'];

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  bool _uploading = false;

  Future<void> _uploadDocument() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final docType = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Text('Document type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            for (final type in _docTypes)
              ListTile(
                title: Text(type == 'MOA' ? 'Memorandum of Agreement' : type[0].toUpperCase() + type.substring(1)),
                onTap: () => Navigator.pop(context, type),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (docType == null || !mounted) return;

    final attachment = await pickDocumentAttachment(context);
    if (attachment == null || !mounted) return;

    setState(() => _uploading = true);
    try {
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_$docType.${attachment.extension}';
      final fileUrl = await uploadBytes(attachment.bytes, 'documents/${user.uid}/$fileName');
      await FirebaseFirestore.instance.collection('pre_ojt_documents').add({
        'studentId': user.uid,
        'docType': docType,
        'fileUrl': fileUrl,
        'status': 'pending',
        'submittedAt': FieldValue.serverTimestamp(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Document submitted for review')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Required OJT documents', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'Upload and track approval of your MOA, waivers, and other onboarding files.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: user == null
                  ? const Center(child: Text('Sign in to view your documents.'))
                  : StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('pre_ojt_documents')
                          .where('studentId', isEqualTo: user.uid)
                          .snapshots(),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        if (snapshot.hasError) {
                          return Center(child: StreamError(error: snapshot.error));
                        }
                        final docs = snapshot.data?.docs ?? [];
                        if (docs.isEmpty) {
                          return const Center(
                            child: EmptyState(
                              icon: Icons.folder_open_outlined,
                              title: 'No documents submitted yet',
                              subtitle: 'Tap "Upload document" below to submit your MOA, waiver, or other files.',
                            ),
                          );
                        }
                        return ListView.separated(
                          itemCount: docs.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final data = docs[index].data() as Map<String, dynamic>;
                            final docType = (data['docType'] as String?) ?? 'other';
                            final status = (data['status'] as String?) ?? 'pending';
                            final fileUrl = data['fileUrl'] as String?;
                            return Card(
                              child: ListTile(
                                title: Text(docType == 'MOA' ? 'Memorandum of Agreement' : docType),
                                trailing: StatusBadge(status: status),
                                onTap: fileUrl == null || fileUrl.isEmpty
                                    ? null
                                    : () => launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: (_uploading || user == null) ? null : _uploadDocument,
                icon: _uploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.upload_file, size: 18),
                label: Text(
                  _uploading ? 'Uploading…' : 'Upload document',
                  overflow: TextOverflow.ellipsis,
                ),
                style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
