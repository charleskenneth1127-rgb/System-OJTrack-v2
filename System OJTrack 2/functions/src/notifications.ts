import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { db, messaging } from './lib/admin';

/**
 * Delivers a push notification whenever a notifications/{id} document is
 * created, using the FCM token the recipient's client registered on their
 * users/{uid} doc (see mobile/lib/utils/push_notifications.dart and
 * web/src/push.ts). Silently no-ops if the recipient has no token yet.
 */
export const onNotificationCreatedSendPush = onDocumentCreated('notifications/{notificationId}', async (event) => {
  const notification = event.data?.data();
  if (!notification?.recipientId) return;

  const userSnap = await db.collection('users').doc(notification.recipientId).get();
  const token = userSnap.data()?.fcmToken as string | undefined;
  if (!token) return;

  try {
    await messaging.send({
      token,
      notification: {
        title: 'OJTrack',
        body: notification.message,
      },
      data: {
        type: notification.type || 'general',
      },
    });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    logger.warn(`Push send failed for recipient ${notification.recipientId}: ${code}`);
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      await db.collection('users').doc(notification.recipientId).update({ fcmToken: null });
    }
  }
});
