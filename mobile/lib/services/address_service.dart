import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A single saved delivery address, modelled on the Yandex/Uzum address flow:
/// a map-picked point (lat/lng + resolved street/city) plus the fine details a
/// courier needs to reach the door (entrance, floor, apartment, free-text note).
class SavedAddress {
  final String id;
  final String label; // "Uy" | "Ish" | "Boshqa"
  final String street; // resolved from the map pin, e.g. "Imom Buxoriy ko'chasi, 25"
  final String city; // e.g. "Qo'qon"
  final String entrance; // kirish / podez
  final String floor; // qavat
  final String apartment; // xonadon
  final String notes; // "Belgilangan joy va manzil tafsilotlari"
  final double? lat;
  final double? lng;

  const SavedAddress({
    required this.id,
    this.label = 'Uy',
    this.street = '',
    this.city = '',
    this.entrance = '',
    this.floor = '',
    this.apartment = '',
    this.notes = '',
    this.lat,
    this.lng,
  });

  /// Street shown as the primary line, with a graceful fallback.
  String get primaryLine => street.isNotEmpty ? street : 'Xaritada belgilangan joy';

  /// Short chip for the home header: "Uy · Imom Buxoriy ko'chasi, 25".
  String get chip => '$label · $primaryLine';

  /// Full address text sent with the order (street + the door details).
  String get full {
    final parts = <String>[if (street.isNotEmpty) street];
    if (entrance.isNotEmpty) parts.add('kirish $entrance');
    if (floor.isNotEmpty) parts.add('$floor-qavat');
    if (apartment.isNotEmpty) parts.add('$apartment-xonadon');
    final base = parts.join(', ');
    return base.isEmpty ? (city.isEmpty ? 'Belgilangan joy' : city) : base;
  }

  IconData get icon {
    switch (label) {
      case 'Ish':
        return Icons.work_rounded;
      case 'Boshqa':
        return Icons.location_on_rounded;
      default:
        return Icons.home_rounded;
    }
  }

  SavedAddress copyWith({
    String? label,
    String? street,
    String? city,
    String? entrance,
    String? floor,
    String? apartment,
    String? notes,
    double? lat,
    double? lng,
  }) =>
      SavedAddress(
        id: id,
        label: label ?? this.label,
        street: street ?? this.street,
        city: city ?? this.city,
        entrance: entrance ?? this.entrance,
        floor: floor ?? this.floor,
        apartment: apartment ?? this.apartment,
        notes: notes ?? this.notes,
        lat: lat ?? this.lat,
        lng: lng ?? this.lng,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'street': street,
        'city': city,
        'entrance': entrance,
        'floor': floor,
        'apartment': apartment,
        'notes': notes,
        'lat': lat,
        'lng': lng,
      };

  factory SavedAddress.fromJson(Map<String, dynamic> j) => SavedAddress(
        id: (j['id'] as String?) ?? _freshId(),
        label: (j['label'] as String?) ?? 'Uy',
        street: (j['street'] as String?) ?? '',
        city: (j['city'] as String?) ?? '',
        entrance: (j['entrance'] as String?) ?? '',
        floor: (j['floor'] as String?) ?? '',
        apartment: (j['apartment'] as String?) ?? '',
        notes: (j['notes'] as String?) ?? '',
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
      );
}

String _freshId() => DateTime.now().microsecondsSinceEpoch.toString();

/// The user's address book: the list of saved addresses plus which one is
/// currently selected for delivery.
class AddressBook {
  final List<SavedAddress> addresses;
  final String? selectedId;
  const AddressBook({this.addresses = const [], this.selectedId});

  SavedAddress? get selected {
    if (addresses.isEmpty) return null;
    for (final a in addresses) {
      if (a.id == selectedId) return a;
    }
    return addresses.first;
  }

  bool get isEmpty => addresses.isEmpty;
}

/// Persists the address book as JSON in shared_preferences.
class AddressService {
  static const _key = 'address_book_v1';

  static Future<AddressBook> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const AddressBook();
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final list = ((map['addresses'] as List?) ?? const [])
          .map((e) => SavedAddress.fromJson(e as Map<String, dynamic>))
          .toList();
      return AddressBook(addresses: list, selectedId: map['selectedId'] as String?);
    } catch (_) {
      return const AddressBook();
    }
  }

  static Future<void> _save(AddressBook book) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode({
        'selectedId': book.selectedId,
        'addresses': book.addresses.map((a) => a.toJson()).toList(),
      }),
    );
  }

  /// Convenience: the currently selected address (or null).
  static Future<SavedAddress?> selected() async => (await load()).selected;

  /// Insert or update an address, then select it. Returns the updated book.
  static Future<AddressBook> upsert(SavedAddress a, {bool select = true}) async {
    final book = await load();
    final list = [...book.addresses];
    final i = list.indexWhere((x) => x.id == a.id);
    if (i >= 0) {
      list[i] = a;
    } else {
      list.add(a);
    }
    final updated = AddressBook(addresses: list, selectedId: select ? a.id : book.selectedId);
    await _save(updated);
    return updated;
  }

  static Future<AddressBook> select(String id) async {
    final book = await load();
    final updated = AddressBook(addresses: book.addresses, selectedId: id);
    await _save(updated);
    return updated;
  }

  static Future<AddressBook> remove(String id) async {
    final book = await load();
    final list = book.addresses.where((a) => a.id != id).toList();
    final selectedId = book.selectedId == id ? (list.isNotEmpty ? list.first.id : null) : book.selectedId;
    final updated = AddressBook(addresses: list, selectedId: selectedId);
    await _save(updated);
    return updated;
  }

  static String newId() => _freshId();
}
