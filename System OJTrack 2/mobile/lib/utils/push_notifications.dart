import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Attached to MaterialApp so a foreground push notification can surface a
/// snackbar without needing a BuildContext from wherever it arrives.
final rootScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

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

    messaging.onTokenRefresh.listen((newToken) {
      FirebaseFirestore.instance.collection('users').doc(uid).update({'fcmToken': newToken});
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
