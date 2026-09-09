import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/ndmu_theme.dart';
import '../utils/submission_helpers.dart';
import '../widgets/empty_state.dart';
import '../widgets/stream_error.dart';
import 'attendance_capture_screen.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  Future<void> _openCapture(BuildContext context) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AttendanceCaptureScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Attendance history', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text(
              'Your time-in and time-out logs, and whether your coordinator has verified them.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: user == null
                  ? const Center(child: Text('Sign in to view your attendance.'))
                  : StreamBuilder<QuerySnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('attendance_logs')
                          .where('studentId', isEqualTo: user.uid)
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
                          final at = (a.data() as Map<String, dynamic>)['timestamp'] as Timestamp?;
                          final bt = (b.data() as Map<String, dynamic>)['timestamp'] as Timestamp?;
                          return (bt?.millisecondsSinceEpoch ?? 0).compareTo(at?.millisecondsSinceEpoch ?? 0);
                        });
                        if (docs.isEmpty) {
                          return const Center(
                            child: EmptyState(
                              icon: Icons.camera_alt_outlined,
                              title: 'No attendance logs yet',
                              subtitle: 'Tap "Capture attendance" below to log your first time-in.',
                            ),
                          );
                        }
                        return ListView.separated(
                          itemCount: docs.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final data = docs[index].data() as Map<String, dynamic>;
                            final type = (data['type'] as String?) ?? 'time_in';
                            final status = (data['status'] as String?) ?? 'pending';
                            final timestamp = data['timestamp'] as Timestamp?;
                            final computedHours = (data['computedHours'] as num?)?.toDouble();
                            return Card(
                              child: ListTile(
                                leading: Icon(
                                  type == 'time_in' ? Icons.login : Icons.logout,
                                  color: type == 'time_in' ? NdmuColors.green : Colors.redAccent,
                                ),
                                title: Text(type == 'time_in' ? 'Time in' : 'Time out'),
                                subtitle: Text(
                                  [
                                    if (timestamp != null) DateFormat('MMM d, y • h:mm a').format(timestamp.toDate()),
                                    if (computedHours != null) '${computedHours}h logged',
                                  ].join(' · '),
                                ),
                                trailing: StatusBadge(status: status),
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
                onPressed: user == null ? null : () => _openCapture(context),
                icon: const Icon(Icons.camera_alt, size: 18),
                label: const Text('Capture attendance', overflow: TextOverflow.ellipsis),
                style: ElevatedButton.styleFrom(backgroundColor: NdmuColors.green),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
