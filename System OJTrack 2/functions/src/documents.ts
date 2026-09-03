import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { createNotification, getClassContextForStudent, getStudentDisplayName } from './lib/helpers';

/** Notifies the coordinator when a student submits a pre-OJT document. */
export const onPreOjtDocumentCreated = onDocumentCreated('pre_ojt_documents/{docId}', async (event) => {
  const document = event.data?.data();
  if (!document?.studentId) return;

  const context = await getClassContextForStudent(document.studentId);
  if (!context) return;

  const name = await getStudentDisplayName(document.studentId);
  await createNotification({
    recipientId: context.coordinatorId,
    type: 'document',
    message: `${name} submitted a ${document.docType} document for review.`,
    classId: context.classId,
    studentId: document.studentId,
  });
});

/** Notifies the student once their coordinator approves or rejects a document. */
export const onPreOjtDocumentStatusChanged = onDocumentUpdated('pre_ojt_documents/{docId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;
  if (after.status !== 'approved' && after.status !== 'rejected') return;

  await createNotification({
    recipientId: after.studentId,
    type: 'document_review',
    message: `Your ${after.docType} document was ${after.status}.`,
  });
});
