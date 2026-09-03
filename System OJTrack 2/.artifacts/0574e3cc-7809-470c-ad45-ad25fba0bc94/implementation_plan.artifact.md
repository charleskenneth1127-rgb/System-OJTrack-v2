# OJTrack Implementation Plan

OJTrack is a student internship monitoring and portfolio management system. This plan outlines the development of the React.js coordinator dashboard, the Flutter student app, and the Firebase backend.

## User Review Required

> [!IMPORTANT]
> **Firebase Configuration**: I will set up the code structure for Firebase, but you will need to provide the actual `google-services.json` for Android and update the `firebaseConfig` in the web app with your real project details.
> **Camera Permission**: The Android app will require camera and location permissions for attendance logging.

## Proposed Changes

### 1. Firebase Foundation
- Create `firestore.rules` with the specified security model.
- Define the data model in TypeScript (Web) and Dart (Mobile).

### 2. Web Application (Coordinator Dashboard)
- **Auth**: Implement login/session management for coordinators/admins.
- **Class Management**: CRUD operations for classes.
- **Student Management**: List/Search students, assign to classes, and assign HTEs.
- **Attendance Monitoring**: View and verify student attendance logs.
- **Reports**: Review and approve student submissions.
- **Evaluation Links**: Generate secure tokens for HTE supervisors.

### 3. Mobile Application (Student App)
- **Dependencies**: Add `firebase_core`, `firebase_auth`, `cloud_firestore`, `firebase_storage`, `camera`, and `geolocator`.
- **Auth**: Student login and profile setup.
- **Attendance**: Real-time camera capture with location tagging and Firestore logging.
- **Reports/Portfolio**: File upload functionality to Cloud Storage.

### 4. Public Evaluation Form
- A lightweight React route `/evaluate/:token` for HTE supervisors to submit evaluations without logging in.

## Data Model Details
- `users`: `{ role: 'coordinator' | 'admin' | 'student', ... }`
- `classes`: `{ name, coordinator_id, ... }`
- `students`: `{ user_id, class_id, assigned_hte_id, required_hours, rendered_hours, ... }`
- `attendance_logs`: `{ student_id, type, photo_url, status, location, ... }`

## Verification Plan

### Automated Tests
- Unit tests for Firestore security rules.
- Widget tests for core Flutter components (Attendance button).

### Manual Verification
- Verify that a student's time-in appears instantly on the coordinator dashboard.
- Verify that the evaluation link expires after use.
