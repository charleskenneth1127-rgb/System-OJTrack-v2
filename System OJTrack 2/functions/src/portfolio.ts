import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { createNotification, getClassContextForStudent, getStudentDisplayName } from './lib/helpers';

/** Notifies the coordinator when a student uploads a portfolio item. */
export const onPortfolioItemCreated = onDocumentCreated('portfolio_items/{itemId}', async (event) => {
  const item = event.data?.data();
  if (!item?.studentId) return;

  const context = await getClassContextForStudent(item.studentId);
  if (!context) return;

  const name = await getStudentDisplayName(item.studentId);
  await createNotification({
    recipientId: context.coordinatorId,
    type: 'portfolio',
    message: `${name} added "${item.title}" to their portfolio.`,
    classId: context.classId,
    studentId: item.studentId,
  });
});

/** Notifies the student once their coordinator reviews a portfolio item. */
export const onPortfolioItemStatusChanged = onDocumentUpdated('portfolio_items/{itemId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  if (after.status !== 'approved' && after.status !== 'rejected') return;

  const note = after.coordinatorNote ? ` ${after.coordinatorNote}` : '';
  await createNotification({
    recipientId: after.studentId,
    type: 'portfolio_review',
    message:
      after.status === 'approved'
        ? `Your portfolio item "${after.title}" was approved.`
        : `Your portfolio item "${after.title}" needs revision.${note}`,
  });
});
