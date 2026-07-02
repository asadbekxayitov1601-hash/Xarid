import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../theme.dart';
import '../../services/address_service.dart';
import '../../services/geocoding_service.dart';
import '../../services/location_service.dart';
import 'address_details_screen.dart';

/// Kokand (Qoʻqon) centre — the map's fallback focus before a GPS fix.
const LatLng _kokandCenter = LatLng(40.5286, 70.9425);

/// Map pin picker (Yandex/Uzum style): a fixed marker sits at the screen centre
/// while the user pans the map underneath it; the point under the pin is
/// reverse-geocoded to a street. "Manzilni tasdiqlash" carries the resolved
/// point into the address-details screen. Returns the saved [SavedAddress].
class AddressMapScreen extends StatefulWidget {
  final SavedAddress? initial;
  const AddressMapScreen({super.key, this.initial});

  @override
  State<AddressMapScreen> createState() => _AddressMapScreenState();
}

class _AddressMapScreenState extends State<AddressMapScreen> {
  final _map = MapController();
  final _searchController = TextEditingController();
  LatLng _center = _kokandCenter;
  GeoPlace? _place;
  bool _resolving = false;
  bool _searching = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final init = widget.initial;
    if (init?.lat != null && init?.lng != null) {
      _center = LatLng(init!.lat!, init.lng!);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _startup());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _map.dispose();
    super.dispose();
  }

  Future<void> _startup() async {
    // Center on the user's GPS on first open (unless editing an existing pin).
    if (widget.initial?.lat == null) {
      try {
        if (await LocationService.instance.ensurePermission()) {
          final pos = await Geolocator.getCurrentPosition();
          _center = LatLng(pos.latitude, pos.longitude);
          _map.move(_center, 17);
        }
      } catch (_) {/* keep Kokand */}
    }
    _resolve();
  }

  void _onPositionChanged(MapCamera camera, bool hasGesture) {
    _center = camera.center;
    if (!hasGesture) return;
    // Debounce so we only reverse-geocode once the pan settles.
    _debounce?.cancel();
    setState(() => _resolving = true);
    _debounce = Timer(const Duration(milliseconds: 650), _resolve);
  }

  Future<void> _resolve() async {
    setState(() => _resolving = true);
    final place = await GeocodingService.reverse(_center.latitude, _center.longitude);
    if (!mounted) return;
    setState(() {
      _place = place;
      _resolving = false;
    });
  }

  Future<void> _recenter() async {
    try {
      if (!await LocationService.instance.ensurePermission()) return;
      final pos = await Geolocator.getCurrentPosition();
      final p = LatLng(pos.latitude, pos.longitude);
      _map.move(p, 17);
      _center = p;
      _resolve();
    } catch (_) {}
  }

  Future<void> _runSearch(String q) async {
    if (q.trim().isEmpty) return;
    setState(() => _searching = true);
    final place = await GeocodingService.search(q);
    if (!mounted) return;
    setState(() => _searching = false);
    if (place != null) {
      final p = LatLng(place.lat, place.lng);
      _map.move(p, 17);
      _center = p;
      setState(() => _place = place);
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Manzil topilmadi')));
    }
  }

  Future<void> _confirm() async {
    final draft = (widget.initial ?? SavedAddress(id: AddressService.newId())).copyWith(
      street: _place?.street ?? '',
      city: _place?.city ?? '',
      lat: _center.latitude,
      lng: _center.longitude,
    );
    final saved = await Navigator.of(context).push<SavedAddress>(
      MaterialPageRoute(builder: (_) => AddressDetailsScreen(draft: draft)),
    );
    if (saved != null && mounted) Navigator.of(context).pop(saved);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: 17,
              minZoom: 4,
              maxZoom: 18,
              onPositionChanged: _onPositionChanged,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'uz.xarid.app',
              ),
            ],
          ),

          // Fixed centre pin (the map moves under it).
          const Center(child: _CenterPin()),

          // Top: back + search.
          SafeArea(child: _topBar()),

          // "Is the marker right?" hint, above the pin.
          const Align(
            alignment: Alignment(0, -0.22),
            child: _HintCard(),
          ),

          // My-location FAB, sitting just above the confirm sheet.
          Positioned(
            right: 16,
            bottom: 210,
            child: FloatingActionButton.small(
              heroTag: 'recenter_addr',
              backgroundColor: Colors.white,
              foregroundColor: Brand.green,
              onPressed: _recenter,
              child: const Icon(Icons.navigation_rounded),
            ),
          ),

          // Bottom confirm sheet.
          Align(alignment: Alignment.bottomCenter, child: _confirmSheet()),
        ],
      ),
    );
  }

  Widget _topBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Row(
        children: [
          _circleButton(Icons.arrow_back, () => Navigator.of(context).maybePop()),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(999),
                boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 10, offset: Offset(0, 2))],
              ),
              child: Row(
                children: [
                  _searching
                      ? const SizedBox(
                          width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Brand.green))
                      : const Icon(Icons.search, color: Brand.inkSoft, size: 22),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      textInputAction: TextInputAction.search,
                      onSubmitted: _runSearch,
                      decoration: const InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        hintText: 'Qidiruv',
                        hintStyle: TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600),
                      ),
                      style: const TextStyle(fontWeight: FontWeight.w600, color: Brand.ink),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 48, height: 48, child: Icon(icon, color: Brand.ink)),
      ),
    );
  }

  Widget _confirmSheet() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Brand.cream,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Color(0x1A000000), blurRadius: 16, offset: Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Qayerga yetkazib berilsin?',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Brand.ink)),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    width: 44, height: 44,
                    decoration: const BoxDecoration(color: Brand.card, shape: BoxShape.circle),
                    child: const Icon(Icons.home_rounded, color: Brand.ink, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _resolving
                        ? const _AddressLineLoading()
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _place?.street.isNotEmpty == true ? _place!.street : 'Xaritada joyni belgilang',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Brand.ink),
                              ),
                              if (_place?.city.isNotEmpty == true)
                                Text(_place!.city, style: const TextStyle(color: Brand.inkSoft)),
                            ],
                          ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _resolving ? null : _confirm,
                child: const Text('Manzilni tasdiqlash'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddressLineLoading extends StatelessWidget {
  const _AddressLineLoading();
  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Brand.green)),
        SizedBox(width: 10),
        Text('Manzil aniqlanmoqda...', style: TextStyle(color: Brand.inkSoft, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _HintCard extends StatelessWidget {
  const _HintCard();
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 14, offset: Offset(0, 4))],
      ),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text("Hammasi to'g'rimi?",
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Brand.ink)),
          SizedBox(height: 4),
          Text(
            'Marker kirish joyida ekanligiga ishonch hosil qiling va manzilni tasdiqlang',
            textAlign: TextAlign.center,
            style: TextStyle(color: Brand.inkSoft, height: 1.3, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

/// The fixed centre marker: a dark pill + home icon with a pointer tail, lifted
/// so the tail tip rests exactly on the map centre.
class _CenterPin extends StatelessWidget {
  const _CenterPin();
  @override
  Widget build(BuildContext context) {
    return Transform.translate(
      offset: const Offset(0, -26),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52, height: 52,
            decoration: const BoxDecoration(
              color: Brand.ink,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 3))],
            ),
            child: const Icon(Icons.home_rounded, color: Colors.white, size: 26),
          ),
          Transform.translate(
            offset: const Offset(0, -4),
            child: Transform.rotate(
              angle: 0.785398, // 45deg -> a diamond tail forming the pointer
              child: Container(width: 14, height: 14, color: Brand.ink),
            ),
          ),
        ],
      ),
    );
  }
}
