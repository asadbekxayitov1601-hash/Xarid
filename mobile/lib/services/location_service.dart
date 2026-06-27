import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

/// Streams the courier's GPS to the backend while a delivery is active.
///
/// This service is intentionally self-contained — it reads the Bearer token
/// directly from shared_preferences ('token', the same key Api writes) and
/// posts to {Config.apiBaseUrl}/api/driver/location so wiring it up never has
/// to touch lib/api.dart. The server (app/api/driver/location/route.ts) expects
/// a JSON body of { lat, lng, accuracy? } and authenticates via the Bearer
/// token, fanning each fix out to buyers watching this driver's live orders.
///
/// Throttling matches the backend's expectation of a fix roughly every ~10s:
/// the geolocator stream is distance-filtered to ~25m, and we additionally
/// suppress any POST that arrives sooner than [_minInterval] after the last one
/// unless the device has moved at least [_minDistanceM]. This keeps battery and
/// data use sane while a job is open.
class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  static const int _minDistanceM = 25; // only resend after moving > ~25m
  static const Duration _minInterval = Duration(seconds: 10); // or every ~10s

  StreamSubscription<Position>? _sub;
  Position? _lastSent;
  DateTime? _lastSentAt;
  bool _streaming = false;

  bool get isStreaming => _streaming;

  /// Position of the most recent fix posted to the server, if any. Useful for
  /// centering a map on the courier without re-querying the device.
  Position? get lastPosition => _lastSent;

  /// Ensures location services are on and permission is granted. Returns true
  /// when the device is ready to stream; throws nothing — callers decide how to
  /// surface a denial (e.g. a SnackBar prompting the user to open Settings).
  Future<bool> ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return false;
    }
    return true;
  }

  /// Begins streaming GPS to the backend. Idempotent — a second call while
  /// already streaming is a no-op. Returns false if permission was refused.
  Future<bool> start() async {
    if (_streaming) return true;
    if (!await ensurePermission()) return false;

    _streaming = true;
    _lastSent = null;
    _lastSentAt = null;

    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: _minDistanceM,
    );

    // Send one fix immediately so the buyer sees the courier pin without
    // waiting for the device to move the first 25m.
    try {
      final first = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      await _maybePost(first, force: true);
    } catch (_) {
      // A failed initial fix is fine — the stream below will catch up.
    }

    _sub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (pos) => _maybePost(pos),
      onError: (_) {
        // Swallow transient stream errors; the next fix recovers. A hard stop
        // (services disabled mid-job) simply stops emitting.
      },
      cancelOnError: false,
    );
    return true;
  }

  /// Stops streaming and releases the device subscription.
  Future<void> stop() async {
    _streaming = false;
    await _sub?.cancel();
    _sub = null;
    _lastSent = null;
    _lastSentAt = null;
  }

  // Decides whether this fix is worth a POST, then sends it. The geolocator
  // distance filter already drops sub-25m moves, but a stationary courier still
  // emits occasional fixes; the time gate lets those through at most every 10s.
  Future<void> _maybePost(Position pos, {bool force = false}) async {
    if (!_streaming && !force) return;

    if (!force && _lastSent != null && _lastSentAt != null) {
      final moved = Geolocator.distanceBetween(
        _lastSent!.latitude,
        _lastSent!.longitude,
        pos.latitude,
        pos.longitude,
      );
      final elapsed = DateTime.now().difference(_lastSentAt!);
      if (moved < _minDistanceM && elapsed < _minInterval) return;
    }

    final ok = await _post(pos);
    if (ok) {
      _lastSent = pos;
      _lastSentAt = DateTime.now();
    }
  }

  // Posts a single fix. Returns true on a 2xx so the throttle only advances on
  // a delivered fix (a failed POST is retried by the next stream event).
  Future<bool> _post(Position pos) async {
    final token = await _token();
    if (token == null) return false;

    try {
      final res = await http
          .post(
            Uri.parse('${Config.apiBaseUrl}/api/driver/location'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'lat': pos.latitude,
              'lng': pos.longitude,
              if (pos.accuracy.isFinite) 'accuracy': pos.accuracy,
            }),
          )
          .timeout(const Duration(seconds: 12));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }
}
