# OJTrack Implementation Walkthrough

I have implemented the core infrastructure and initial features for the **OJTrack** internship monitoring system.

## Changes Overview

### 1. Firebase Backend
- **Security Rules**: Implemented `firestore.rules` and `storage.rules` that strictly enforce user roles (Coordinator vs. Student).
- **Data Schema**: Defined all required collections (`users`, `students`, `attendance_logs`, `htes`, etc.) within the TypeScript and Dart models.

### 2. Coordinator Dashboard (React)
- **Authentication**: Added a secure login screen that validates user roles before granting access.
- **Modern UI**: Built a responsive sidebar-based layout with modules for Class Management, Attendance Monitoring, and SIPP reporting.
- **State Management**: Integrated `onAuthStateChanged` to handle persistent login sessions.

### 3. Student App (Flutter)
- **Auth Gate**: A seamless flow that switches between the Login screen and Home based on Firebase Auth state.
- **Attendance Module**:
    - Real-time camera integration (Front-camera default for selfies).
    - Integrated with Firebase Storage for photo uploads.
    - Automated Firestore logging for Time-In/Time-Out.
- **Dashboard**: Professional Material 3 UI showing internship progress and quick action cards.

## How to Test

### Coordinator Dashboard
1. Navigate to the `web/` directory.
2. Run `npm run dev`.
3. The login screen will appear. You will need to create a user in your Firebase console with the `role: "coordinator"` in the `users` collection to log in.

### Student App
1. Run the app on an Android emulator or device.
2. Log in with a student account.
3. Tap "Attendance" to test the camera capture and Firestore logging.

> [!NOTE]
> **Next Steps**:
> - Implement the **Class Management** CRUD in the Coordinator dashboard.
> - Build the **Report Submission** flow for students.
> - Configure the **Public Evaluation Form** for HTE supervisors.
