import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/ndmu_theme.dart';
import '../widgets/empty_state.dart';

/// Chat-style view over the coordinator's feedback messages.
///
/// This reuses the existing `notifications` collection (type ==
/// 'coordinator_feedback') rather than a separate messages collection —
/// coordinator feedback is currently one-directional, so a threaded read
/// view is enough; it isn't a two-way chat.
class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  @override
  void initState() {
    super.initState();
    _markAllRead();
  }

  Future<void> _markAllRead() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    final unread = await FirebaseFirestore.instance
        .collection('notifications')
        .where('recipientId', isEqualTo: uid)
        .where('type', isEqualTo: 'coordinator_feedback')
        .where('read', isEqualTo: false)
        .get();
    if (unread.docs.isEmpty) return;
    final batch = FirebaseFirestore.instance.batch();
    for (final doc in unread.docs) {
      batch.update(doc.reference, {'read': true});
    }
    await batch.commit();
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: uid == null
          ? const Center(child: Text('Sign in to view messages.'))
          : StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: FirebaseFirestore.instance
                  .collection('notifications')
                  .where('recipientId', isEqualTo: uid)
                  .where('type', isEqualTo: 'coordinator_feedback')
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final docs = [...snapshot.data?.docs ?? []];
                docs.sort((a, b) {
                  final ad = DateTime.tryParse(a.data()['createdAt']?.toString() ?? '');
                  final bd = DateTime.tryParse(b.data()['createdAt']?.toString() ?? '');
                  return (ad ?? DateTime(0)).compareTo(bd ?? DateTime(0));
                });
                if (docs.isEmpty) {
                  return const Center(
                    child: EmptyState(
                      icon: Icons.forum_outlined,
                      title: 'No messages yet',
                      subtitle: 'Feedback from your coordinator will show up here.',
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final data = docs[index].data();
                    final createdAt = DateTime.tryParse(data['createdAt']?.toString() ?? '');
                    return _CoordinatorBubble(
                      message: (data['message'] as String?) ?? '',
                      timestamp: createdAt,
                    );
                  },
                );
              },
            ),
    );
  }
}

class _CoordinatorBubble extends StatelessWidget {
  final String message;
  final DateTime? timestamp;

  const _CoordinatorBubble({required this.message, required this.timestamp});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: NdmuColors.green,
            child: const Icon(Icons.school_outlined, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Coordinator',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: NdmuColors.greenDark),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(16).copyWith(topLeft: const Radius.circular(4)),
                    border: Border.all(color: NdmuColors.gold.withAlpha((0.35 * 255).round())),
                  ),
                  child: Text(message, style: const TextStyle(fontSize: 14, height: 1.35)),
                ),
                if (timestamp != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('MMM d, h:mm a').format(timestamp!),
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
