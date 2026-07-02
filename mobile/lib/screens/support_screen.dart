import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../i18n.dart';
import '../theme.dart';

/// One message in the support thread.
class SupportMsg {
  final String id;
  final bool fromSupport;
  final String body;
  final DateTime? createdAt;
  SupportMsg({required this.id, required this.fromSupport, required this.body, this.createdAt});

  factory SupportMsg.fromJson(Map<String, dynamic> j) => SupportMsg(
        id: (j['id'] as String?) ?? '',
        fromSupport: (j['fromSupport'] as bool?) ?? false,
        body: (j['body'] as String?) ?? '',
        createdAt: j['createdAt'] != null ? DateTime.tryParse(j['createdAt'].toString()) : null,
      );
}

/// Self-contained client for the in-app support thread. Reads the Bearer token
/// from shared_preferences so it works for both the customer and courier apps.
class _SupportApi {
  static Future<String?> _token() async =>
      (await SharedPreferences.getInstance()).getString('token');

  static Future<List<SupportMsg>> fetch() async {
    final token = await _token();
    if (token == null) return const [];
    final res = await http.get(
      Uri.parse('${Config.apiBaseUrl}/api/support'),
      headers: {'Authorization': 'Bearer $token'},
    ).timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('http_${res.statusCode}');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ((data['messages'] as List?) ?? const [])
        .map((e) => SupportMsg.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static Future<List<SupportMsg>> send(String body) async {
    final token = await _token();
    if (token == null) return const [];
    final res = await http.post(
      Uri.parse('${Config.apiBaseUrl}/api/support'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: jsonEncode({'body': body}),
    ).timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('http_${res.statusCode}');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    return ((data['messages'] as List?) ?? const [])
        .map((e) => SupportMsg.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

/// In-app support chat. Polls the thread every few seconds so operator replies
/// (sent from the admin inbox) appear without the user reloading. Shared by the
/// customer Account screen and the courier Profile screen.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  List<SupportMsg> _messages = [];
  bool _loading = true;
  bool _sending = false;
  bool _failed = false;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    // Light polling: operator replies are low-volume, so 6s is plenty.
    _poll = Timer.periodic(const Duration(seconds: 6), (_) => _load(silent: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final msgs = await _SupportApi.fetch();
      if (!mounted) return;
      setState(() {
        _messages = msgs;
        _loading = false;
        _failed = false;
      });
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (!silent) _failed = true;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final msgs = await _SupportApi.send(text);
      if (!mounted) return;
      _controller.clear();
      setState(() {
        _messages = msgs;
        _failed = false;
      });
      _scrollToBottom();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(context.tr('support.send_failed'))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('support.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Column(
        children: [
          Expanded(child: _body()),
          _composer(),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Brand.green));
    }
    if (_failed && _messages.isEmpty) {
      return _Centered(
        icon: Icons.cloud_off,
        text: context.t('common.load_failed'),
        action: TextButton(onPressed: _load, child: Text(context.t('common.retry'))),
      );
    }
    if (_messages.isEmpty) {
      return _Centered(
        icon: Icons.support_agent,
        text: context.t('support.empty'),
        subtitle: context.t('support.empty_sub'),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.all(16),
      itemCount: _messages.length,
      itemBuilder: (_, i) => _Bubble(msg: _messages[i]),
    );
  }

  Widget _composer() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: const BoxDecoration(
          color: Brand.cream,
          border: Border(top: BorderSide(color: Brand.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                decoration: InputDecoration(
                  hintText: context.t('support.hint'),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _sending
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Brand.green),
                    ),
                  )
                : IconButton.filled(
                    onPressed: _send,
                    style: IconButton.styleFrom(backgroundColor: Brand.green, foregroundColor: Brand.onAccent),
                    icon: const Icon(Icons.send_rounded),
                  ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final SupportMsg msg;
  const _Bubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final mine = !msg.fromSupport;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: mine ? Brand.green : Brand.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(mine ? 16 : 4),
            bottomRight: Radius.circular(mine ? 4 : 16),
          ),
        ),
        child: Text(
          msg.body,
          style: TextStyle(color: mine ? Brand.onAccent : Brand.ink, height: 1.3),
        ),
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  final IconData icon;
  final String text;
  final String? subtitle;
  final Widget? action;
  const _Centered({required this.icon, required this.text, this.subtitle, this.action});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: Brand.inkSoft),
            const SizedBox(height: 12),
            Text(text, style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink)),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!, textAlign: TextAlign.center, style: const TextStyle(color: Brand.inkSoft)),
            ],
            if (action != null) ...[const SizedBox(height: 8), action!],
          ],
        ),
      ),
    );
  }
}
