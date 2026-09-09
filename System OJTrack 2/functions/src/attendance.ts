import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from './lib/admin';
import { createNotification, getClassContextForStudent, getStudentDisplayName, resolveExpectedTimeIn } from './lib/helpers';

/** Shifts longer than this are treated as a bad time-in/time-out pairing rather than real hours. */
const MAX_SHIFT_HOURS = 16;

const ATTENDANCE_TIME_ZONE = 'Asia/Manila';

/**
 * True if [actual] is more than [thresholdMinutes] past [expectedTimeIn]
 * ("HH:mm", the assigned HTE's start time), compared in Asia/Manila local
 * time regardless of what timezone the device that captured the photo was
 * set to. Returns false (never late) if there's no expected time to compare
 * against — an HTE the coordinator hasn't set a schedule for just doesn't
 * get lateness tracked, rather than defaulting to some arbitrary hour.
 */
function isLate(actual: Date, expectedTimeIn: string | undefined, thresholdMinutes: number): boolean {
  if (!expectedTimeIn) return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(expectedTimeIn);
  if (!match) return false;
  const expectedMinutes = Number(match[1]) * 60 + Number(match[2]);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(actual);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const actualMinutes = hour * 60 + minute;

  return actualMinutes > expectedMinutes + thresholdMinutes;
}

/**
 * Pairs a time_out log with its time_in and computes the shift length, but
 * does NOT yet credit it to students/{studentId}.renderedHours — hours only
 * count once a coordinator verifies the log (see onAttendanceLogStatusChanged
 * below). This keeps an intern's compliance % from moving until someone has
 * actually reviewed the log; a flagged log never counts at all.
 */
export const onAttendanceLogCreated = onDocumentCreated('attendance_logs/{logId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const log = snap.data();

  const studentId = log.studentId as string | undefined;
  if (!studentId) return;

  if (log.type === 'time_in') {
    const timeIn: Date | undefined = log.timestamp?.toDate?.();
    let late = false;
    if (timeIn) {
      const [expectedTimeIn, settingsSnap] = await Promise.all([
        resolveExpectedTimeIn(studentId),
        db.collection('settings').doc('global').get(),
      ]);
      const thresholdMinutes = (settingsSnap.data()?.lateThresholdMinutes as number) ?? 15;
      late = isLate(timeIn, expectedTimeIn, thresholdMinutes);
      await snap.ref.update({ late });
    }

    const context = await getClassContextForStudent(studentId);
    if (context) {
      const name = await getStudentDisplayName(studentId);
      await createNotification({
        recipientId: context.coordinatorId,
        type: 'attendance',
        message: `${name} clocked in for OJT${late ? ' (late)' : ''}.`,
        classId: context.classId,
        studentId,
      });
    }
    return;
  }

  if (log.type !== 'time_out') return;

  const timeOut: Date | undefined = log.timestamp?.toDate?.();
  if (!timeOut) return;

  const candidates = await db
    .collection('attendance_logs')
    .where('studentId', '==', studentId)
    .where('type', '==', 'time_in')
    .where('paired', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  const timeInDoc = candidates.docs.find((doc) => {
    const t: Date | undefined = doc.data().timestamp?.toDate?.();
    return t !== undefined && t.getTime() < timeOut.getTime();
  });

  if (!timeInDoc) {
    await snap.ref.update({ paired: false, pairingError: 'no_matching_time_in' });
    const context = await getClassContextForStudent(studentId);
    if (context) {
      const name = await getStudentDisplayName(studentId);
      await createNotification({
        recipientId: context.coordinatorId,
        type: 'attendance_error',
        message: `${name}'s time-out log has no matching time-in and was not counted toward their hours.`,
        classId: context.classId,
        studentId,
      });
    }
    return;
  }

  const timeIn: Date = timeInDoc.data().timestamp.toDate();
  const hours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

  if (hours <= 0 || hours > MAX_SHIFT_HOURS) {
    await snap.ref.update({ paired: false, pairingError: 'implausible_duration' });
    logger.warn(`Skipped implausible attendance duration for ${studentId}: ${hours}h`);
    return;
  }

  const roundedHours = Math.round(hours * 100) / 100;

  await db.runTransaction(async (tx) => {
    tx.update(timeInDoc.ref, { paired: true, pairedWithLogId: snap.id });
    tx.update(snap.ref, { paired: true, pairedWithLogId: timeInDoc.id, computedHours: roundedHours });
  });

  const context = await getClassContextForStudent(studentId);
  if (context) {
    const name = await getStudentDisplayName(studentId);
    await createNotification({
      recipientId: context.coordinatorId,
      type: 'attendance',
      message: `${name} clocked out — ${roundedHours} hour${roundedHours === 1 ? '' : 's'} awaiting verification.`,
      classId: context.classId,
      studentId,
    });
  }
});

/**
 * Credits a verified time_out log's hours to students/{studentId}.renderedHours
 * — the only place hours are ever added — then notifies the student either
 * way. A flagged log is never credited. Guarded to the exact pending→verified
 * transition so re-saving an already-verified log can't double-count.
 */
export const onAttendanceLogStatusChanged = onDocumentUpdated('attendance_logs/{logId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  if (after.status !== 'verified' && after.status !== 'flagged') return;

  if (
    after.status === 'verified' &&
    before.status === 'pending' &&
    after.type === 'time_out' &&
    typeof after.computedHours === 'number' &&
    after.computedHours > 0
  ) {
    await db.runTransaction(async (tx) => {
      const studentRef = db.collection('students').doc(after.studentId as string);
      const studentSnap = await tx.get(studentRef);
      const currentHours = (studentSnap.data()?.renderedHours as number) || 0;
      tx.update(studentRef, { renderedHours: currentHours + (after.computedHours as number) });
    });
  }

  const action = after.type === 'time_in' ? 'time-in' : 'time-out';
  await createNotification({
    recipientId: after.studentId,
    type: after.status === 'flagged' ? 'attendance_flagged' : 'attendance_verified',
    message:
      after.status === 'flagged'
        ? `A ${action} log was flagged for review by your coordinator.`
        : `Your ${action} log was verified by your coordinator.`,
  });
});

/**
 * Runs on weekday evenings (Asia/Manila). For each actively-enrolled student:
 * a day with no time_in resets nothing but bumps both the lifetime
 * absenceCount and a running consecutiveAbsenceDays streak; a day WITH a
 * time_in resets the streak to 0. The coordinator is only notified once the
 * streak reaches settings/global's absenceAlertThresholdDays (default 2) —
 * not on every single absent day — so a one-off miss doesn't page anyone.
 */
export const dailyAbsenceCheck = onSchedule(
  { schedule: 'every day 20:00', timeZone: 'Asia/Manila' },
  async () => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return; // skip weekends

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const settingsSnap = await db.collection('settings').doc('global').get();
    const thresholdDays = (settingsSnap.data()?.absenceAlertThresholdDays as number) || 2;

    const studentsSnap = await db.collection('students').where('classId', '!=', '').get();

    for (const studentDoc of studentsSnap.docs) {
      const studentId = studentDoc.id;
      const logsToday = await db
        .collection('attendance_logs')
        .where('studentId', '==', studentId)
        .where('type', '==', 'time_in')
        .where('timestamp', '>=', startOfDay)
        .limit(1)
        .get();

      const previousStreak = (studentDoc.data().consecutiveAbsenceDays as number) || 0;

      if (!logsToday.empty) {
        if (previousStreak > 0) {
          await studentDoc.ref.update({ consecutiveAbsenceDays: 0 });
        }
        continue;
      }

      const newStreak = previousStreak + 1;
      await studentDoc.ref.update({
        absenceCount: ((studentDoc.data().absenceCount as number) || 0) + 1,
        consecutiveAbsenceDays: newStreak,
      });

      if (newStreak < thresholdDays) continue;

      const context = await getClassContextForStudent(studentId);
      const name = await getStudentDisplayName(studentId);
      if (context) {
        await createNotification({
          recipientId: context.coordinatorId,
          type: 'absence',
          message: `${name} has had no attendance recorded for ${newStreak} consecutive day${newStreak === 1 ? '' : 's'}.`,
          classId: context.classId,
          studentId,
        });
      }
    }

    // Incomplete requirements — a student with no approved MOA on file
    // (the one document CHED/the school actually requires before an
    // internship placement is valid). Re-checked daily alongside absences,
    // but only re-notified once a week per student so this doesn't spam the
    // coordinator every evening for the same outstanding document.
    const INCOMPLETE_DOCS_RENOTIFY_DAYS = 7;
    for (const studentDoc of studentsSnap.docs) {
      const studentId = studentDoc.id;
      const lastAlert = studentDoc.data().lastIncompleteDocsAlertAt as string | undefined;
      if (lastAlert) {
        const daysSince = (now.getTime() - new Date(lastAlert).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < INCOMPLETE_DOCS_RENOTIFY_DAYS) continue;
      }

      const approvedMoaSnap = await db
        .collection('pre_ojt_documents')
        .where('studentId', '==', studentId)
        .where('docType', '==', 'MOA')
        .where('status', '==', 'approved')
        .limit(1)
        .get();
      if (!approvedMoaSnap.empty) continue;

      const context = await getClassContextForStudent(studentId);
      if (!context) continue;

      const name = await getStudentDisplayName(studentId);
      await studentDoc.ref.update({ lastIncompleteDocsAlertAt: now.toISOString() });
      await createNotification({
        recipientId: context.coordinatorId,
        type: 'incomplete_requirements',
        message: `${name} still has no approved MOA on file.`,
        classId: context.classId,
        studentId,
      });
    }
  },
);

/**
 * Runs Friday evenings (Asia/Manila). Reminds a student if they haven't
 * submitted a weekly report since the start of the current week (Monday) —
 * the "deadline reminders" the mobile app's notification module promises,
 * distinct from dailyAbsenceCheck above which alerts the coordinator, not
 * the student.
 */
export const weeklyReportReminder = onSchedule(
  { schedule: 'every friday 18:00', timeZone: 'Asia/Manila' },
  async () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const studentsSnap = await db.collection('students').where('classId', '!=', '').get();

    for (const studentDoc of studentsSnap.docs) {
      const studentId = studentDoc.id;
      const weeklyReportsSnap = await db
        .collection('reports')
        .where('studentId', '==', studentId)
        .where('type', '==', 'weekly')
        .where('submittedAt', '>=', startOfWeek)
        .limit(1)
        .get();
      if (!weeklyReportsSnap.empty) continue;

      await createNotification({
        recipientId: studentId,
        type: 'deadline_reminder',
        message: "You haven't submitted a weekly accomplishment report yet this week.",
      });
    }
  },
);
