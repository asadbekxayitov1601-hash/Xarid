import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

class SmokePuff {
  double x;
  double y;
  double size;
  double opacity;
  final double vx;
  final double vy;

  SmokePuff({
    required this.x,
    required this.y,
    required this.size,
    required this.opacity,
    required this.vx,
    required this.vy,
  });
}

class SplashScreen extends StatefulWidget {
  final bool apiReady;
  final VoidCallback onFinished;

  const SplashScreen({
    super.key,
    required this.apiReady,
    required this.onFinished,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<SmokePuff> _smokePuffs = [];
  final Random _random = Random();
  
  double _truckX = 0;
  bool _drivingAway = false;
  double _wheelYOffset = 0;
  
  // Timing control
  bool _minimumTimeElapsed = false;
  bool _apiReady = false;
  
  @override
  void initState() {
    super.initState();
    _apiReady = widget.apiReady;
    
    // Animation controller running continuously for wheels/smoke
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..addListener(_onTick);
    
    _controller.repeat();

    // Ensure splash stays visible for at least 2.5 seconds for visual impact
    Timer(const Duration(milliseconds: 2500), () {
      if (mounted) {
        setState(() => _minimumTimeElapsed = true);
        _checkTransition();
      }
    });
  }

  @override
  void didUpdateWidget(covariant SplashScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.apiReady && !oldWidget.apiReady) {
      setState(() => _apiReady = true);
      _checkTransition();
    }
  }

  void _checkTransition() {
    if (_minimumTimeElapsed && _apiReady && !_drivingAway) {
      _startDriveAway();
    }
  }

  void _startDriveAway() {
    setState(() => _drivingAway = true);
    
    // Animate the truck driving off the right side of the screen
    final screenWidth = MediaQuery.of(context).size.width;
    final startX = _truckX;
    final endX = screenWidth / 2 + 150; // offset off screen
    
    const duration = Duration(milliseconds: 800);
    final startTime = DateTime.now();
    
    Timer.periodic(const Duration(milliseconds: 16), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      
      final elapsed = DateTime.now().difference(startTime);
      final percent = elapsed.inMilliseconds / duration.inMilliseconds;
      
      if (percent >= 1.0) {
        timer.cancel();
        widget.onFinished();
      } else {
        // Quadratic ease-in for a realistic acceleration feel
        final curveValue = percent * percent;
        setState(() {
          _truckX = startX + (endX - startX) * curveValue;
        });
      }
    });
  }

  void _onTick() {
    if (!mounted) return;

    // 1. Update wheels bouncy motion
    final t = _controller.value * 2 * pi;
    setState(() {
      // Bumpy road simulation: small sinusoidal bounce
      _wheelYOffset = sin(t * 4) * 2;
    });

    // 2. Spawn new smoke puffs at exhaust location (back of cargo body)
    // Exhaust is located near the bottom left of the truck body:
    // Relative to truck center, cargo starts at x = -65, bottom is y = 35.
    if (_random.nextDouble() < 0.45) {
      final exhaustX = _truckX - 55;
      final exhaustY = _wheelYOffset + 25;
      _smokePuffs.add(
        SmokePuff(
          x: exhaustX,
          y: exhaustY,
          size: 6.0 + _random.nextDouble() * 4.0,
          opacity: 0.8,
          // Puffs fly back (to the left)
          vx: -3.0 - _random.nextDouble() * 2.0,
          vy: -1.0 + _random.nextDouble() * 2.0,
        ),
      );
    }

    // 3. Update existing smoke puffs
    for (int i = _smokePuffs.length - 1; i >= 0; i--) {
      final puff = _smokePuffs[i];
      puff.x += puff.vx;
      puff.y += puff.vy;
      puff.size += 0.35; // puff expands
      puff.opacity -= 0.025; // puff fades
      
      if (puff.opacity <= 0) {
        _smokePuffs.removeAt(i);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.cream,
      body: Stack(
        children: [
          // Background subtle speed lines / road dust
          Positioned.fill(
            child: CustomPaint(
              painter: _SpeedLinesPainter(
                random: _random,
                animationValue: _controller.value,
                drivingAway: _drivingAway,
              ),
            ),
          ),
          // Main content
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Premium polished Logo container
                AnimatedOpacity(
                  opacity: _drivingAway ? 0.0 : 1.0,
                  duration: const Duration(milliseconds: 300),
                  child: Column(
                    children: [
                      Image.asset(
                        'assets/logo.png',
                        width: 140,
                        height: 140,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Xarid',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w900,
                          color: Brand.ink,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "Tezkor va sifatli yetkazib berish",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Brand.inkSoft.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 80),
                
                // Animated Truck Loader
                SizedBox(
                  width: double.infinity,
                  height: 120,
                  child: CustomPaint(
                    painter: _TruckLoaderPainter(
                      truckX: _truckX,
                      wheelYOffset: _wheelYOffset,
                      smokePuffs: _smokePuffs,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TruckLoaderPainter extends CustomPainter {
  final double truckX;
  final double wheelYOffset;
  final List<SmokePuff> smokePuffs;

  _TruckLoaderPainter({
    required this.truckX,
    required this.wheelYOffset,
    required this.smokePuffs,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    final centerX = size.width / 2 + truckX;
    final centerY = size.height / 2;

    // 1. Draw smoke puffs (behind the truck)
    for (final puff in smokePuffs) {
      paint.color = Brand.inkSoft.withValues(alpha: puff.opacity * 0.3);
      canvas.drawCircle(Offset(puff.x, centerY + puff.y), puff.size, paint);
    }

    // Coordinates relative to truck anchor (centerX, centerY)
    // Total Width: 130px. Offset from center: -65 to +65.
    // Cargo: 80x70. Top-Left: -65, -45.
    // Cabin: 30x50. Top-Left: 15, -25.
    // Hood: 20x30. Top-Left: 45, -5.
    
    // 2. Cargo body (lime green)
    paint.color = Brand.green;
    final cargoRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(centerX - 65, centerY - 45, 80, 70),
      const Radius.circular(8),
    );
    canvas.drawRRect(cargoRect, paint);

    // 3. Cabin (bright lime green)
    paint.color = Brand.greenBright;
    final cabinRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(centerX + 15, centerY - 25, 30, 50),
      const Radius.circular(6),
    );
    canvas.drawRRect(cabinRect, paint);

    // 4. Hood (front bumper/hood area)
    paint.color = Brand.greenBright;
    final hoodRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(centerX + 45, centerY - 5, 20, 30),
      const Radius.circular(6),
    );
    canvas.drawRRect(hoodRect, paint);

    // 5. Cabin Window
    paint.color = Brand.cream;
    final windowRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(centerX + 22, centerY - 17, 16, 16),
      const Radius.circular(3),
    );
    canvas.drawRRect(windowRect, paint);

    // 6. Headlight (Amber/Yellow)
    paint.color = Brand.amber;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(centerX + 61, centerY + 3, 4, 8),
        const Radius.circular(1.5),
      ),
      paint,
    );

    // 7. Wheels
    final wheelY = centerY + 25 + wheelYOffset;
    paint.color = Colors.black;
    
    // Rear Wheel
    final rearWheelCenter = Offset(centerX - 42, wheelY);
    canvas.drawCircle(rearWheelCenter, 14, paint);
    paint.color = Colors.white;
    canvas.drawCircle(rearWheelCenter, 5, paint);
    
    // Front Wheel
    final frontWheelCenter = Offset(centerX + 35, wheelY);
    paint.color = Colors.black;
    canvas.drawCircle(frontWheelCenter, 14, paint);
    paint.color = Colors.white;
    canvas.drawCircle(frontWheelCenter, 5, paint);
  }

  @override
  bool shouldRepaint(covariant _TruckLoaderPainter oldDelegate) {
    return oldDelegate.truckX != truckX ||
        oldDelegate.wheelYOffset != wheelYOffset ||
        oldDelegate.smokePuffs.length != smokePuffs.length;
  }
}

class _SpeedLinesPainter extends CustomPainter {
  final Random random;
  final double animationValue;
  final bool drivingAway;

  _SpeedLinesPainter({
    required this.random,
    required this.animationValue,
    required this.drivingAway,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (drivingAway) return; // Hide background speed lines when driving away
    
    final paint = Paint()
      ..color = Brand.border.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;

    final width = size.width;
    // Draw 3 horizontal moving speed lines
    final linesY = [size.height / 2 - 30, size.height / 2 + 10, size.height / 2 + 55];
    final offsets = [0.0, 0.4, 0.75]; // phase offsets

    for (int i = 0; i < linesY.length; i++) {
      final progress = (animationValue + offsets[i]) % 1.0;
      final startX = width - (progress * (width + 100));
      final endX = startX + 40;
      canvas.drawLine(Offset(startX, linesY[i]), Offset(endX, linesY[i]), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SpeedLinesPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue || oldDelegate.drivingAway != drivingAway;
  }
}
