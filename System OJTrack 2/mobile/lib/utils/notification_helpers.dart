/// Maps a NotificationRecord.type (set by the Cloud Functions in
/// functions/src/) to a short, student-facing title.
String notificationTitle(String? type) {
  switch (type) {
    case 'report_review':
      return 'Report reviewed';
    case 'document_review':
      return 'Document reviewed';
    case 'hours_correction':
      return 'Hours updated';
    case 'internship_completed':
      return 'Internship completed';
    case 'attendance_flagged':
      return 'Attendance flagged';
    case 'attendance_verified':
      return 'Attendance verified';
    case 'attendance':
      return 'Attendance update';
    case 'class_join_approved':
      return 'Class join approved';
    case 'class_join_rejected':
      return 'Class join declined';
    case 'coordinator_feedback':
      return 'Message from coordinator';
    case 'deadline_reminder':
      return 'Deadline reminder';
    case 'incomplete_requirements':
      return 'Missing requirements';
    case 'attendance_error':
      return 'Attendance issue';
    case 'absence':
      return 'Absence recorded';
    default:
      return 'Notification';
  }
}
