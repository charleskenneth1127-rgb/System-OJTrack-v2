import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/ndmu_theme.dart';

/// Shows a "Take photo" / "Choose from gallery" sheet and returns the picked
/// file, or null if the user backed out. Returns an [XFile] (not a
/// dart:io File) so the same code works on Android, iOS, and web — web has
/// no filesystem, so dart:io's File can't represent a picked image there.
Future<XFile?> pickAttachment(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Text('Add attachment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined, color: NdmuColors.green),
            title: const Text('Take a photo'),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: NdmuColors.green),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );

  if (source == null) return null;
  final picker = ImagePicker();
  return picker.pickImage(source: source, imageQuality: 80);
}

/// Uploads [file] to Firebase Storage under [storagePath] and returns its
/// public download URL. Uploads raw bytes (rather than `putFile`, which
/// needs a real filesystem path) so this works on web too.
Future<String> uploadAttachment(XFile file, String storagePath) async {
  final ref = FirebaseStorage.instance.ref().child(storagePath);
  await ref.putData(await file.readAsBytes());
  return ref.getDownloadURL();
}

/// A picked file's raw bytes plus the extension to upload it under —
/// covers both photos (from the camera/gallery) and real documents (from
/// the file picker), so callers don't need to care which source it came
/// from.
class PickedAttachment {
  const PickedAttachment({required this.bytes, required this.extension});

  final Uint8List bytes;
  final String extension;
}

/// Shows a "Take photo" / "Choose from gallery" / "Choose a file" sheet —
/// the file option accepts PDFs and Word documents, for real paperwork
/// (MOA, waivers) rather than just photos of paperwork. Returns null if the
/// user backed out.
Future<PickedAttachment?> pickDocumentAttachment(BuildContext context) async {
  final choice = await showModalBottomSheet<String>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Text('Add document', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ListTile(
            leading: const Icon(Icons.insert_drive_file_outlined, color: NdmuColors.green),
            title: const Text('Choose a file'),
            subtitle: const Text('PDF, Word (.doc/.docx)'),
            onTap: () => Navigator.pop(context, 'file'),
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined, color: NdmuColors.green),
            title: const Text('Take a photo'),
            onTap: () => Navigator.pop(context, 'camera'),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: NdmuColors.green),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.pop(context, 'gallery'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );

  if (choice == null) return null;

  if (choice == 'file') {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'doc', 'docx'],
      withData: true,
    );
    final picked = result?.files.single;
    final bytes = picked?.bytes;
    if (picked == null || bytes == null) return null;
    return PickedAttachment(bytes: bytes, extension: picked.extension ?? 'pdf');
  }

  final picker = ImagePicker();
  final xfile = await picker.pickImage(
    source: choice == 'camera' ? ImageSource.camera : ImageSource.gallery,
    imageQuality: 80,
  );
  if (xfile == null) return null;
  final bytes = await xfile.readAsBytes();
  final dotIndex = xfile.name.lastIndexOf('.');
  final extension = dotIndex == -1 ? 'jpg' : xfile.name.substring(dotIndex + 1);
  return PickedAttachment(bytes: bytes, extension: extension);
}

/// Uploads raw bytes to Firebase Storage under [storagePath] and returns
/// their public download URL.
Future<String> uploadBytes(Uint8List bytes, String storagePath) async {
  final ref = FirebaseStorage.instance.ref().child(storagePath);
  await ref.putData(bytes);
  return ref.getDownloadURL();
}

/// Small colored pill showing a pending/approved/rejected status, consistent
/// with the coordinator web portal's status badges.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final Color background;
    final Color foreground;
    switch (status) {
      case 'approved':
      case 'verified':
        background = const Color(0xFFDCFCE7);
        foreground = const Color(0xFF166534);
        break;
      case 'rejected':
      case 'flagged':
        background = const Color(0xFFFEE2E2);
        foreground = const Color(0xFFB91C1C);
        break;
      default:
        background = const Color(0xFFF1F5F9);
        foreground = const Color(0xFF475569);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(999)),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: foreground, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    );
  }
}
