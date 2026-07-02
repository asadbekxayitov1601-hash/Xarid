import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api.dart';
import '../../i18n.dart';
import '../../theme.dart';
import 'driver_api.dart';
import 'driver_apply_screen.dart';
import 'driver_map_screen.dart';
import 'driver_profile_screen.dart';

/// The courier app's entry gate. Fetches the signed-in user's driver state and
/// routes to the right experience:
///   - approved (or a provisioned DRIVER account) -> the map + profile shell
///   - pending  -> "under review" notice
///   - rejected -> rejection notice + re-apply
///   - no application yet -> the application form
class CourierGate extends StatefulWidget {
  const CourierGate({super.key});
  @override
  State<CourierGate> createState() => _CourierGateState();
}

class _CourierGateState extends State<CourierGate> {
  late Future<DriverMe> _future;
  // A locally-submitted application flips the gate to "pending" without needing
  // a round-trip, so the courier sees the review state immediately.
  DriverProfile? _justApplied;

  @override
  void initState() {
    super.initState();
    _future = CourierApi.me();
  }

  void _refresh() {
    setState(() {
      _justApplied = null;
      _future = CourierApi.me();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_justApplied != null) {
      return _PendingScreen(onRefresh: _refresh);
    }
    return FutureBuilder<DriverMe>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator(color: Brand.green)));
        }
        if (snap.hasError || snap.data == null) {
          return _GateError(onRetry: _refresh);
        }
        final me = snap.data!;
        if (me.isApproved) return const DriverShell();
        if (me.isPending) return _PendingScreen(onRefresh: _refresh);

        final api = context.read<Api>();
        return DriverApplyScreen(
          initialName: me.driver?.name ?? api.user?.name,
          initialPhone: me.driver?.phone ?? api.user?.phone,
          reapply: me.isRejected,
          onApplied: (profile) => setState(() => _justApplied = profile),
        );
      },
    );
  }
}

/// Bottom nav for approved couriers: the live map and the profile tab.
class DriverShell extends StatefulWidget {
  const DriverShell({super.key});
  @override
  State<DriverShell> createState() => _DriverShellState();
}

class _DriverShellState extends State<DriverShell> {
  int _tab = 0;
  static const _screens = [DriverMapScreen(), DriverProfileScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        backgroundColor: Brand.card,
        indicatorColor: Brand.greenBright.withValues(alpha: 0.25),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.map_outlined),
            selectedIcon: const Icon(Icons.map),
            label: context.t('nav.map'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: context.t('nav.profile'),
          ),
        ],
      ),
    );
  }
}

/// Shown while an application waits for admin approval.
class _PendingScreen extends StatelessWidget {
  final VoidCallback onRefresh;
  const _PendingScreen({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final api = context.read<Api>();
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('driver.apply_title'), style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: context.t('account.logout'),
            icon: const Icon(Icons.logout, color: Brand.inkSoft),
            onPressed: () => api.logout(),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: Brand.amber.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.hourglass_top_rounded, color: Brand.amber, size: 40),
              ),
              const SizedBox(height: 20),
              Text(context.t('driver.pending_title'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Brand.ink)),
              const SizedBox(height: 10),
              Text(
                context.t('driver.pending_sub'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Brand.inkSoft, height: 1.4),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: Text(context.t('driver.check_status')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GateError extends StatelessWidget {
  final VoidCallback onRetry;
  const _GateError({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final api = context.read<Api>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 56, color: Brand.inkSoft),
                const SizedBox(height: 12),
                Text(context.t('driver.gate_error'),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.ink, fontSize: 18)),
                const SizedBox(height: 6),
                Text(context.t('driver.gate_error_sub'),
                    textAlign: TextAlign.center, style: const TextStyle(color: Brand.inkSoft)),
                const SizedBox(height: 20),
                FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: Text(context.t('common.retry'))),
                TextButton(onPressed: () => api.logout(), child: Text(context.t('account.logout'))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
