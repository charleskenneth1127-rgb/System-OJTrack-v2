import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/ndmu_theme.dart';
import '../utils/submission_helpers.dart';
import '../widgets/empty_state.dart';

const _reportTypes = ['daily', 'weekly', 'narrative'];

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  Future<void> _openSubmitSheet() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: _SubmitReportSheet(uid: user.uid),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Internship reports', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'Submit daily, weekly, and narrative reports to keep your coordinator updated.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: user == null
                  ? const Center(child: Text('Sign in to view your reports.'))
                  : StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('reports')
                          .where('studentId', isEqualTo: user.uid)
                          .snapshots(),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        final docs = [...snapshot.data?.docs ?? []];
                        docs.sort((a, b) {
                          final at = (a.data() as Map<String, dynamic>)['submittedAt'] as Timestamp?;
                          final bt = (b.data() as Map<String, dynamic>)['submittedAt'] as Timestamp?;
                          return (bt?.millisecondsSinceEpoch ?? 0).compareTo(at?.millisecondsSinceEpoch ?? 0);
                        });
                        if (docs.isEmpty) {
                          return const Center(
                            child: EmptyState(
                              icon: Icons.description_outlined,
                              title: 'No reports submitted yet',
                              subtitle: 'Tap "Submit report" below to send your first daily, weekly, or narrative report.',
                            ),
                          );
                        }
                        return ListView.separated(
                          itemCount: docs.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final data = docs[index].data() as Map<String, dynamic>;
                            final type = (data['type'] as String?) ?? 'daily';
                            final status = (data['status'] as String?) ?? 'pending';
                            final content = (data['content'] as String?) ?? '';
                            final fileUrl = data['fileUrl'] as String?;
                            final submittedAt = data['submittedAt'] as Timestamp?;
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          '${type[0].toUpperCase()}${type.substring(1)} report',
                                          style: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        StatusBadge(status: status),
                                      ],
                                    ),
                                    if (submittedAt != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        DateFormat('MMM d, y • h:mm a').format(submittedAt.toDate()),
                                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                                      ),
                                    ],
                                    const SizedBox(height: 8),
                                    Text(content),
                                    if (fileUrl != null && fileUrl.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      GestureDetector(
                                        onTap: () => launchUrl(Uri.parse(fileUrl), mode: LaunchMode.externalApplication),
                                        child: const Text(
                                          'View attachment',
                                          style: TextStyle(color: NdmuColors.green, fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                    ],
                                  ],
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
                onPressed: user == null ? null : _openSubmitSheet,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Submit new report', overflow: TextOverflow.ellipsis),
                style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubmitReportSheet extends StatefulWidget {
  const _SubmitReportSheet({required this.uid});

  final String uid;

  @override
  State<_SubmitReportSheet> createState() => _SubmitReportSheetState();
}

class _SubmitReportSheetState extends State<_SubmitReportSheet> {
  String _type = _reportTypes.first;
  final _contentController = TextEditingController();
  XFile? _attachment;
  bool _submitting = false;

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickAttachment() async {
    final file = await pickAttachment(context);
    if (file != null) setState(() => _attachment = file);
  }

  Future<void> _submit() async {
    if (_contentController.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    try {
      String? fileUrl;
      if (_attachment != null) {
        final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
        fileUrl = await uploadAttachment(_attachment!, 'reports/${widget.uid}/$fileName');
      }
      await FirebaseFirestore.instance.collection('reports').add({
        'studentId': widget.uid,
        'type': _type,
        'content': _contentController.text.trim(),
        'fileUrl': ?fileUrl,
        'status': 'pending',
        'submittedAt': FieldValue.serverTimestamp(),
      });
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Submission failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Submit a report', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Report type', border: OutlineInputBorder()),
              items: _reportTypes
                  .map((t) => DropdownMenuItem(value: t, child: Text('${t[0].toUpperCase()}${t.substring(1)}')))
                  .toList(),
              onChanged: (value) => setState(() => _type = value ?? _type),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'What did you work on?',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _pickAttachment,
                icon: const Icon(Icons.attach_file, size: 18),
                label: Text(
                  _attachment == null ? 'Attach a photo (optional)' : 'Attachment added',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green, padding: const EdgeInsets.symmetric(vertical: 14)),
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit report', overflow: TextOverflow.ellipsis),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
