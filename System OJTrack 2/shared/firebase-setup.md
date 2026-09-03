# OJTrack Firebase setup

## Collections
- users/{userId}: role, email, displayName, createdAt, studentIdCode?, mustChangePassword?, contactEmail?, fcmToken?
- classes/{classId}: name, coordinatorId, schoolYear, term, requiredHours, joinCode
- students/{studentId}: userId, classId, assignedHteId, requiredHours, renderedHours, absenceCount?, completionStatus ('in_progress' | 'completed'), completedAt?, lastHoursCorrection?
  - Doc ID == the student's Firebase Auth UID (same as users/{userId}).
- class_join_requests/{studentUid}: classId, joinCode, studentUid, studentName, studentEmail, status ('pending' | 'approved' | 'rejected'), requestedAt, respondedAt?, respondedBy?
  - Doc ID == the requesting student's UID — one outstanding request per student. Created by a self-registered student entering a class's join code; approving a request creates the matching students/{studentUid} doc.
- htes/{hteId}: name, address, supervisorName, supervisorEmail, supervisorPhone, createdAt
- attendance_logs/{attendanceId}: studentId, timestamp, type, photoUrl, status
- pre_ojt_documents/{documentId}: studentId, docType, fileUrl, status, comments
- reports/{reportId}: studentId, type, content, fileUrl, submittedAt, status
- portfolio_items/{portfolioId}: studentId, fileUrl, title, uploadedAt
- hte_evaluation_links/{linkId}: studentId, token, expiresAt, submitted
- hte_evaluations/{evaluationId}: studentId, submittedByLinkToken, scores, comments, submittedAt
- notifications/{notificationId}: recipientId, type, message, read, createdAt

## Security rules summary
- coordinators and admins can read/write records in their scope.
- students can read/write only their own records.
- students self-register (create their own users/{uid} doc) but cannot set their own role to anything other than 'student', and cannot change role afterward.
- students can create a class_join_requests/{ownUid} doc only if the joinCode matches the referenced class; only coordinators can approve/reject (update) a request.
- public evaluation submissions can write only to hte_evaluations using a valid, unexpired token.
