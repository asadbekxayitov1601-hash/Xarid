import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'api.dart';
import 'basket.dart';
import 'i18n.dart';
import 'theme.dart';
import 'screens/auth_screen.dart';
import 'screens/stores_screen.dart';
import 'screens/basket_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/courier/driver_shell.dart';
import 'services/push_service.dart';
import 'widgets/splash_screen.dart';
import 'screens/account_screen.dart';

/// Clean up the default flavor to customer, or override by flavor configurations.
const String appFlavor = String.fromEnvironment('FLAVOR', defaultValue: 'customer');

bool get _isCourierFlavor => appFlavor == 'courier';

/// Default `flutter run` entry — boots the customer flavor.
void main() => runXarid();

/// Shared app bootstrap the per-flavor entry points call. Keeping it tiny means
/// one codebase, two shippable apps (uz.xarid.app / uz.xarid.courier) with the
/// same Dart and the same role routing.
void runXarid() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushService.init();
  runApp(const XaridApp());
}

class XaridApp extends StatelessWidget {
  const XaridApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Api()..load()),
        ChangeNotifierProvider(create: (_) => Basket()),
        ChangeNotifierProvider(create: (_) => L10n()..load()),
      ],
      child: MaterialApp(
        title: _isCourierFlavor ? 'Xarid Kuryer' : 'Xarid',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const _Gate(),
      ),
    );
  }
}

class _Gate extends StatefulWidget {
  const _Gate();
  @override
  State<_Gate> createState() => _GateState();
}

class _GateState extends State<_Gate> {
  bool _splashFinished = false;

  @override
  Widget build(BuildContext context) {
    final api = context.watch<Api>();
    
    if (!_splashFinished) {
      return SplashScreen(
        apiReady: api.ready,
        onFinished: () {
          setState(() {
            _splashFinished = true;
          });
        },
      );
    }

    if (!api.isLoggedIn) return const AuthScreen();
    // The build flavor decides the app's purpose: the courier build is the
    // driver app (map + profile, gated behind an application), the customer
    // build is the shopper app. This keeps the two installable apps cleanly
    // separated while sharing one Dart codebase.
    if (_isCourierFlavor) return const CourierGate();
    return const HomeShell();
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;
  static const _screens = [
    StoresScreen(),
    BasketScreen(),
    OrdersScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final count = context.watch<Basket>().count;
    return Scaffold(
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        backgroundColor: Brand.card,
        indicatorColor: Brand.greenBright.withValues(alpha: 0.25),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.storefront_outlined),
            selectedIcon: const Icon(Icons.storefront),
            label: context.t('nav.stores'),
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: count > 0,
              label: Text('$count'),
              child: const Icon(Icons.shopping_basket_outlined),
            ),
            selectedIcon: const Icon(Icons.shopping_basket),
            label: context.t('nav.basket'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: context.t('nav.orders'),
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
