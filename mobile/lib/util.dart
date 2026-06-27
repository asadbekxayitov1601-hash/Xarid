import 'dart:convert';
import 'package:flutter/material.dart';
import 'theme.dart';

// Formats an integer UZS amount with thin-space grouping, e.g. 5994 -> "5 994 so'm".
String uzs(int n) {
  final s = n.abs().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
    b.write(s[i]);
  }
  return "${b.toString()} so'm";
}

// Renders product/store images. The backend stores photos as base64 data URLs
// (data:image/...) which Image.network can't load, so decode those to bytes;
// fall back to a placeholder on null/empty/error.
class AppImage extends StatelessWidget {
  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  const AppImage({super.key, this.url, this.width, this.height, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    final u = url;
    if (u == null || u.isEmpty) return _placeholder();
    if (u.startsWith('data:')) {
      try {
        final bytes = base64Decode(u.substring(u.indexOf(',') + 1));
        return Image.memory(bytes,
            width: width, height: height, fit: fit, errorBuilder: (_, __, ___) => _placeholder());
      } catch (_) {
        return _placeholder();
      }
    }
    return Image.network(u,
        width: width, height: height, fit: fit, errorBuilder: (_, __, ___) => _placeholder());
  }

  Widget _placeholder() => Container(
        width: width,
        height: height,
        color: Brand.card,
        child: const Center(child: Icon(Icons.storefront, color: Color(0x665A6150), size: 32)),
      );
}
