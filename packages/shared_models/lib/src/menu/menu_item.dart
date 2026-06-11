import '../converters/date_time_converter.dart';

class MenuCategory {
  const MenuCategory({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.displayOrder,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.parentId,
    this.description,
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) {
    return MenuCategory(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      parentId: json['parentId'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      displayOrder: json['displayOrder'] as int,
      isActive: json['isActive'] as bool,
      createdAt: DateTimeConverter.fromJson(
        json['createdAt'],
        field: 'createdAt',
      ),
      updatedAt: DateTimeConverter.fromJson(
        json['updatedAt'],
        field: 'updatedAt',
      ),
    );
  }

  final String id;
  final String tenantId;
  final String? parentId;
  final String name;
  final String? description;
  final int displayOrder;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class MenuItemVariant {
  const MenuItemVariant({
    required this.id,
    required this.menuItemId,
    required this.name,
    required this.priceAdjustmentMinor,
    required this.isDefault,
  });

  factory MenuItemVariant.fromJson(Map<String, dynamic> json) {
    return MenuItemVariant(
      id: json['id'] as String,
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      priceAdjustmentMinor: json['priceAdjustment'] as int,
      isDefault: json['isDefault'] as bool,
    );
  }

  final String id;
  final String menuItemId;
  final String name;
  final int priceAdjustmentMinor;
  final bool isDefault;
}

class MenuItemAddon {
  const MenuItemAddon({
    required this.id,
    required this.menuItemId,
    required this.name,
    required this.priceMinor,
  });

  factory MenuItemAddon.fromJson(Map<String, dynamic> json) {
    return MenuItemAddon(
      id: json['id'] as String,
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      priceMinor: json['price'] as int,
    );
  }

  final String id;
  final String menuItemId;
  final String name;
  final int priceMinor;
}

class OutletMenuPrice {
  const OutletMenuPrice({
    required this.id,
    required this.outletId,
    required this.menuItemId,
    required this.priceMinor,
  });

  factory OutletMenuPrice.fromJson(Map<String, dynamic> json) {
    return OutletMenuPrice(
      id: json['id'] as String,
      outletId: json['outletId'] as String,
      menuItemId: json['menuItemId'] as String,
      priceMinor: json['price'] as int,
    );
  }

  final String id;
  final String outletId;
  final String menuItemId;
  final int priceMinor;
}

class MenuItem {
  const MenuItem({
    required this.id,
    required this.name,
    required this.priceMinor,
    this.tenantId = '',
    this.categoryId = '',
    this.kitchenCategoryId,
    this.category = '',
    this.emoji = '',
    this.description,
    this.sku,
    this.costPriceMinor,
    this.imageUrl,
    this.isVegetarian = false,
    this.isVegan = false,
    this.isAvailable = true,
    this.taxPercentage = 0,
    this.variants = const <MenuItemVariant>[],
    this.addons = const <MenuItemAddon>[],
    this.outletPrices = const <OutletMenuPrice>[],
    this.createdAt,
    this.updatedAt,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      categoryId: json['categoryId'] as String,
      kitchenCategoryId: json['kitchenCategoryId'] as String?,
      name: json['name'] as String,
      description: json['description'] as String?,
      sku: json['sku'] as String?,
      priceMinor: json['price'] as int,
      costPriceMinor: json['costPrice'] as int?,
      imageUrl: json['imageUrl'] as String?,
      isVegetarian: json['isVegetarian'] as bool,
      isVegan: json['isVegan'] as bool,
      isAvailable: json['isAvailable'] as bool,
      taxPercentage: (json['taxPercentage'] as num).toDouble(),
      variants: _list(json['variants'], MenuItemVariant.fromJson),
      addons: _list(json['addons'], MenuItemAddon.fromJson),
      outletPrices: _list(json['outletPrices'], OutletMenuPrice.fromJson),
      createdAt: DateTimeConverter.nullableFromJson(
        json['createdAt'],
        field: 'createdAt',
      ),
      updatedAt: DateTimeConverter.nullableFromJson(
        json['updatedAt'],
        field: 'updatedAt',
      ),
    );
  }

  final String id;
  final String tenantId;
  final String categoryId;
  final String? kitchenCategoryId;
  final String name;
  final String category;
  final String emoji;
  final String? description;
  final String? sku;
  final int priceMinor;
  final int? costPriceMinor;
  final String? imageUrl;
  final bool isVegetarian;
  final bool isVegan;
  final bool isAvailable;
  final double taxPercentage;
  final List<MenuItemVariant> variants;
  final List<MenuItemAddon> addons;
  final List<OutletMenuPrice> outletPrices;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}

List<T> _list<T>(
  Object? value,
  T Function(Map<String, dynamic> json) fromJson,
) {
  if (value is! List<dynamic>) {
    return <T>[];
  }
  return value
      .map<T>((item) {
        if (item is! Map<String, dynamic>) {
          throw const FormatException('Expected a JSON object.');
        }
        return fromJson(item);
      })
      .toList(growable: false);
}
