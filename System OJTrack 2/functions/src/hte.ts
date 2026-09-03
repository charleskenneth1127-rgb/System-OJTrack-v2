import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from './lib/admin';
import { createNotification, getClassContextForStudent, getStudentDisplayName } from './lib/helpers';

/**
 * When the public evaluation form (web/src/components/HteEvaluationForm.tsx)
 * submits a hte_evaluations doc, this marks the originating link as used —
 * the public client can't write hte_evaluation_links directly (coordinator-only
 * per firestore.rules) — and notifies the coordinator.
 */
export const onHteEvaluationCreated = onDocumentCreated('hte_evaluations/{evalId}', async (event) => {
  const evaluation = event.data?.data();
  if (!evaluation?.studentId) return;

  const token = evaluation.submittedByLinkToken as string | undefined;
  if (token) {
    const linkSnap = await db.collection('hte_evaluation_links').where('token', '==', token).limit(1).get();
    if (!linkSnap.empty) {
      await linkSnap.docs[0].ref.update({ submitted: true });
    }
  }

  const context = await getClassContextForStudent(evaluation.studentId);
  if (context) {
    const name = await getStudentDisplayName(evaluation.studentId);
    await createNotification({
      recipientId: context.coordinatorId,
      type: 'hte_evaluation',
      message: `The HTE supervisor evaluation for ${name} has been submitted.`,
      classId: context.classId,
      studentId: evaluation.studentId,
    });
  }
});
