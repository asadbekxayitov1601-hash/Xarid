import 'dart:convert';
import 'package:http/http.dart' as http;

/// A resolved place: a human street line + city, from OpenStreetMap Nominatim.
class GeoPlace {
  final String street; // "Imom Buxoriy ko'chasi, 25" (road + house number)
  final String city; // "Qo'qon"
  final double lat;
  final double lng;
  const GeoPlace({required this.street, required this.city, required this.lat, required this.lng});
}

/// Thin client over OpenStreetMap Nominatim for reverse (pin -> address) and
/// forward (search text -> point) geocoding. Free, no key — matches the OSM
/// tiles the maps already use. Callers must debounce (Nominatim asks for <=1
/// request/second); every call is best-effort and returns null on any failure,
/// so the address flow never dead-ends when geocoding is unavailable.
class GeocodingService {
  static const _base = 'https://nominatim.openstreetmap.org';
  // Nominatim's usage policy requires an identifying User-Agent.
  static const _headers = {'User-Agent': 'uz.xarid.app (Xarid delivery app)'};

  /// Pin -> address. Returns the road + house number as [GeoPlace.street].
  static Future<GeoPlace?> reverse(double lat, double lng) async {
    final uri = Uri.parse(
        '$_base/reverse?format=jsonv2&lat=$lat&lon=$lng&zoom=18&addressdetails=1&accept-language=uz');
    try {
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final addr = (data['address'] as Map<String, dynamic>?) ?? const {};
      return GeoPlace(
        street: _streetOf(addr),
        city: _cityOf(addr),
        lat: lat,
        lng: lng,
      );
    } catch (_) {
      return null;
    }
  }

  /// Search text -> best matching point (biased toward the Kokand area).
  static Future<GeoPlace?> search(String query) async {
    final q = query.trim();
    if (q.isEmpty) return null;
    final uri = Uri.parse(
        '$_base/search?format=jsonv2&q=${Uri.encodeQueryComponent(q)}&addressdetails=1&limit=1&accept-language=uz&countrycodes=uz');
    try {
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final list = jsonDecode(res.body) as List;
      if (list.isEmpty) return null;
      final first = list.first as Map<String, dynamic>;
      final addr = (first['address'] as Map<String, dynamic>?) ?? const {};
      final lat = double.tryParse('${first['lat']}');
      final lng = double.tryParse('${first['lon']}');
      if (lat == null || lng == null) return null;
      final street = _streetOf(addr);
      return GeoPlace(
        street: street.isNotEmpty ? street : (first['display_name'] as String? ?? q).split(',').first,
        city: _cityOf(addr),
        lat: lat,
        lng: lng,
      );
    } catch (_) {
      return null;
    }
  }

  static String _streetOf(Map<String, dynamic> addr) {
    final road = (addr['road'] ?? addr['pedestrian'] ?? addr['neighbourhood'] ?? addr['suburb'])?.toString();
    final house = addr['house_number']?.toString();
    if (road == null || road.isEmpty) return '';
    return house != null && house.isNotEmpty ? '$road, $house' : road;
  }

  static String _cityOf(Map<String, dynamic> addr) {
    return (addr['city'] ??
                addr['town'] ??
                addr['village'] ??
                addr['municipality'] ??
                addr['county'] ??
                '')
            ?.toString() ??
        '';
  }
}
