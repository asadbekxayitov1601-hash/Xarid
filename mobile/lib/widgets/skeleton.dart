import 'package:flutter/material.dart';
import '../theme.dart';

/// A gentle pulsing grey box used to build loading skeletons.
class Pulse extends StatefulWidget {
  final double? width;
  final double? height;
  final double radius;
  const Pulse({super.key, this.width, this.height, this.radius = 8});

  @override
  State<Pulse> createState() => _PulseState();
}

class _PulseState extends State<Pulse> {
  bool _dim = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _dim = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _dim ? 0.45 : 1.0,
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeInOut,
      onEnd: () {
        if (mounted) setState(() => _dim = !_dim);
      },
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Brand.card,
          borderRadius: BorderRadius.circular(widget.radius),
        ),
      ),
    );
  }
}

/// A centered, branded empty / error state widget.
/// When [scrollable] is true, it is wrapped in a scrollable view so it stays
/// pull-to-refresh friendly inside a RefreshIndicator.
class EmptyMessage extends StatelessWidget {
  final IconData icon;
  final String text;
  final String? subtitle;
  final Future<void> Function()? onRetry;
  final bool scrollable;

  const EmptyMessage({
    super.key,
    required this.icon,
    required this.text,
    this.subtitle,
    this.onRetry,
    this.scrollable = false,
  });

  @override
  Widget build(BuildContext context) {
    final content = Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: const BoxDecoration(color: Brand.card, shape: BoxShape.circle),
              child: Icon(icon, size: 40, color: Brand.inkSoft),
            ),
            const SizedBox(height: 16),
            Text(
              text,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Brand.inkSoft, fontSize: 15, fontWeight: FontWeight.w600),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Brand.inkSoft, fontSize: 12),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: () => onRetry!(),
                icon: const Icon(Icons.refresh, size: 18, color: Brand.green),
                label: const Text('Qayta urinish',
                    style: TextStyle(color: Brand.green, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Brand.green),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ],
        ),
      ),
    );

    if (scrollable) {
      return LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: content,
          ),
        ),
      );
    }
    return content;
  }
}
