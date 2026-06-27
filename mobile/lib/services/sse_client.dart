import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

/// A tiny Server-Sent Events (SSE) client built on the `http` package — no
/// `EventSource`, no extra dependency. It opens a long-lived GET request,
/// streams the raw bytes, decodes them as UTF-8 line by line, accumulates the
/// `data:` lines of each event and, when a blank line terminates the event,
/// parses the joined payload as JSON and pushes it onto [events].
///
/// SSE wire format (the subset the Xarid `/stream` route emits):
///
/// ```
/// data: {"type":"status","status":"EN_ROUTE","eta":7}
///                          <- blank line ends the event
/// :keep-alive               <- a comment line, ignored
/// ```
///
/// On a dropped / errored connection it reconnects automatically with a short,
/// capped backoff. Call [close]/[dispose] to stop for good.
class SseClient {
  SseClient(this.url, {this.headers = const {}});

  /// The SSE endpoint, e.g. `${Config.apiBaseUrl}/api/orders/$id/stream`.
  final String url;

  /// Extra request headers (Authorization, etc.).
  final Map<String, String> headers;

  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  http.Client? _client;
  StreamSubscription<String>? _sub;
  Timer? _reconnectTimer;
  bool _closed = false;

  // Backoff state: 1s, then doubling up to 15s, reset to 1s on a clean open.
  static const _minBackoff = Duration(seconds: 1);
  static const _maxBackoff = Duration(seconds: 15);
  Duration _backoff = _minBackoff;

  /// Parsed JSON events as they arrive. Broadcast — listen as many times as you
  /// like. Connection drops are handled internally and never surface as errors
  /// on this stream; they just pause the flow until the next reconnect.
  Stream<Map<String, dynamic>> get events => _controller.stream;

  /// Whether the client has been permanently closed via [close]/[dispose].
  bool get isClosed => _closed;

  final _reconnecting = StreamController<bool>.broadcast();

  /// Emitted whenever the underlying connection drops; `true` while
  /// reconnecting, `false` once data is flowing again. Lets the UI show a calm
  /// "reconnecting" hint without treating it as a hard failure.
  Stream<bool> get reconnecting => _reconnecting.stream;

  /// Open the connection and start streaming. Safe to call once.
  void connect() {
    if (_closed) return;
    _open();
  }

  Future<void> _open() async {
    if (_closed) return;
    // Tear down any previous attempt before starting a fresh one.
    await _sub?.cancel();
    _sub = null;
    _client?.close();

    final client = http.Client();
    _client = client;

    // Buffer that accumulates the `data:` payload lines of the current event.
    final dataLines = <String>[];

    try {
      final request = http.Request('GET', Uri.parse(url));
      request.headers.addAll({
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...headers,
      });

      final response = await client.send(request);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        // A 4xx/5xx is not retryable in a tight loop the way a socket drop is,
        // but we still back off and retry — the order may not be visible yet,
        // or the server may be briefly unavailable.
        _scheduleReconnect();
        return;
      }

      // Connected cleanly: announce recovery and reset the backoff.
      _backoff = _minBackoff;
      if (!_reconnecting.isClosed) _reconnecting.add(false);

      // Decode the byte stream to UTF-8 and split into lines. `LineSplitter`
      // handles \n and \r\n and emits one string per line without terminators.
      final lines = response.stream.transform(utf8.decoder).transform(const LineSplitter());

      _sub = lines.listen(
        (line) {
          if (line.isEmpty) {
            // Blank line: dispatch the accumulated event, if any.
            if (dataLines.isNotEmpty) {
              _dispatch(dataLines.join('\n'));
              dataLines.clear();
            }
            return;
          }
          if (line.startsWith(':')) {
            // Comment line (e.g. ":keep-alive") — liveness only, ignore.
            return;
          }
          if (line.startsWith('data:')) {
            // Strip the field name and at most one leading space, per the spec.
            var value = line.substring(5);
            if (value.startsWith(' ')) value = value.substring(1);
            dataLines.add(value);
            return;
          }
          // Other SSE fields (event:, id:, retry:) are unused by this server.
        },
        onError: (_) => _scheduleReconnect(),
        onDone: _scheduleReconnect,
        cancelOnError: true,
      );
    } catch (_) {
      // DNS / connection / TLS failure — back off and try again.
      _scheduleReconnect();
    }
  }

  void _dispatch(String payload) {
    if (_closed || _controller.isClosed) return;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        _controller.add(decoded);
      } else if (decoded is Map) {
        _controller.add(Map<String, dynamic>.from(decoded));
      }
    } catch (_) {
      // Malformed frame — skip it rather than killing the stream.
    }
  }

  void _scheduleReconnect() {
    if (_closed) return;
    // Avoid stacking multiple timers if both onError and onDone fire.
    if (_reconnectTimer != null) return;

    _sub?.cancel();
    _sub = null;
    _client?.close();
    _client = null;

    if (!_reconnecting.isClosed) _reconnecting.add(true);

    final delay = _backoff;
    // Exponential backoff, capped.
    final nextMs = (_backoff.inMilliseconds * 2).clamp(
      _minBackoff.inMilliseconds,
      _maxBackoff.inMilliseconds,
    );
    _backoff = Duration(milliseconds: nextMs);

    _reconnectTimer = Timer(delay, () {
      _reconnectTimer = null;
      _open();
    });
  }

  /// Stop streaming and release all resources. Idempotent.
  Future<void> close() async {
    if (_closed) return;
    _closed = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    await _sub?.cancel();
    _sub = null;
    _client?.close();
    _client = null;
    if (!_reconnecting.isClosed) await _reconnecting.close();
    if (!_controller.isClosed) await _controller.close();
  }

  /// Alias for [close], matching the `dispose()` convention used elsewhere.
  Future<void> dispose() => close();
}
