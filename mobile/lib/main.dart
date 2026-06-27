import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'api.dart';
import 'basket.dart';
import 'theme.dart';
import 'screens/auth_screen.dart';
import 'screens/stores_screen.dart';
import 'screens/basket_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/courier/courier_home.dart';

/// Compile-time flavor, set by the per-flavor entry points (see
/// lib/main_customer.dart / lib/main_courier.dart) with
/// `--dart-define=FLAVOR=customer|courier`. Drives the window title only; the
/// signed-in user's role still governs which experience is shown (see _Gate).
const String appFlavor = String.fromEnvironment('FLAVOR', defaultValue: 'customer');

bool get _isCourierFlavor => appFlavor == 'courier';

/// Default `flutter run` entry — boots the customer flavor.
void main() => runXarid();

/// Shared app bootstrap the per-flavor entry points call. Keeping it tiny means
/// one codebase, two shippable apps (uz.xarid.app / uz.xarid.courier) with the
/// same Dart and the same role routing.
void runXarid() => runApp(const XaridApp());

class XaridApp extends StatelessWidget {
  const XaridApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Api()..load()),
        ChangeNotifierProvider(create: (_) => Basket()),
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

class _Gate extends StatelessWidget {
  const _Gate();

  @override
  Widget build(BuildContext context) {
    final api = context.watch<Api>();
    if (!api.ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Brand.green)));
    }
    if (!api.isLoggedIn) return const AuthScreen();
    // The signed-in role is the source of truth: couriers get the driver
    // experience, everyone else gets the shopper app. The courier flavor only
    // default-hints the courier UI when the role is missing/unknown — so a
    // buyer signing into the courier build still lands in the shopper app.
    if (api.user?.role == 'DRIVER') return const CourierHome();
    if (_isCourierFlavor && api.user?.role == null) return const CourierHome();
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
  static const _screens = [StoresScreen(), BasketScreen(), OrdersScreen()];

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
          const NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: "Do'konlar"),
          NavigationDestination(
            icon: Badge(isLabelVisible: count > 0, label: Text('$count'), child: const Icon(Icons.shopping_basket_outlined)),
            selectedIcon: const Icon(Icons.shopping_basket),
            label: 'Savat',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Buyurtmalar'),
        ],
      ),
    );
  }
}
