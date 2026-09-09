import 'package:flutter/material.dart';

/// Shown in place of a StreamBuilder's normal content when its underlying
/// Firestore listener errors (most commonly a rules/permission problem) —
/// makes the failure visible instead of silently falling through to
/// whatever "nothing here yet" empty state that screen shows for zero
/// results, which is indistinguishable from a real empty list otherwise.
class StreamError extends StatelessWidget {
  final Object? error;

  const StreamError({super.key, this.error});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: Colors.redAccent, size: 32),
          const SizedBox(height: 12),
          const Text(
            "Couldn't load this — check your connection and try again.",
            textAlign: TextAlign.center,
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          if (error != null) ...[
            const SizedBox(height: 6),
            Text(
              '$error',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 11.5),
            ),
          ],
        ],
      ),
    );
  }
}
