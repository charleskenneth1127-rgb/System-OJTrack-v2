import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { createNotification, getClassContextForStudent, getStudentDisplayName } from './lib/helpers';

/** Notifies the coordinator when a student submits a new report. */
export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const report = event.data?.data();
  if (!report?.studentId) return;

  const context = await getClassContextForStudent(report.studentId);
  if (!context) return;

  const name = await getStudentDisplayName(report.studentId);
  await createNotification({
    recipientId: context.coordinatorId,
    type: 'report',
    message: `${name} submitted a ${report.type} report.`,
    classId: context.classId,
    studentId: report.studentId,
  });
});

/** Notifies the student once their coordinator approves or rejects a report. */
export const onReportStatusChanged = onDocumentUpdated('reports/{reportId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  if (after.status !== 'approved' && after.status !== 'rejected') return;

  await createNotification({
    recipientId: after.studentId,
    type: 'report_review',
    message: `Your ${after.type} report was ${after.status}.`,
  });
});
