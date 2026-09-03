import 'package:flutter/material.dart';
import '../theme/ndmu_theme.dart';

/// Friendly icon + message shown wherever a list has nothing to show yet.
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: NdmuColors.green.withAlpha((0.1 * 255).round()),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 30, color: NdmuColors.green),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }
}
