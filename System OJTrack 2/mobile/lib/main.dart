import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/join_class_screen.dart';
import 'screens/change_password_screen.dart';
import 'screens/attendance_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/documents_screen.dart';
import 'screens/portfolio_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/profile_screen.dart';
import 'theme/ndmu_theme.dart';
import 'utils/platform_target.dart';
import 'utils/push_notifications.dart';

// "demo-ojtrack" matches .firebaserc and is intentional: the Firebase
// Emulator Suite treats any project ID prefixed "demo-" as offline/local-only
// — no real GCP project, billing, or `firebase login` required. Fine for
// capstone use; replace with real values only for an eventual school
// turnover deployment (and pair with real google-services.json /
// GoogleService-Info.plist files from `flutterfire configure`).
//
// Android and iOS each get their own FirebaseOptions because the Firebase
// SDKs expect an `appId` whose embedded platform segment
// (":android:"/":ios:") matches the runtime platform; sharing one object
// across both is a common mistake when hand-rolling this instead of using
// `flutterfire configure`.
const FirebaseOptions _androidFirebaseOptions = FirebaseOptions(
  apiKey: 'demo-api-key',
  appId: '1:000000000000:android:demo',
  messagingSenderId: '000000000000',
  projectId: 'demo-ojtrack',
  storageBucket: 'demo-ojtrack.appspot.com',
);

const FirebaseOptions _iosFirebaseOptions = FirebaseOptions(
  apiKey: 'demo-api-key',
  appId: '1:000000000000:ios:demo',
  messagingSenderId: '000000000000',
  projectId: 'demo-ojtrack',
  storageBucket: 'demo-ojtrack.appspot.com',
  // Must match PRODUCT_BUNDLE_IDENTIFIER in ios/Runner.xcodeproj.
  iosBundleId: 'com.example.mobile',
);

// Lets the same student module run in a desktop browser too (Chrome/Edge)
// for quick previewing without an emulator — matches the appId/authDomain
// pattern the coordinator web app already uses (web/src/firebase.ts).
const FirebaseOptions _webFirebaseOptions = FirebaseOptions(
  apiKey: 'demo-api-key',
  appId: '1:000000000000:web:demo',
  messagingSenderId: '000000000000',
  projectId: 'demo-ojtrack',
  storageBucket: 'demo-ojtrack.appspot.com',
  authDomain: 'demo-ojtrack.firebaseapp.com',
);

FirebaseOptions get _firebaseOptions {
  if (kIsWeb) return _webFirebaseOptions;
  return isIOSPlatform ? _iosFirebaseOptions : _androidFirebaseOptions;
}

Future<bool> _initializeFirebase() async {
  try {
    await Firebase.initializeApp(options: _firebaseOptions);
    if (kDebugMode) {
      // Android emulator reaches the host machine's localhost via the special
      // alias 10.0.2.2 — but that alias only resolves inside the Android
      // Studio virtual emulator, not on a real physical phone. A real device
      // needs the host machine's actual LAN IP instead (phone and computer
      // on the same Wi-Fi), which isn't knowable at compile time, so it's
      // passed in explicitly:
      //   flutter run --dart-define=EMULATOR_HOST=192.168.1.23 -d <deviceId>
      // The iOS Simulator and a desktop browser both share the host's
      // network directly, so `localhost` reaches the emulator suite for them
      // regardless. Run `firebase emulators:start` from the repo root before
      // `flutter run`.
      const overrideHost = String.fromEnvironment('EMULATOR_HOST');
      final host = overrideHost.isNotEmpty ? overrideHost : ((kIsWeb || isIOSPlatform) ? 'localhost' : '10.0.2.2');
      await FirebaseAuth.instance.useAuthEmulator(host, 9099);
      FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
      await FirebaseStorage.instance.useStorageEmulator(host, 9199);
    }
    return true;
  } catch (e, stack) {
    debugPrint('Firebase initialization failed: $e');
    debugPrint('Ensure the Firebase Emulator Suite is running (firebase emulators:start).');
    debugPrint(stack.toString());
    return false;
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final firebaseAvailable = await _initializeFirebase();
  runApp(OJTrackStudentApp(firebaseAvailable: firebaseAvailable));
}

class OJTrackStudentApp extends StatelessWidget {
  final bool firebaseAvailable;

  const OJTrackStudentApp({super.key, required this.firebaseAvailable});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OJTrack Student',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      theme: buildNdmuTheme(),
      home: AuthGate(firebaseAvailable: firebaseAvailable),
    );
  }
}

class AuthGate extends StatefulWidget {
  final bool firebaseAvailable;

  const AuthGate({super.key, required this.firebaseAvailable});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? _displayName;
  bool _showSignUp = false;

  Future<void> _handleLogout() async {
    await FirebaseAuth.instance.signOut();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.firebaseAvailable) {
      if (_displayName != null) {
        return StudentHomePage(
          demoMode: true,
          displayName: _displayName!,
          firebaseAvailable: false,
          onExitDemo: () => setState(() => _displayName = null),
        );
      }
      return LoginScreen(
        offlineMode: true,
        onOfflineSignIn: (name) {
          setState(() {
            _displayName = name.isNotEmpty ? name : 'Intern';
          });
        },
      );
    }

    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasData) {
          final user = snapshot.data!;
          return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
            stream: FirebaseFirestore.instance.collection('users').doc(user.uid).snapshots(),
            builder: (context, userDocSnapshot) {
              if (userDocSnapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              }
              final data = userDocSnapshot.data?.data();
              final mustChangePassword = data?['mustChangePassword'] == true;
              if (mustChangePassword) {
                return const ChangePasswordScreen();
              }
              return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
                stream: FirebaseFirestore.instance.collection('students').doc(user.uid).snapshots(),
                builder: (context, studentDocSnapshot) {
                  if (studentDocSnapshot.connectionState == ConnectionState.waiting) {
                    return const Scaffold(
                      body: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (studentDocSnapshot.data?.exists != true) {
                    return JoinClassScreen(onLogout: _handleLogout);
                  }
                  final displayName = (data?['displayName'] as String?) ?? user.displayName ?? 'Intern';
                  return StudentHomePage(
                    demoMode: false,
                    displayName: displayName,
                  );
                },
              );
            },
          );
        }
        if (_showSignUp) {
          return SignUpScreen(onBackToLogin: () => setState(() => _showSignUp = false));
        }
        return LoginScreen(
          onCreateAccount: () => setState(() => _showSignUp = true),
        );
      },
    );
  }
}

class StudentHomePage extends StatefulWidget {
  final bool demoMode;
  final String displayName;
  final VoidCallback? onExitDemo;
  // False only for the true-offline fallback (Firebase.initializeApp() itself
  // failed) — the Attendance/Reports/Documents/Portfolio tabs all talk to
  // Firestore directly and would otherwise crash with core/no-app the moment
  // they're built.
  final bool firebaseAvailable;

  const StudentHomePage({
    super.key,
    required this.demoMode,
    required this.displayName,
    this.onExitDemo,
    this.firebaseAvailable = true,
  });

  @override
  State<StudentHomePage> createState() => _StudentHomePageState();
}

class _StudentHomePageState extends State<StudentHomePage> {
  int _selectedIndex = 0;
  int _compliancePercent = 0;
  int _hoursLogged = 0;
  int _targetHours = 600;
  bool _loadingMetrics = true;
  int _unreadCount = 0;
  String? _hteName;
  String? _hteSupervisorName;
  String? _lastAssignedHteId;

  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _studentSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _hteSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _notificationsSub;

  @override
  void initState() {
    super.initState();
    _listenToDashboardMetrics();
    if (!widget.demoMode) {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid != null) {
        registerPushNotifications(uid);
      }
    }
  }

  @override
  void dispose() {
    _studentSub?.cancel();
    _hteSub?.cancel();
    _notificationsSub?.cancel();
    super.dispose();
  }

  /// Live-listens (rather than one-shot fetching) so coordinator actions on
  /// the web portal — hour corrections, attendance-computed hours,
  /// completion status — reflect on this dashboard immediately.
  void _listenToDashboardMetrics() {
    if (widget.demoMode) {
      setState(() {
        _targetHours = 480;
        _hoursLogged = 312;
        _compliancePercent = 65;
        _loadingMetrics = false;
        _hteName = 'Accenture Philippines';
        _hteSupervisorName = 'Engr. Renan Cruz';
        _unreadCount = 3;
      });
      return;
    }

    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      setState(() => _loadingMetrics = false);
      return;
    }

    final db = FirebaseFirestore.instance;

    _studentSub = db.collection('students').doc(currentUser.uid).snapshots().listen((doc) {
      final data = doc.data();
      if (data == null || !mounted) return;
      final requiredHours = (data['requiredHours'] as num?)?.toInt() ?? 600;
      final renderedHours = (data['renderedHours'] as num?)?.toInt() ?? 0;
      final assignedHteId = data['assignedHteId'] as String?;
      setState(() {
        _targetHours = requiredHours;
        _hoursLogged = renderedHours;
        _compliancePercent = _targetHours > 0 ? min(100, (_hoursLogged * 100 ~/ _targetHours)) : 0;
        _loadingMetrics = false;
      });

      // Re-subscribe to the assigned HTE only when it actually changes, so a
      // coordinator's later hour corrections don't churn this listener.
      if (assignedHteId != _lastAssignedHteId) {
        _lastAssignedHteId = assignedHteId;
        _hteSub?.cancel();
        if (assignedHteId == null || assignedHteId.isEmpty) {
          setState(() {
            _hteName = null;
            _hteSupervisorName = null;
          });
        } else {
          _hteSub = db.collection('htes').doc(assignedHteId).snapshots().listen((hteDoc) {
            if (!mounted) return;
            final hteData = hteDoc.data();
            setState(() {
              _hteName = hteData?['name'] as String?;
              _hteSupervisorName = hteData?['supervisorName'] as String?;
            });
          }, onError: (Object e) => debugPrint('HTE listener failed: $e'));
        }
      }
    }, onError: (Object e) => debugPrint('Student listener failed: $e'));

    _notificationsSub = db
        .collection('notifications')
        .where('recipientId', isEqualTo: currentUser.uid)
        .snapshots()
        .listen((snap) {
      if (!mounted) return;
      setState(() {
        _unreadCount = snap.docs.where((d) => d.data()['read'] != true).length;
      });
    }, onError: (Object e) => debugPrint('Notifications listener failed: $e'));
  }

  static const List<String> _tabLabels = ['Home', 'Attendance', 'Reports', 'Documents', 'Portfolio'];

  /// Attendance/Reports/Documents/Portfolio all talk to Firestore directly,
  /// so in true offline mode (no Firebase app at all) they're swapped for a
  /// placeholder instead of crashing the moment they're built.
  Widget _tabContent(int index) {
    if (!widget.firebaseAvailable) {
      return _OfflineFeaturePlaceholder(featureName: _tabLabels[index]);
    }
    switch (index) {
      case 1:
        return const AttendanceScreen();
      case 2:
        return const ReportsScreen();
      case 3:
        return const DocumentsScreen();
      case 4:
        return const PortfolioScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  void _navigateTo(int index) {
    if (index < 1 || index > 4) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _tabContent(index)),
    );
  }

  /// Selects [index]. On the phone layout this also pushes the matching
  /// full-screen page (the tab set only lives in the bottom nav there); on
  /// the desktop layout the sidebar's IndexedStack already shows every tab,
  /// so selecting is enough.
  void _openTab(int index, {required bool isWide}) {
    setState(() => _selectedIndex = index);
    if (!isWide) _navigateTo(index);
  }

  void _onNavTap(int index) => _openTab(index, isWide: false);

  void _openProfile(BuildContext context) => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ProfileScreen()),
      );

  void _logout() {
    if (widget.demoMode && widget.onExitDemo != null) {
      widget.onExitDemo!();
    } else {
      FirebaseAuth.instance.signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    // A phone browser's viewport is already phone-width, so this threshold
    // only ever kicks in on an actual desktop-sized window — the phone
    // layout below is completely untouched either way.
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 700) return _buildDesktopShell(context);
        return _buildPhoneShell(context);
      },
    );
  }

  Widget _buildPhoneShell(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OJTrack'),
        actions: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                tooltip: 'Notifications',
                onPressed: widget.demoMode
                    ? null
                    : () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      _unreadCount > 9 ? '9+' : '$_unreadCount',
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          if (!widget.demoMode)
            IconButton(
              icon: const Icon(Icons.person_outline),
              tooltip: 'Profile',
              onPressed: () => _openProfile(context),
            ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: _buildDashboardChildren(context, isWide: false),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: _onNavTap,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.login),
              selectedIcon: Icon(Icons.login),
              label: 'Attendance',
            ),
            NavigationDestination(
              icon: Icon(Icons.description_outlined),
              selectedIcon: Icon(Icons.description),
              label: 'Reports',
            ),
            NavigationDestination(
              icon: Icon(Icons.folder_open_outlined),
              selectedIcon: Icon(Icons.folder_open),
              label: 'Documents',
            ),
            NavigationDestination(
              icon: Icon(Icons.star_outline),
              selectedIcon: Icon(Icons.star),
              label: 'Portfolio',
            ),
          ],
        ),
      ),
    );
  }

  /// Desktop/web layout: a persistent sidebar (matching the coordinator
  /// portal's look) next to the active tab's content, instead of a phone UI
  /// stretched or letterboxed across a wide window.
  Widget _buildDesktopShell(BuildContext context) {
    return Scaffold(
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _DesktopSidebar(
            displayName: widget.displayName,
            selectedIndex: _selectedIndex,
            onSelect: (index) => _openTab(index, isWide: true),
            onProfile: widget.demoMode ? null : () => _openProfile(context),
            onLogout: _logout,
          ),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                _buildDesktopHomePane(context),
                _tabContent(1),
                _tabContent(2),
                _tabContent(3),
                _tabContent(4),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopHomePane(BuildContext context) {
    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1040),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _buildDashboardChildren(context, isWide: true),
            ),
          ),
        ),
      ),
    );
  }

  static const _hourTiers = [
    (80, 'On Track', NdmuColors.green),
    (50, 'Catching Up', Color(0xFFD97706)),
    (0, 'Behind', Color(0xFFDC2626)),
  ];

  (String, Color) _hourTierFor(int pct) {
    for (final tier in _hourTiers) {
      if (pct >= tier.$1) return (tier.$2, tier.$3);
    }
    return (_hourTiers.last.$2, _hourTiers.last.$3);
  }

  String _greetingForNow() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  List<Widget> _buildDashboardChildren(BuildContext context, {required bool isWide}) {
    final firstName = widget.displayName.trim().isEmpty ? 'Intern' : widget.displayName.trim().split(' ').first;
    final (tierLabel, tierColor) = _hourTierFor(_compliancePercent);
    final remainingHours = (_targetHours - _hoursLogged).clamp(0, _targetHours);

    return [
      Text(
        '${_greetingForNow()}, $firstName!',
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 4),
      Text(
        _hteName ?? (widget.demoMode ? 'Demo Mode' : 'OJT Dashboard'),
        style: TextStyle(color: Colors.grey.shade600, fontSize: 14.5),
      ),
      const SizedBox(height: 20),
      _buildHteCard(context),
      const SizedBox(height: 16),
      _buildHoursCard(context, tierLabel, tierColor, remainingHours),
      const SizedBox(height: 24),
      const Text(
        'Quick Actions',
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(
            child: _QuickActionButton(
              icon: Icons.login,
              label: 'Time In',
              color: NdmuColors.green,
              onTap: () => _openTab(1, isWide: isWide),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _QuickActionButton(
              icon: Icons.logout,
              label: 'Time Out',
              color: Colors.redAccent,
              onTap: () => _openTab(1, isWide: isWide),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _QuickActionButton(
              icon: Icons.description_outlined,
              label: 'Report',
              color: const Color(0xFFB8860B),
              onTap: () => _openTab(2, isWide: isWide),
            ),
          ),
        ],
      ),
    ];
  }

  Widget _buildHteCard(BuildContext context) {
    if (_hteName == null) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Icon(Icons.business_outlined, color: Colors.grey.shade400, size: 26),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('No HTE assigned yet', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(
                    "Your coordinator will assign your Host Training Establishment soon.",
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [NdmuColors.greenDark, NdmuColors.green],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color.fromRGBO(0, 0, 0, 0.1), blurRadius: 18, offset: Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'HOST TRAINING ESTABLISHMENT',
            style: TextStyle(color: Colors.white70, fontSize: 11, letterSpacing: 0.6, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            _hteName!,
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          if (_hteSupervisorName != null) ...[
            const SizedBox(height: 4),
            Text('$_hteSupervisorName, Supervisor', style: const TextStyle(color: Colors.white70, fontSize: 13.5)),
          ],
        ],
      ),
    );
  }

  Widget _buildHoursCard(BuildContext context, String tierLabel, Color tierColor, int remainingHours) {
    final fraction = _targetHours > 0 ? (_hoursLogged / _targetHours).clamp(0.0, 1.0) : 0.0;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: const [
          BoxShadow(color: Color.fromRGBO(0, 0, 0, 0.04), blurRadius: 16, offset: Offset(0, 8)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 112,
            height: 112,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 112,
                  height: 112,
                  child: _loadingMetrics
                      ? const CircularProgressIndicator(strokeWidth: 12)
                      : TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: fraction),
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) => CircularProgressIndicator(
                            value: value,
                            strokeWidth: 12,
                            strokeCap: StrokeCap.round,
                            backgroundColor: Colors.grey.shade200,
                            valueColor: AlwaysStoppedAnimation<Color>(tierColor),
                          ),
                        ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('$_hoursLogged', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    Text('of $_targetHours hrs', style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Hours Rendered', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text('$remainingHours hrs remaining', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _StatusChip(label: tierLabel, color: tierColor),
                    _StatusChip(label: '$_compliancePercent%', color: tierColor),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Shown in place of a tab that needs Firestore/Auth when the app is running
/// with no Firebase app at all (see [StudentHomePage.firebaseAvailable]).
class _OfflineFeaturePlaceholder extends StatelessWidget {
  final String featureName;

  const _OfflineFeaturePlaceholder({required this.featureName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(featureName)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cloud_off, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                '$featureName needs an internet connection',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Reconnect and sign in again to use this feature.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DesktopSidebar extends StatelessWidget {
  const _DesktopSidebar({
    required this.displayName,
    required this.selectedIndex,
    required this.onSelect,
    required this.onProfile,
    required this.onLogout,
  });

  final String displayName;
  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final VoidCallback? onProfile;
  final VoidCallback onLogout;

  static const _destinations = [
    (Icons.home_outlined, Icons.home, 'Home'),
    (Icons.login, Icons.login, 'Attendance'),
    (Icons.description_outlined, Icons.description, 'Reports'),
    (Icons.folder_open_outlined, Icons.folder_open, 'Documents'),
    (Icons.star_outline, Icons.star, 'Portfolio'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      color: NdmuColors.greenDark,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.school, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'OJTrack',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.only(left: 2, top: 2),
            child: Text(
              'Student Portal',
              style: TextStyle(color: Colors.white54, fontSize: 11.5, letterSpacing: 0.3),
            ),
          ),
          const SizedBox(height: 28),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 2),
            child: Text('Welcome back', style: TextStyle(color: Colors.white54, fontSize: 12)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Text(
              displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 24),
          for (var i = 0; i < _destinations.length; i++) _buildDestination(context, i),
          const Spacer(),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: 8),
          if (onProfile != null)
            TextButton.icon(
              onPressed: onProfile,
              icon: const Icon(Icons.person_outline, color: Colors.white70, size: 18),
              label: const Text('Profile', style: TextStyle(color: Colors.white70)),
              style: TextButton.styleFrom(
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              ),
            ),
          TextButton.icon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout, color: Colors.white70, size: 18),
            label: const Text('Logout', style: TextStyle(color: Colors.white70)),
            style: TextButton.styleFrom(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestination(BuildContext context, int index) {
    final selected = index == selectedIndex;
    final (outlineIcon, filledIcon, label) = _destinations[index];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Material(
        color: selected ? Colors.white24 : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => onSelect(index),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Icon(selected ? filledIcon : outlineIcon, color: Colors.white, size: 20),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha((0.14 * 255).round()),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5)),
    );
  }
}
