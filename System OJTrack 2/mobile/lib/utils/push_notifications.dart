import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Attached to MaterialApp so a foreground push notification can surface a
/// snackbar without needing a BuildContext from wherever it arrives.
final rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// This is called again every time StudentHomePage mounts (i.e. on every
/// login within the same app process, not just once) — guards
/// [FirebaseMessaging.onTokenRefresh]/[FirebaseMessaging.onMessage] so a
/// student logging out and back in doesn't stack up duplicate listeners,
/// which would otherwise show each foreground notification's snackbar twice.
bool _listenersAttached = false;

/// Requests notification permission, saves this device's FCM token onto the
/// signed-in student's user document (read by the onNotificationCreatedSendPush
/// Cloud Function), and shows a snackbar for notifications that arrive while
/// the app is open.
Future<void> registerPushNotifications(String uid) async {
  final messaging = FirebaseMessaging.instance;

  try {
    await messaging.requestPermission();

    final token = await messaging.getToken();
    if (token != null) {
      await FirebaseFirestore.instance.collection('users').doc(uid).update({'fcmToken': token});
    }

    if (_listenersAttached) return;
    _listenersAttached = true;

    messaging.onTokenRefresh.listen((newToken) {
      // Reads the currently signed-in user rather than closing over [uid] —
      // this listener is only ever attached once per app session, so by the
      // time it fires a different student may have since logged in.
      final currentUid = FirebaseAuth.instance.currentUser?.uid;
      if (currentUid != null) {
        FirebaseFirestore.instance.collection('users').doc(currentUid).update({'fcmToken': newToken});
      }
    });

    FirebaseMessaging.onMessage.listen((message) {
      final body = message.notification?.body;
      if (body == null) return;
      rootScaffoldMessengerKey.currentState?.showSnackBar(SnackBar(content: Text(body)));
    });
  } catch (e) {
    debugPrint('Push notification setup failed: $e');
  }
}
