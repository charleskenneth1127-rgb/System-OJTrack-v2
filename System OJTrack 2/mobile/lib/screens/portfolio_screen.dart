import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/ndmu_theme.dart';
import '../utils/submission_helpers.dart';
import '../widgets/empty_state.dart';

class PortfolioScreen extends StatefulWidget {
  const PortfolioScreen({super.key});

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  bool _uploading = false;

  Future<void> _uploadItem() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final titleController = TextEditingController();
    final title = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Add portfolio item', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, titleController.text.trim()),
                style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green, padding: const EdgeInsets.symmetric(vertical: 14)),
                child: const Text('Choose file'),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
    if (title == null || title.isEmpty || !mounted) return;

    final attachment = await pickDocumentAttachment(context);
    if (attachment == null || !mounted) return;

    setState(() => _uploading = true);
    try {
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.${attachment.extension}';
      final fileUrl = await uploadBytes(attachment.bytes, 'portfolio/${user.uid}/$fileName');
      await FirebaseFirestore.instance.collection('portfolio_items').add({
        'studentId': user.uid,
        'title': title,
        'fileUrl': fileUrl,
        'uploadedAt': FieldValue.serverTimestamp(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to your portfolio')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _deleteItem(String docId) async {
    await FirebaseFirestore.instance.collection('portfolio_items').doc(docId).delete();
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Portfolio')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My internship portfolio', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'Collect your best work, achievements, and reflections for review.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: user == null
                  ? const Center(child: Text('Sign in to view your portfolio.'))
                  : StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('portfolio_items')
                          .where('studentId', isEqualTo: user.uid)
                          .snapshots(),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        final docs = [...snapshot.data?.docs ?? []];
                        docs.sort((a, b) {
                          final at = (a.data() as Map<String, dynamic>)['uploadedAt'] as Timestamp?;
                          final bt = (b.data() as Map<String, dynamic>)['uploadedAt'] as Timestamp?;
                          return (bt?.millisecondsSinceEpoch ?? 0).compareTo(at?.millisecondsSinceEpoch ?? 0);
                        });
                        if (docs.isEmpty) {
                          return const Center(
                            child: EmptyState(
                              icon: Icons.star_outline,
                              title: 'No portfolio items yet',
                              subtitle: 'Tap "Add portfolio item" below to showcase your achievements.',
                            ),
                          );
                        }
                        return ListView.separated(
                          itemCount: docs.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final doc = docs[index];
                            final data = doc.data() as Map<String, dynamic>;
                            final title = (data['title'] as String?) ?? 'Untitled';
                            final fileUrl = data['fileUrl'] as String?;
                            return Card(
                              child: ListTile(
                                title: Text(title),
                                subtitle: const Text('Tap to view'),
                                onTap: fileUrl == null
                                    ? null
                                    : () => launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                                trailing: IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                  onPressed: () => _deleteItem(doc.id),
                                ),
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
                onPressed: (_uploading || user == null) ? null : _uploadItem,
                icon: _uploading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.add, size: 18),
                label: Text(
                  _uploading ? 'Uploading…' : 'Add portfolio item',
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
