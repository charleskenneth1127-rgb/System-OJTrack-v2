import { db } from './admin';

/**
 * Looks up the coordinator and class responsible for a student via their
 * class assignment — used to address coordinator-facing notifications and to
 * tag them with a classId so the coordinator's notification bell can group
 * by class (see web/src/components/NotificationsBell.tsx).
 */
export async function getClassContextForStudent(
  studentUid: string,
): Promise<{ coordinatorId: string; classId: string } | null> {
  const studentSnap = await db.collection('students').doc(studentUid).get();
  const classId = studentSnap.data()?.classId as string | undefined;
  if (!classId) return null;

  const classSnap = await db.collection('classes').doc(classId).get();
  const coordinatorId = classSnap.data()?.coordinatorId as string | undefined;
  if (!coordinatorId) return null;

  return { coordinatorId, classId };
}

export async function getStudentDisplayName(studentUid: string): Promise<string> {
  const userSnap = await db.collection('users').doc(studentUid).get();
  return (userSnap.data()?.displayName as string) || 'A student';
}

/**
 * A student's expected time-in comes from their assigned HTE (each company
 * has one work schedule; many students share the same HTE) — not stored per
 * student, so a coordinator sets it once per company instead of once per
 * intern. Returns undefined if the student has no assigned HTE, or that HTE
 * has no expectedTimeIn set (in which case lateness just isn't tracked).
 */
export async function resolveExpectedTimeIn(studentUid: string): Promise<string | undefined> {
  const studentSnap = await db.collection('students').doc(studentUid).get();
  const hteId = studentSnap.data()?.assignedHteId as string | undefined;
  if (!hteId) return undefined;

  const hteSnap = await db.collection('htes').doc(hteId).get();
  return hteSnap.data()?.expectedTimeIn as string | undefined;
}

/**
 * createdAt is stored as an ISO string (not a Firestore serverTimestamp) to
 * match how the web/mobile clients already read and render NotificationRecord.createdAt.
 *
 * classId/studentId are only set for coordinator-facing notifications (the
 * ones the coordinator's bell groups by class) — omitted entirely rather
 * than written as `undefined`, which the Admin SDK rejects.
 */
export async function createNotification(params: {
  recipientId: string;
  type: string;
  message: string;
  classId?: string;
  studentId?: string;
}) {
  await db.collection('notifications').add({
    recipientId: params.recipientId,
    type: params.type,
    message: params.message,
    read: false,
    createdAt: new Date().toISOString(),
    ...(params.classId ? { classId: params.classId } : {}),
    ...(params.studentId ? { studentId: params.studentId } : {}),
  });
}
