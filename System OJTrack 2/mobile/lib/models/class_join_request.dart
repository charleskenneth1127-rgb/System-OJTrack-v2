import 'package:cloud_firestore/cloud_firestore.dart';

class ClassRecord {
  final String id;
  final String name;
  final String schoolYear;
  final String term;
  final int requiredHours;
  final String joinCode;

  ClassRecord({
    required this.id,
    required this.name,
    required this.schoolYear,
    required this.term,
    required this.requiredHours,
    required this.joinCode,
  });

  factory ClassRecord.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return ClassRecord(
      id: doc.id,
      name: data['name'] ?? '',
      schoolYear: data['schoolYear'] ?? '',
      term: data['term'] ?? '',
      requiredHours: data['requiredHours'] ?? 0,
      joinCode: data['joinCode'] ?? '',
    );
  }
}

class ClassJoinRequest {
  final String id; // == studentUid
  final String classId;
  final String joinCode;
  final String studentUid;
  final String studentName;
  final String studentEmail;
  final String status; // pending | approved | rejected
  final DateTime? requestedAt;

  ClassJoinRequest({
    required this.id,
    required this.classId,
    required this.joinCode,
    required this.studentUid,
    required this.studentName,
    required this.studentEmail,
    required this.status,
    this.requestedAt,
  });

  factory ClassJoinRequest.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return ClassJoinRequest(
      id: doc.id,
      classId: data['classId'] ?? '',
      joinCode: data['joinCode'] ?? '',
      studentUid: data['studentUid'] ?? '',
      studentName: data['studentName'] ?? '',
      studentEmail: data['studentEmail'] ?? '',
      status: data['status'] ?? 'pending',
      requestedAt: DateTime.tryParse(data['requestedAt']?.toString() ?? ''),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'classId': classId,
      'joinCode': joinCode,
      'studentUid': studentUid,
      'studentName': studentName,
      'studentEmail': studentEmail,
      'status': status,
      'requestedAt': (requestedAt ?? DateTime.now()).toIso8601String(),
    };
  }
}
