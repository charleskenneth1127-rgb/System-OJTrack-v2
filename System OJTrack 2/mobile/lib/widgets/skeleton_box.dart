import 'package:flutter/material.dart';

/// A pulsing placeholder bar shown in place of text/values while data loads,
/// so a loading dashboard reads as "working" rather than blank/broken.
class SkeletonBox extends StatefulWidget {
  final double width;
  final double height;

  const SkeletonBox({super.key, required this.width, this.height = 14});

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat(reverse: true);

  late final Animation<double> _opacity = Tween(begin: 0.35, end: 0.85).animate(
    CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _opacity,
      builder: (context, child) => Opacity(
        opacity: _opacity.value,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.grey.shade300,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
      ),
    );
  }
}
