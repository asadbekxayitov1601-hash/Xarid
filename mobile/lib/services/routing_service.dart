import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

/// A driving route between two points: the road geometry to draw on the map,
/// plus the total distance and travel time.
class RoutePath {
  final List<LatLng> points;
  final double distanceKm;
  final int durationMin;
  const RoutePath({required this.points, required this.distanceKm, required this.durationMin});

  String get distanceLabel =>
      distanceKm >= 10 ? '${distanceKm.toStringAsFixed(0)} km' : '${distanceKm.toStringAsFixed(1)} km';
  String get etaLabel => '~$durationMin daq';
}

/// Road routing over the public OSRM server (free, no API key), matching the
/// OpenStreetMap tiles the maps already render. Best-effort: returns null on any
/// failure so a missing route never blocks the delivery UI (the straight-line
/// fallback + external "open in maps" button remain).
class RoutingService {
  static const _base = 'https://router.project-osrm.org';

  static Future<RoutePath?> route(LatLng from, LatLng to) async {
    // OSRM expects lon,lat order.
    final coords =
        '${from.longitude},${from.latitude};${to.longitude},${to.latitude}';
    final uri = Uri.parse('$_base/route/v1/driving/$coords?overview=full&geometries=geojson');
    try {
      final res = await http.get(uri).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final routes = data['routes'] as List?;
      if (routes == null || routes.isEmpty) return null;
      final r = routes.first as Map<String, dynamic>;
      final geometry = r['geometry'] as Map<String, dynamic>?;
      final coordsList = (geometry?['coordinates'] as List?) ?? const [];
      final points = coordsList
          .map((c) => LatLng((c as List)[1] as double, c[0] as double))
          .toList();
      if (points.isEmpty) return null;
      final distanceM = (r['distance'] as num?)?.toDouble() ?? 0;
      final durationS = (r['duration'] as num?)?.toDouble() ?? 0;
      return RoutePath(
        points: points,
        distanceKm: distanceM / 1000,
        durationMin: (durationS / 60).ceil(),
      );
    } catch (_) {
      return null;
    }
  }
}
