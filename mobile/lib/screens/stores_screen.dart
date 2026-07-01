import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../util.dart';
import '../widgets/skeleton.dart';
import 'store_screen.dart';

class CategoryItem {
  final String name;
  final String imageUrl;
  CategoryItem({required this.name, required this.imageUrl});
}

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  late Future<List<Store>> _future;
  String _searchQuery = '';
  bool _onlyDiscounts = false;
  bool _only1plus1 = false;
  String? _selectedCategory;

  final List<CategoryItem> _categories = [
    CategoryItem(
      name: 'Mevalar',
      imageUrl: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=100&auto=format&fit=crop',
    ),
    CategoryItem(
      name: 'Sabzavotlar',
      imageUrl: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=100&auto=format&fit=crop',
    ),
    CategoryItem(
      name: 'Ko\'katlar',
      imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=100&auto=format&fit=crop',
    ),
    CategoryItem(
      name: 'Poliz ekinlari',
      imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100&auto=format&fit=crop',
    ),
    CategoryItem(
      name: 'Quritilgan mevalar',
      imageUrl: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=100&auto=format&fit=crop',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _future = context.read<Api>().stores();
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
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Brand.green,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shopping_bag_rounded, color: Brand.onAccent, size: 20),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Manzilni almashtirish funksiyasi'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: Brand.ink,
                ),
              );
            },
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Brand.card,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Brand.border.withValues(alpha: 0.5)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.home_rounded, color: Colors.deepPurple, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Uy · Imom Buxoriy ko\'chasi, 25',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Brand.ink,
                      fontSize: 14,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.keyboard_arrow_down_rounded, color: Brand.inkSoft, size: 18),
                ],
              ),
            ),
          ),
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Brand.card,
                  shape: BoxShape.circle,
                  border: Border.all(color: Brand.border.withValues(alpha: 0.5)),
                ),
                child: const Icon(Icons.tune_rounded, color: Brand.ink, size: 20),
              ),
              Positioned(
                right: -2,
                top: -2,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Colors.redAccent,
                    shape: BoxShape.circle,
                  ),
                  child: const Text(
                    '1',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
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

  Widget _buildCategoriesSlider() {
    return Container(
      height: 110,
      margin: const EdgeInsets.only(top: 16, bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final isSelected = _selectedCategory == cat.name;
          return Padding(
            padding: const EdgeInsets.only(right: 18.0),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedCategory = isSelected ? null : cat.name;
                });
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: isSelected ? Brand.green.withValues(alpha: 0.15) : Brand.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? Brand.green : Brand.border.withValues(alpha: 0.5),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    padding: const EdgeInsets.all(6),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        cat.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.restaurant_rounded, color: Brand.inkSoft),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    cat.name,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                      color: isSelected ? Brand.green : Brand.ink,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFilterPills() {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _filterIconPill(Icons.swap_vert_rounded),
          const SizedBox(width: 8),
          _filterTextPill(
            label: 'Chegirmalar',
            icon: Icons.percent_rounded,
            iconColor: Colors.pinkAccent,
            isActive: _onlyDiscounts,
            onTap: () {
              setState(() {
                _onlyDiscounts = !_onlyDiscounts;
              });
            },
          ),
          const SizedBox(width: 8),
          _filterTextPill(
            label: '1+1 aksiyasi',
            icon: Icons.local_fire_department_rounded,
            iconColor: Colors.deepOrangeAccent,
            isActive: _only1plus1,
            onTap: () {
              setState(() {
                _only1plus1 = !_only1plus1;
              });
            },
          ),
          const SizedBox(width: 8),
          _filterTextPill(
            label: 'Yetkazib berish',
            icon: Icons.delivery_dining_rounded,
            iconColor: Brand.green,
            isActive: false,
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _filterIconPill(IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Brand.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Brand.border.withValues(alpha: 0.5)),
      ),
      child: Icon(icon, color: Brand.ink, size: 18),
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
                _only1plus1 = false;
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
                    
                    // Filter stores based on search query and active filter flags
                    final filteredStores = stores.where((s) {
                      final matchesSearch = s.name.toLowerCase().contains(_searchQuery.toLowerCase());
                      final matchesDiscount = !_onlyDiscounts || s.discountPct != null;
                      return matchesSearch && matchesDiscount;
                    }).toList();

                    if (snap.connectionState == ConnectionState.waiting) {
                      return ListView(
                        children: [
                          _buildAddressSelector(),
                          _buildSearchBar(),
                          _buildCategoriesSlider(),
                          _buildFilterPills(),
                          _buildStoreCountHeader(0),
                          const SizedBox(
                            height: 400,
                            child: _StoresSkeleton(),
                          ),
                        ],
                      );
                    }

                    if (stores.isEmpty) {
                      return const EmptyMessage(
                          icon: Icons.storefront,
                          text: 'Hozircha do\'kon yo\'q.',
                          scrollable: true);
                    }

                    return ListView.builder(
                      padding: EdgeInsets.zero,
                      itemCount: 5 + filteredStores.length,
                      itemBuilder: (context, index) {
                        if (index == 0) return _buildAddressSelector();
                        if (index == 1) return _buildSearchBar();
                        if (index == 2) return _buildCategoriesSlider();
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
