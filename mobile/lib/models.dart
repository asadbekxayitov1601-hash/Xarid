class AppUser {
  final String id;
  final String? name;
  final String? phone;
  final String role;
  final bool isSeller;
  AppUser({required this.id, this.name, this.phone, required this.role, this.isSeller = false});

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        name: j['name'] as String?,
        phone: j['phone'] as String?,
        role: (j['role'] as String?) ?? 'OWNER',
        isSeller: (j['isSeller'] as bool?) ?? false,
      );
}

class Store {
  final String id;
  final String name;
  final String? image;
  final int? discountPct;
  final int? etaMin;
  final int? etaMax;
  final int productCount;
  Store({
    required this.id,
    required this.name,
    this.image,
    this.discountPct,
    this.etaMin,
    this.etaMax,
    this.productCount = 0,
  });

  factory Store.fromJson(Map<String, dynamic> j) => Store(
        id: j['id'] as String,
        name: j['name'] as String,
        image: j['image'] as String?,
        discountPct: j['discountPct'] as int?,
        etaMin: j['etaMin'] as int?,
        etaMax: j['etaMax'] as int?,
        productCount: (j['productCount'] as int?) ?? 0,
      );

  String? etaText() {
    if (etaMin != null && etaMax != null) return '$etaMin-$etaMax daq';
    if (etaMin != null) return '~$etaMin daq';
    if (etaMax != null) return '~$etaMax daq';
    return null;
  }
}

class Product {
  final String offerId;
  final String productId;
  final String nameUz;
  final String nameRu;
  final String category;
  final String unit;
  final String? image;
  final int price;
  final int? discountPct;
  final int discountedPrice;
  final double minQty;
  Product({
    required this.offerId,
    required this.productId,
    required this.nameUz,
    required this.nameRu,
    required this.category,
    required this.unit,
    this.image,
    required this.price,
    this.discountPct,
    required this.discountedPrice,
    this.minQty = 0,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        offerId: j['offerId'] as String,
        productId: j['productId'] as String,
        nameUz: j['nameUz'] as String,
        nameRu: (j['nameRu'] as String?) ?? j['nameUz'] as String,
        category: (j['category'] as String?) ?? '',
        unit: (j['unit'] as String?) ?? 'KG',
        image: j['image'] as String?,
        price: (j['price'] as num).toInt(),
        discountPct: j['discountPct'] as int?,
        discountedPrice: (j['discountedPrice'] as num?)?.toInt() ?? (j['price'] as num).toInt(),
        minQty: ((j['minQty'] as num?) ?? 0).toDouble(),
      );

  bool get hasDiscount => discountedPrice < price;

  String get unitLabel {
    switch (unit) {
      case 'KG':
        return 'kg';
      case 'LITER':
        return 'litr';
      case 'PIECE':
        return 'dona';
      case 'BLOCK':
        return 'blok';
      default:
        return unit.toLowerCase();
    }
  }
}

class OrderSummary {
  final String id;
  final String status;
  final int total;
  final int deliveryFee;
  final String address;
  final int itemCount;
  OrderSummary({
    required this.id,
    required this.status,
    required this.total,
    required this.deliveryFee,
    required this.address,
    required this.itemCount,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> j) => OrderSummary(
        id: j['id'] as String,
        status: (j['status'] as String?) ?? 'PLACED',
        total: (j['total'] as num?)?.toInt() ?? 0,
        deliveryFee: (j['deliveryFee'] as num?)?.toInt() ?? 0,
        address: (j['address'] as String?) ?? '',
        itemCount: (j['itemCount'] as num?)?.toInt() ?? 0,
      );

  String get statusLabel {
    switch (status) {
      case 'PLACED':
        return 'Joylashtirildi';
      case 'CONFIRMED':
        return 'Tasdiqlandi';
      case 'DELIVERING':
        return 'Yetkazilmoqda';
      case 'DELIVERED':
        return 'Yetkazildi';
      case 'CANCELLED':
        return 'Bekor qilindi';
      default:
        return status;
    }
  }
}
