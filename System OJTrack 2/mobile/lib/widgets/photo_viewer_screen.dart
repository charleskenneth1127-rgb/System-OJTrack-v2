import 'package:flutter/material.dart';

/// Full-screen view of a single network photo, opened by tapping a profile
/// avatar. Pinch-to-zoom via [InteractiveViewer] since a profile photo is
/// otherwise shown too small (a bottom-nav-sized avatar) to make out detail.
class PhotoViewerScreen extends StatelessWidget {
  final String photoUrl;

  const PhotoViewerScreen({super.key, required this.photoUrl});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 1,
          maxScale: 4,
          child: Image.network(
            photoUrl,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => const Icon(
              Icons.broken_image_outlined,
              color: Colors.white54,
              size: 48,
            ),
          ),
        ),
      ),
    );
  }
}
