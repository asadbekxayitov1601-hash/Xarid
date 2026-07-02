import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// The user's delivery address, captured on first launch (GPS + manual entry)
/// and reused as the default at checkout. Persisted as JSON in shared_preferences
/// so it survives restarts.
class SavedAddress {
  final String label; // "Uy" | "Ish" | "Boshqa"
  final String street; // ko'cha nomi
  final String house; // uy / xonadon raqami
  final double? lat;
  final double? lng;

  const SavedAddress({
    required this.label,
    required this.street,
    this.house = '',
    this.lat,
    this.lng,
  });

  /// One-line form used on the delivery address input, e.g.
  /// "Imom Buxoriy ko'chasi, 25".
  String get full => house.isEmpty ? street : '$street, $house';

  /// Short label + street for the home-screen address chip, e.g.
  /// "Uy · Imom Buxoriy ko'chasi, 25".
  String get chip => '$label · $full';

  Map<String, dynamic> toJson() => {
        'label': label,
        'street': street,
        'house': house,
        'lat': lat,
        'lng': lng,
      };

  factory SavedAddress.fromJson(Map<String, dynamic> j) => SavedAddress(
        label: (j['label'] as String?) ?? 'Uy',
        street: (j['street'] as String?) ?? '',
        house: (j['house'] as String?) ?? '',
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
      );
}

class AddressService {
  static const _key = 'saved_address_v1';

  static Future<SavedAddress?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      return SavedAddress.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(SavedAddress a) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(a.toJson()));
  }
}
