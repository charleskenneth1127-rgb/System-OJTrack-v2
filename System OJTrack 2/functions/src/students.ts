import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { auth, db } from './lib/admin';
import { createNotification } from './lib/helpers';

const STUDENT_ACCOUNT_DOMAIN = 'ojtrack.local';
function studentIdToEmail(studentIdCode: string) {
  const sanitized = studentIdCode.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${sanitized}@${STUDENT_ACCOUNT_DOMAIN}`;
}

/**
 * Notifies the student whenever a coordinator uses the "Edit Student Hours"
 * correction tool (see web/src/components/EditHoursModal.tsx), which writes
 * a lastHoursCorrection object onto the student's record.
 */
export const onStudentHoursCorrected = onDocumentUpdated('students/{studentId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const correction = after?.lastHoursCorrection;
  if (!correction) return;
  if (before?.lastHoursCorrection?.correctedAt === correction.correctedAt) return; // no new correction

  await createNotification({
    recipientId: event.params.studentId,
    type: 'hours_correction',
    message:
      `Your coordinator adjusted your logged hours to ${correction.newRenderedHours} ` +
      `(required: ${correction.newRequiredHours}). Reason: ${correction.reason}`,
  });
});

/**
 * Notifies the student when a coordinator confirms their internship as
 * complete from the "Final Assessment & Completion" module.
 */
export const onStudentCompleted = onDocumentUpdated('students/{studentId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.completionStatus === after.completionStatus) return;
  if (after.completionStatus !== 'completed') return;

  await createNotification({
    recipientId: event.params.studentId,
    type: 'internship_completed',
    message: 'Congratulations! Your OJT coordinator has confirmed your internship as complete.',
  });
});

/**
 * Lets a coordinator correct a student's school-issued Student ID after the
 * account already exists. Only the account owner can normally change their
 * own Firebase Auth email, so this runs with Admin privileges instead. If
 * the student hasn't logged in yet (mustChangePassword still true), the
 * temporary password is refreshed to match the corrected ID too, keeping
 * the "password = ID" first-login convention intact; otherwise their
 * chosen password is left untouched.
 */
export const updateStudentLoginId = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const callerSnap = await db.collection('users').doc(request.auth.uid).get();
  const callerRole = callerSnap.data()?.role;
  if (callerRole !== 'coordinator' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only coordinators can update a student ID.');
  }

  const { studentUid, newStudentId } = (request.data || {}) as { studentUid?: string; newStudentId?: string };
  const trimmedId = newStudentId?.trim();
  if (!studentUid || !trimmedId) {
    throw new HttpsError('invalid-argument', 'A student and a new ID are required.');
  }

  const conflictSnap = await db.collection('users').where('studentIdCode', '==', trimmedId).get();
  if (conflictSnap.docs.some((docSnap) => docSnap.id !== studentUid)) {
    throw new HttpsError('already-exists', 'This Student ID is already in use by another student.');
  }

  const studentSnap = await db.collection('users').doc(studentUid).get();
  if (!studentSnap.exists) {
    throw new HttpsError('not-found', 'Student account not found.');
  }

  const newEmail = studentIdToEmail(trimmedId);
  const stillOnDefaultPassword = studentSnap.data()?.mustChangePassword === true;

  await auth.updateUser(studentUid, stillOnDefaultPassword ? { email: newEmail, password: trimmedId } : { email: newEmail });
  await db.collection('users').doc(studentUid).update({ studentIdCode: trimmedId, email: newEmail });

  return { success: true, passwordReset: stillOnDefaultPassword };
});
