// Exercises the offline-signin path, which is the one flow that doesn't
// require Firebase.initializeApp() to have run — everything else in main.dart
// hits FirebaseAuth/Firestore directly and needs a real or emulated backend.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('offline sign-in reaches the student home screen', (WidgetTester tester) async {
    await tester.pumpWidget(const OJTrackStudentApp(firebaseAvailable: false));

    expect(find.text('OJTrack'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'Jane Dela Cruz');
    await tester.tap(find.text('START OFFLINE'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Jane Dela Cruz'), findsOneWidget);
  });
}
