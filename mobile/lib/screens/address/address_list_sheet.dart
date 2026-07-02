import 'package:flutter/material.dart';
import '../../theme.dart';
import '../../services/address_service.dart';
import 'address_map_screen.dart';
import 'address_details_screen.dart';

/// The saved-address book ("Manzillar"): pick one for delivery, edit its
/// details, or add a new one via the map picker. Resolves to the address the
/// user selected (or the latest state) so the home screen can refresh its chip.
Future<SavedAddress?> showAddressBookSheet(BuildContext context) {
  return showModalBottomSheet<SavedAddress>(
    context: context,
    backgroundColor: Brand.cream,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => const _AddressListSheet(),
  );
}

class _AddressListSheet extends StatefulWidget {
  const _AddressListSheet();
  @override
  State<_AddressListSheet> createState() => _AddressListSheetState();
}

class _AddressListSheetState extends State<_AddressListSheet> {
  AddressBook _book = const AddressBook();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final book = await AddressService.load();
    if (!mounted) return;
    setState(() {
      _book = book;
      _loading = false;
    });
  }

  Future<void> _select(SavedAddress a) async {
    await AddressService.select(a.id);
    if (!mounted) return;
    Navigator.of(context).pop(a);
  }

  Future<void> _addNew() async {
    final saved = await Navigator.of(context).push<SavedAddress>(
      MaterialPageRoute(builder: (_) => const AddressMapScreen()),
    );
    if (saved != null && mounted) Navigator.of(context).pop(saved);
  }

  Future<void> _edit(SavedAddress a) async {
    final saved = await Navigator.of(context).push<SavedAddress>(
      MaterialPageRoute(builder: (_) => AddressDetailsScreen(draft: a)),
    );
    if (saved != null && mounted) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Brand.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Manzillar',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Brand.ink)),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(color: Brand.green)),
              )
            else if (_book.addresses.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Text('Saqlangan manzil yoʻq', style: TextStyle(color: Brand.inkSoft)),
              )
            else
              ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _book.addresses.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: Brand.border),
                  itemBuilder: (_, i) {
                    final a = _book.addresses[i];
                    final selected = a.id == _book.selectedId;
                    return _AddressRow(
                      address: a,
                      selected: selected,
                      onTap: () => _select(a),
                      onEdit: () => _edit(a),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _addNew,
              icon: const Icon(Icons.add),
              label: const Text('Yangi manzil'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddressRow extends StatelessWidget {
  final SavedAddress address;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  const _AddressRow({
    required this.address,
    required this.selected,
    required this.onTap,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: selected ? Brand.green.withValues(alpha: 0.15) : Brand.card,
                shape: BoxShape.circle,
              ),
              child: Icon(address.icon, color: selected ? Brand.green : Brand.ink, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(address.label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: selected ? Brand.green : Brand.ink,
                      )),
                  Text(address.primaryLine,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Brand.inkSoft, fontSize: 13)),
                ],
              ),
            ),
            IconButton(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined, color: Brand.inkSoft, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}
