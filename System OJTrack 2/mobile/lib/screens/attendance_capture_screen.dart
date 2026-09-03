import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AttendanceCaptureScreen extends StatefulWidget {
  const AttendanceCaptureScreen({super.key});

  @override
  State<AttendanceCaptureScreen> createState() => _AttendanceCaptureScreenState();
}

class _AttendanceCaptureScreenState extends State<AttendanceCaptureScreen> {
  CameraController? _controller;
  Future<void>? _initializeControllerFuture;
  bool _isCapturing = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) {
      return;
    }

    _controller = CameraController(
      cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      ),
      ResolutionPreset.medium,
    );

    _initializeControllerFuture = _controller!.initialize();
    if (mounted) setState(() {});
  }

  Widget _buildEmptyCameraState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.camera_alt_outlined, size: 72, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No camera available',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              'This device does not expose a camera for attendance capture. Please use a supported device or emulator with camera support.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _takeAttendance(String type) async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    setState(() => _isCapturing = true);

    try {
      await _initializeControllerFuture;
      final image = await _controller!.takePicture();

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // Upload to Firebase Storage
      final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final storagePath = 'attendance/${user.uid}/$fileName';
      final ref = FirebaseStorage.instance.ref().child(storagePath);

      await ref.putData(await image.readAsBytes());
      final downloadUrl = await ref.getDownloadURL();

      // Save to Firestore
      await FirebaseFirestore.instance.collection('attendance_logs').add({
        'studentId': user.uid,
        'timestamp': FieldValue.serverTimestamp(),
        'type': type,
        // Consumed by the onAttendanceLogCreated Cloud Function to find and
        // auto-pair time_in/time_out logs when computing rendered hours.
        'paired': false,
        'photoUrl': downloadUrl,
        'status': 'pending',
      });

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Successfully logged $type')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Capture Attendance')),
      body: FutureBuilder<void>(
        future: _initializeControllerFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.done) {
            if (_controller == null || !_controller!.value.isInitialized) {
              return _buildEmptyCameraState();
            }
            return Stack(
              children: [
                CameraPreview(_controller!),
                if (_isCapturing)
                  const Center(child: CircularProgressIndicator()),
                Positioned(
                  bottom: 32,
                  left: 16,
                  right: 16,
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isCapturing
                              ? null
                              : () => _takeAttendance('time_in'),
                          icon: const Icon(Icons.login, size: 18),
                          label: const Text(
                            'TIME IN',
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isCapturing
                              ? null
                              : () => _takeAttendance('time_out'),
                          icon: const Icon(Icons.logout, size: 18),
                          label: const Text(
                            'TIME OUT',
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          } else if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          return _buildEmptyCameraState();
        },
      ),
    );
  }
}
