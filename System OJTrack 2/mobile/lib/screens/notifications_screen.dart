import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/ndmu_theme.dart';
import '../utils/notification_helpers.dart';
import '../widgets/empty_state.dart';
import '../widgets/stream_error.dart';
import 'attendance_screen.dart';
import 'documents_screen.dart';
import 'messages_screen.dart';
import 'portfolio_screen.dart';
import 'reports_screen.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  /// Routes a tapped notification to the screen it's actually about, so the
  /// student doesn't have to leave Notifications and hunt for the right tab
  /// themselves. Types with no specific page (e.g. class-join decisions,
  /// which just change the dashboard's HTE card) fall through to the
  /// dashboard by popping back to it.
  void _navigateForType(BuildContext context, String? type) {
    switch (type) {
      case 'coordinator_feedback':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const MessagesScreen()));
        return;
      case 'attendance':
      case 'attendance_verified':
      case 'attendance_flagged':
      case 'attendance_error':
      case 'absence':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen()));
        return;
      case 'report_review':
      case 'deadline_reminder':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
        return;
      case 'document_review':
      case 'incomplete_requirements':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const DocumentsScreen()));
        return;
      case 'portfolio_review':
        Navigator.push(context, MaterialPageRoute(builder: (_) => const PortfolioScreen()));
        return;
      case 'internship_completed':
      case 'class_join_approved':
      case 'class_join_rejected':
      case 'hours_correction':
        Navigator.popUntil(context, (route) => route.isFirst);
        return;
      default:
        return;
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: uid == null
          ? const Center(child: Text('Sign in to view notifications.'))
          : StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: FirebaseFirestore.instance
                  .collection('notifications')
                  .where('recipientId', isEqualTo: uid)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: StreamError(error: snapshot.error));
                }
                final docs = [...snapshot.data?.docs ?? []];
                docs.sort((a, b) {
                  final ad = DateTime.tryParse(a.data()['createdAt']?.toString() ?? '');
                  final bd = DateTime.tryParse(b.data()['createdAt']?.toString() ?? '');
                  return (bd ?? DateTime(0)).compareTo(ad ?? DateTime(0));
                });
                if (docs.isEmpty) {
                  return const Center(
                    child: EmptyState(
                      icon: Icons.notifications_none_outlined,
                      title: 'No notifications yet',
                      subtitle: 'Updates from your coordinator will show up here.',
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: docs.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final doc = docs[index];
                    final data = doc.data();
                    final read = data['read'] == true;
                    final createdAt = DateTime.tryParse(data['createdAt']?.toString() ?? '');
                    return Card(
                      color: read ? null : NdmuColors.gold.withAlpha((0.1 * 255).round()),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        leading: Icon(
                          read ? Icons.notifications_none : Icons.notifications_active,
                          color: NdmuColors.green,
                        ),
                        title: Text(
                          notificationTitle(data['type'] as String?),
                          style: TextStyle(fontWeight: read ? FontWeight.w500 : FontWeight.w700),
                        ),
                        subtitle: Text((data['message'] as String?) ?? ''),
                        trailing: createdAt == null
                            ? null
                            : Text(
                                DateFormat('MMM d, h:mm a').format(createdAt),
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                        onTap: () {
                          if (!read) {
                            FirebaseFirestore.instance.collection('notifications').doc(doc.id).update({'read': true});
                          }
                          _navigateForType(context, data['type'] as String?);
                        },
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}
