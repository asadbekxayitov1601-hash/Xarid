import 'package:flutter/foundation.dart';
import 'models.dart';

class BasketItem {
  final Product product;
  double qty;
  BasketItem(this.product, this.qty);
}

// Local shopping basket, keyed by offerId. Prices shown use discountedPrice; the
// server recomputes the real total at checkout (the basket is just a list).
class Basket extends ChangeNotifier {
  final Map<String, BasketItem> _items = {};

  List<BasketItem> get items => _items.values.toList();
  int get count => _items.length;
  int get total =>
      _items.values.fold(0, (s, i) => s + (i.product.discountedPrice * i.qty).round());

  double qtyOf(String offerId) => _items[offerId]?.qty ?? 0;

  void setQty(Product p, double qty) {
    if (qty <= 0) {
      _items.remove(p.offerId);
    } else {
      _items[p.offerId] = BasketItem(p, qty);
    }
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  // Shape expected by POST /api/orders.
  List<Map<String, dynamic>> toOrderItems() =>
      _items.values.map((i) => {'offerId': i.product.offerId, 'qty': i.qty}).toList();
}
