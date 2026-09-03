import 'package:cloud_firestore/cloud_firestore.dart';

class UserRecord {
  final String id;
  final String email;
  final String displayName;
  final String role;

  UserRecord({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
  });

  factory UserRecord.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return UserRecord(
      id: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'] ?? '',
      role: data['role'] ?? 'student',
    );
  }
}

class AttendanceLog {
  final String id;
  final String studentId;
  final DateTime timestamp;
  final String type; // time_in | time_out
  final String photoUrl;
  final String status; // pending | verified | flagged

  AttendanceLog({
    required this.id,
    required this.studentId,
    required this.timestamp,
    required this.type,
    required this.photoUrl,
    required this.status,
  });

  factory AttendanceLog.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return AttendanceLog(
      id: doc.id,
      studentId: data['studentId'] ?? '',
      timestamp: (data['timestamp'] as Timestamp).toDate(),
      type: data['type'] ?? 'time_in',
      photoUrl: data['photoUrl'] ?? '',
      status: data['status'] ?? 'pending',
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'studentId': studentId,
      'timestamp': Timestamp.fromDate(timestamp),
      'type': type,
      'photoUrl': photoUrl,
      'status': status,
    };
  }
}

class StudentRecord {
  final String id;
  final String classId;
  final String? assignedHteId;
  final int requiredHours;
  final int renderedHours;

  StudentRecord({
    required this.id,
    required this.classId,
    this.assignedHteId,
    required this.requiredHours,
    required this.renderedHours,
  });

  factory StudentRecord.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return StudentRecord(
      id: doc.id,
      classId: data['classId'] ?? '',
      assignedHteId: data['assignedHteId'],
      requiredHours: data['requiredHours'] ?? 0,
      renderedHours: data['renderedHours'] ?? 0,
    );
  }
}
