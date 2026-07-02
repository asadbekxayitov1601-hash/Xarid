import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';
import '../widgets/skeleton.dart';
import 'store_screen.dart';
import 'address/address_map_screen.dart';
import 'address/address_list_sheet.dart';
import '../services/address_service.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  late Future<List<Store>> _future;
  String _searchQuery = '';
  bool _onlyDiscounts = false;
  bool _fastOnly = false;
  String? _selectedCategory;
  SavedAddress? _address;

  @override
  void initState() {
    super.initState();
    _future = context.read<Api>().stores();
    _loadAddress();
  }

  Future<void> _loadAddress() async {
    final selected = await AddressService.selected();
    if (!mounted) return;
    setState(() => _address = selected);
    // First launch: no saved address yet -> open the map-pin picker onboarding.
    if (selected == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openMapPicker();
      });
    }
  }

  // Home chip tap: the saved-address book if we have any, else the map picker.
  Future<void> _editAddress() async {
    if (_address == null) {
      await _openMapPicker();
    } else {
      final result = await showAddressBookSheet(context);
      if (result != null && mounted) setState(() => _address = result);
    }
  }

  Future<void> _openMapPicker() async {
    final result = await Navigator.of(context).push<SavedAddress>(
      MaterialPageRoute(builder: (_) => const AddressMapScreen()),
    );
    if (result != null && mounted) setState(() => _address = result);
  }

  Future<void> _reload() async {
    setState(() => _future = context.read<Api>().stores());
    await _future;
  }

  Widget _buildTopLogoHeader() {
    return Container(
      color: Brand.ink,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Image.asset('assets/logo.png', width: 30, height: 30, fit: BoxFit.contain),
            ),
            const SizedBox(width: 10),
            const Text(
              'xarid',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 22,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              'tezkor',
              style: TextStyle(
                color: Brand.green,
                fontWeight: FontWeight.w800,
                fontSize: 22,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressSelector() {
    final hasAddress = _address != null;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: InkWell(
        onTap: _editAddress,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Brand.card,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Brand.border.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              const Icon(Icons.location_on_rounded, color: Brand.green, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  hasAddress ? _address!.chip : 'Yetkazish manzilini tanlang',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: hasAddress ? Brand.ink : Brand.inkSoft,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.keyboard_arrow_down_rounded, color: Brand.inkSoft, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: TextField(
        onChanged: (val) {
          setState(() {
            _searchQuery = val;
          });
        },
        style: const TextStyle(fontWeight: FontWeight.w600, color: Brand.ink),
        decoration: InputDecoration(
          hintText: 'Qidiruv',
          hintStyle: const TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600),
          prefixIcon: const Icon(Icons.search, color: Brand.inkSoft, size: 22),
          filled: true,
          fillColor: Brand.card,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  // Data-driven category strip: the categories are the union of what the loaded
  // stores actually carry (see build()), so tapping one genuinely filters the
  // list. Hidden entirely when the catalog reports no categories.
  Widget _buildCategoriesSlider(List<String> categories) {
    if (categories.isEmpty) return const SizedBox.shrink();
    return Container(
      height: 100,
      margin: const EdgeInsets.only(top: 16, bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 14.0),
            child: InkWell(
              onTap: () => setState(() => _selectedCategory = isSelected ? null : cat),
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                width: 72,
                child: Column(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: isSelected ? Brand.green.withValues(alpha: 0.15) : Brand.card,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? Brand.green : Brand.border.withValues(alpha: 0.5),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Icon(_categoryIcon(cat),
                          color: isSelected ? Brand.green : Brand.inkSoft, size: 26),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      cat,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                        color: isSelected ? Brand.green : Brand.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // Maps a catalog category (Uzbek, from the DB) to a representative icon.
  IconData _categoryIcon(String c) {
    switch (c) {
      case 'Mevalar':
        return Icons.apple;
      case 'Sabzavotlar':
        return Icons.eco;
      case "Ko'katlar":
        return Icons.grass;
      case 'Poliz ekinlari':
        return Icons.spa;
      case 'Sut va tuxum':
      case 'Sut mahsulotlari':
        return Icons.egg_alt;
      case 'Non':
        return Icons.bakery_dining;
      case "Go'sht":
        return Icons.set_meal;
      case 'Ichimliklar':
        return Icons.local_drink;
      case 'Quruq mahsulotlar':
        return Icons.rice_bowl;
      default:
        return Icons.shopping_basket;
    }
  }

  Widget _buildFilterPills() {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _filterTextPill(
            label: 'Chegirmalar',
            icon: Icons.percent_rounded,
            iconColor: Colors.pinkAccent,
            isActive: _onlyDiscounts,
            onTap: () => setState(() => _onlyDiscounts = !_onlyDiscounts),
          ),
          const SizedBox(width: 8),
          _filterTextPill(
            label: 'Tez yetkazish',
            icon: Icons.bolt_rounded,
            iconColor: Brand.green,
            isActive: _fastOnly,
            onTap: () => setState(() => _fastOnly = !_fastOnly),
          ),
        ],
      ),
    );
  }

  Widget _filterTextPill({
    required String label,
    required IconData icon,
    required Color iconColor,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? Brand.green.withValues(alpha: 0.1) : Brand.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? Brand.green : Brand.border.withValues(alpha: 0.5),
            width: isActive ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isActive ? Brand.green : iconColor, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isActive ? Brand.green : Brand.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoreCountHeader(int count) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$count ta xarid joyi topildi',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Brand.ink,
            ),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _searchQuery = '';
                _onlyDiscounts = false;
                _fastOnly = false;
                _selectedCategory = null;
              });
            },
            style: TextButton.styleFrom(
              backgroundColor: Brand.card,
              foregroundColor: Brand.ink,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
            child: const Text(
              'Qayta sozlash',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.ink,
      body: Column(
        children: [
          _buildTopLogoHeader(),
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: Brand.cream,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              clipBehavior: Clip.antiAlias,
              child: RefreshIndicator(
                onRefresh: _reload,
                color: Brand.green,
                child: FutureBuilder<List<Store>>(
                  future: _future,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const _StoresSkeleton();
                    }
                    if (snap.hasError) {
                      return EmptyMessage(
                          icon: Icons.cloud_off,
                          text: 'Hozircha ulanib bo\'lmadi.',
                          onRetry: _reload,
                          scrollable: true);
                    }
                    final stores = snap.data ?? [];

                    if (stores.isEmpty) {
                      return const EmptyMessage(
                          icon: Icons.storefront,
                          text: 'Hozircha do\'kon yo\'q.',
                          scrollable: true);
                    }

                    // The category strip is the union of categories the loaded
                    // stores actually carry, so every chip filters to a
                    // non-empty result.
                    final categories = <String>{
                      for (final s in stores) ...s.categories,
                    }.toList()
                      ..sort();

                    // Apply search + category + discount + fast-delivery filters.
                    final q = _searchQuery.trim().toLowerCase();
                    final filteredStores = stores.where((s) {
                      final matchesSearch = q.isEmpty || s.name.toLowerCase().contains(q);
                      final matchesDiscount = !_onlyDiscounts || s.discountPct != null;
                      final matchesCategory =
                          _selectedCategory == null || s.categories.contains(_selectedCategory);
                      final matchesFast = !_fastOnly || (s.etaMax != null && s.etaMax! <= 30);
                      return matchesSearch && matchesDiscount && matchesCategory && matchesFast;
                    }).toList();

                    return ListView.builder(
                      padding: EdgeInsets.zero,
                      itemCount: 5 + filteredStores.length,
                      itemBuilder: (context, index) {
                        if (index == 0) return _buildAddressSelector();
                        if (index == 1) return _buildSearchBar();
                        if (index == 2) return _buildCategoriesSlider(categories);
                        if (index == 3) return _buildFilterPills();
                        if (index == 4) return _buildStoreCountHeader(filteredStores.length);

                        final store = filteredStores[index - 5];
                        return _StoreCard(store: store);
                      },
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreCard extends StatelessWidget {
  final Store store;
  const _StoreCard({required this.store});

  @override
  Widget build(BuildContext context) {
    final eta = store.etaText() ?? "25 - 35 daq";
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => StoreScreen(storeId: store.id)),
      ),
      child: Container(
        margin: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
        decoration: BoxDecoration(
          color: Brand.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Brand.border, width: 0.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: AppImage(url: store.image),
                ),
                Positioned(
                  left: 12,
                  top: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.yellowAccent.shade400,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '2+1',
                          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 18, height: 1.1),
                        ),
                        Text(
                          'Ba\'zi tovarlarga',
                          style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.w700, fontSize: 10, height: 1.1),
                        ),
                      ],
                    ),
                  ),
                ),
                if (store.discountPct != null)
                  Positioned(
                    left: 12,
                    top: 60,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: Brand.amber, borderRadius: BorderRadius.circular(999)),
                      child: Text(
                        '-${store.discountPct}%',
                        style: const TextStyle(color: Brand.onAccent, fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                    ),
                  ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Brand.ink.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      eta,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          store.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Brand.ink),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Row(
                        children: [
                          Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                          SizedBox(width: 4),
                          Text(
                            '4.8',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Brand.ink),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Do\'konlar · Mahsulotlar',
                    style: TextStyle(color: Brand.inkSoft, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Brand.border, width: 0.5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.percent_rounded, color: Colors.pinkAccent, size: 14),
                        const SizedBox(width: 6),
                        const Expanded(
                          child: Text(
                            'Ayrim taomlarga -99% gacha chegirma',
                            style: TextStyle(
                              color: Colors.pinkAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Icon(Icons.keyboard_arrow_right_rounded, color: Colors.pinkAccent.withValues(alpha: 0.5), size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StoresSkeleton extends StatelessWidget {
  const _StoresSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 5,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(
          color: Brand.cream,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Brand.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(aspectRatio: 16 / 9, child: Pulse(radius: 0)),
            Padding(
              padding: EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Pulse(width: 160, height: 16),
                  SizedBox(height: 10),
                  Pulse(width: 110, height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
