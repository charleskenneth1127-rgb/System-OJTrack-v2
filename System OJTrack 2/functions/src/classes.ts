import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from './lib/admin';
import { createNotification, getStudentDisplayName } from './lib/helpers';

/**
 * Notifies the class's coordinator whenever a student submits a join-by-code
 * request (see web/src/components/ClassRosterModal.tsx for the approval UI
 * and mobile/lib/screens/join_class_screen.dart for where this is created).
 */
export const onClassJoinRequestCreated = onDocumentCreated('class_join_requests/{studentUid}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const request = snap.data();

  const classSnap = await db.collection('classes').doc(request.classId).get();
  const classData = classSnap.data();
  if (!classData?.coordinatorId) return;

  const name = request.studentName || (await getStudentDisplayName(event.params.studentUid));
  await createNotification({
    recipientId: classData.coordinatorId,
    type: 'class_join_request',
    message: `${name} requested to join ${classData.name}.`,
    classId: request.classId,
    studentId: event.params.studentUid,
  });
});

/**
 * Notifies the student once a coordinator approves or rejects their
 * join-by-code request.
 */
export const onClassJoinRequestStatusChanged = onDocumentUpdated('class_join_requests/{studentUid}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.status === after.status) return;
  if (after.status !== 'approved' && after.status !== 'rejected') return;

  const classSnap = await db.collection('classes').doc(after.classId).get();
  const className = classSnap.data()?.name || 'the class';

  await createNotification({
    recipientId: event.params.studentUid,
    type: after.status === 'approved' ? 'class_join_approved' : 'class_join_rejected',
    message:
      after.status === 'approved'
        ? `Your request to join ${className} was approved. Welcome aboard!`
        : `Your request to join ${className} was declined.`,
  });
});
