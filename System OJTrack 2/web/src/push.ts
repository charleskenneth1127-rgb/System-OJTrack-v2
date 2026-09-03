import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { app, db } from './firebase'

/**
 * Requests notification permission and saves this browser's FCM token onto
 * the signed-in coordinator's user document (read by the
 * onNotificationCreatedSendPush Cloud Function). No-ops quietly if push
 * isn't supported (e.g. demo mode, unsupported browser) or permission is
 * denied.
 */
export async function registerPushNotifications(uid: string) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })

    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token })
    }

    onMessage(messaging, (payload) => {
      const body = payload.notification?.body
      if (body && Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'OJTrack', { body })
      }
    })
  } catch (error) {
    console.warn('Push notification setup failed:', error)
  }
}
