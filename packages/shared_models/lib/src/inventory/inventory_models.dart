enum StockTransactionType {
  purchase,
  adjustmentIn,
  adjustmentOut,
  consumption,
  transferIn,
  transferOut,
  wastage,
  returnStock;

  static StockTransactionType fromJson(String value) => switch (value) {
    'PURCHASE' => purchase,
    'ADJUSTMENT_IN' => adjustmentIn,
    'ADJUSTMENT_OUT' => adjustmentOut,
    'CONSUMPTION' => consumption,
    'TRANSFER_IN' => transferIn,
    'TRANSFER_OUT' => transferOut,
    'WASTAGE' => wastage,
    'RETURN' => returnStock,
    _ => throw FormatException('Unknown stock transaction type: $value'),
  };

  String get wireName => switch (this) {
    purchase => 'PURCHASE',
    adjustmentIn => 'ADJUSTMENT_IN',
    adjustmentOut => 'ADJUSTMENT_OUT',
    consumption => 'CONSUMPTION',
    transferIn => 'TRANSFER_IN',
    transferOut => 'TRANSFER_OUT',
    wastage => 'WASTAGE',
    returnStock => 'RETURN',
  };
}

enum PurchaseOrderStatus {
  draft,
  pending,
  approved,
  received,
  cancelled;

  static PurchaseOrderStatus fromJson(String value) =>
      PurchaseOrderStatus.values.byName(value.toLowerCase());
}

enum InventoryAlertType {
  lowStock,
  outOfStock,
  expiryWarning,
  negativeStock;

  static InventoryAlertType fromJson(String value) => switch (value) {
    'LOW_STOCK' => lowStock,
    'OUT_OF_STOCK' => outOfStock,
    'EXPIRY_WARNING' => expiryWarning,
    'NEGATIVE_STOCK' => negativeStock,
    _ => throw FormatException('Unknown inventory alert type: $value'),
  };
}

class InventoryCategory {
  const InventoryCategory({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.isActive,
    this.description,
  });

  factory InventoryCategory.fromJson(Map<String, dynamic> json) =>
      InventoryCategory(
        id: _string(json, 'id'),
        tenantId: _string(json, 'tenantId'),
        name: _string(json, 'name'),
        description: json['description'] as String?,
        isActive: json['isActive'] as bool? ?? true,
      );

  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final bool isActive;
}

class UnitOfMeasure {
  const UnitOfMeasure({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.code,
    required this.baseUnit,
    required this.conversionFactor,
  });

  factory UnitOfMeasure.fromJson(Map<String, dynamic> json) => UnitOfMeasure(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    name: _string(json, 'name'),
    code: _string(json, 'code'),
    baseUnit: json['baseUnit'] as bool? ?? false,
    conversionFactor: _number(json, 'conversionFactor'),
  );

  final String id;
  final String tenantId;
  final String name;
  final String code;
  final bool baseUnit;
  final double conversionFactor;
}

class Ingredient {
  const Ingredient({
    required this.id,
    required this.tenantId,
    required this.categoryId,
    required this.unitId,
    required this.name,
    required this.sku,
    required this.costPrice,
    required this.reorderLevel,
    required this.minimumStock,
    required this.trackExpiry,
    required this.isActive,
    this.barcode,
    this.description,
    this.maximumStock,
    this.category,
    this.unit,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) => Ingredient(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    categoryId: _string(json, 'categoryId'),
    unitId: _string(json, 'unitId'),
    name: _string(json, 'name'),
    sku: _string(json, 'sku'),
    barcode: json['barcode'] as String?,
    description: json['description'] as String?,
    costPrice: _int(json, 'costPrice'),
    reorderLevel: _number(json, 'reorderLevel'),
    minimumStock: _number(json, 'minimumStock'),
    maximumStock: _nullableNumber(json['maximumStock']),
    trackExpiry: json['trackExpiry'] as bool? ?? false,
    isActive: json['isActive'] as bool? ?? true,
    category: _object(json['category'], InventoryCategory.fromJson),
    unit: _object(json['unit'], UnitOfMeasure.fromJson),
  );

  final String id;
  final String tenantId;
  final String categoryId;
  final String unitId;
  final String name;
  final String sku;
  final String? barcode;
  final String? description;
  final int costPrice;
  final double reorderLevel;
  final double minimumStock;
  final double? maximumStock;
  final bool trackExpiry;
  final bool isActive;
  final InventoryCategory? category;
  final UnitOfMeasure? unit;
}

class InventoryBatch {
  const InventoryBatch({
    required this.id,
    required this.batchNumber,
    required this.quantity,
    this.manufacturingDate,
    this.expiryDate,
  });

  factory InventoryBatch.fromJson(Map<String, dynamic> json) => InventoryBatch(
    id: _string(json, 'id'),
    batchNumber: _string(json, 'batchNumber'),
    quantity: _number(json, 'quantity'),
    manufacturingDate: _date(json['manufacturingDate']),
    expiryDate: _date(json['expiryDate']),
  );

  final String id;
  final String batchNumber;
  final double quantity;
  final DateTime? manufacturingDate;
  final DateTime? expiryDate;
}

class InventoryStock {
  const InventoryStock({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.ingredientId,
    required this.availableQuantity,
    required this.reservedQuantity,
    required this.damagedQuantity,
    required this.lastStockUpdate,
    required this.ingredient,
    this.batches = const <InventoryBatch>[],
  });

  factory InventoryStock.fromJson(Map<String, dynamic> json) => InventoryStock(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    ingredientId: _string(json, 'ingredientId'),
    availableQuantity: _number(json, 'availableQuantity'),
    reservedQuantity: _number(json, 'reservedQuantity'),
    damagedQuantity: _number(json, 'damagedQuantity'),
    lastStockUpdate: DateTime.parse(_string(json, 'lastStockUpdate')),
    ingredient: Ingredient.fromJson(_map(json, 'ingredient')),
    batches: _objects(json['batches'], InventoryBatch.fromJson),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String ingredientId;
  final double availableQuantity;
  final double reservedQuantity;
  final double damagedQuantity;
  final DateTime lastStockUpdate;
  final Ingredient ingredient;
  final List<InventoryBatch> batches;
}

class StockTransaction {
  const StockTransaction({
    required this.id,
    required this.outletId,
    required this.ingredientId,
    required this.transactionType,
    required this.quantity,
    required this.unitCost,
    required this.performedByUserId,
    required this.createdAt,
    this.referenceType,
    this.referenceId,
    this.notes,
  });

  factory StockTransaction.fromJson(Map<String, dynamic> json) =>
      StockTransaction(
        id: _string(json, 'id'),
        outletId: _string(json, 'outletId'),
        ingredientId: _string(json, 'ingredientId'),
        transactionType: StockTransactionType.fromJson(
          _string(json, 'transactionType'),
        ),
        quantity: _number(json, 'quantity'),
        unitCost: _int(json, 'unitCost'),
        referenceType: json['referenceType'] as String?,
        referenceId: json['referenceId'] as String?,
        notes: json['notes'] as String?,
        performedByUserId: _string(json, 'performedByUserId'),
        createdAt: DateTime.parse(_string(json, 'createdAt')),
      );

  final String id;
  final String outletId;
  final String ingredientId;
  final StockTransactionType transactionType;
  final double quantity;
  final int unitCost;
  final String? referenceType;
  final String? referenceId;
  final String? notes;
  final String performedByUserId;
  final DateTime createdAt;
}

class Vendor {
  const Vendor({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.isActive,
    this.email,
    this.phone,
    this.gstNumber,
    this.address,
    this.contactPerson,
  });

  factory Vendor.fromJson(Map<String, dynamic> json) => Vendor(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    name: _string(json, 'name'),
    email: json['email'] as String?,
    phone: json['phone'] as String?,
    gstNumber: json['gstNumber'] as String?,
    address: json['address'] as String?,
    contactPerson: json['contactPerson'] as String?,
    isActive: json['isActive'] as bool? ?? true,
  );

  final String id;
  final String tenantId;
  final String name;
  final String? email;
  final String? phone;
  final String? gstNumber;
  final String? address;
  final String? contactPerson;
  final bool isActive;
}

class PurchaseOrderItem {
  const PurchaseOrderItem({
    required this.id,
    required this.ingredientId,
    required this.quantity,
    required this.unitCost,
    required this.lineTotal,
    required this.ingredient,
  });

  factory PurchaseOrderItem.fromJson(Map<String, dynamic> json) =>
      PurchaseOrderItem(
        id: _string(json, 'id'),
        ingredientId: _string(json, 'ingredientId'),
        quantity: _number(json, 'quantity'),
        unitCost: _int(json, 'unitCost'),
        lineTotal: _int(json, 'lineTotal'),
        ingredient: Ingredient.fromJson(_map(json, 'ingredient')),
      );

  final String id;
  final String ingredientId;
  final double quantity;
  final int unitCost;
  final int lineTotal;
  final Ingredient ingredient;
}

class PurchaseOrder {
  const PurchaseOrder({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.vendorId,
    required this.poNumber,
    required this.status,
    required this.orderDate,
    required this.subtotal,
    required this.taxAmount,
    required this.grandTotal,
    required this.vendor,
    required this.items,
    this.expectedDate,
    this.notes,
    this.receivedAt,
  });

  factory PurchaseOrder.fromJson(Map<String, dynamic> json) => PurchaseOrder(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    outletId: _string(json, 'outletId'),
    vendorId: _string(json, 'vendorId'),
    poNumber: _string(json, 'poNumber'),
    status: PurchaseOrderStatus.fromJson(_string(json, 'status')),
    orderDate: DateTime.parse(_string(json, 'orderDate')),
    expectedDate: _date(json['expectedDate']),
    subtotal: _int(json, 'subtotal'),
    taxAmount: _int(json, 'taxAmount'),
    grandTotal: _int(json, 'grandTotal'),
    notes: json['notes'] as String?,
    receivedAt: _date(json['receivedAt']),
    vendor: Vendor.fromJson(_map(json, 'vendor')),
    items: _objects(json['items'], PurchaseOrderItem.fromJson),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String vendorId;
  final String poNumber;
  final PurchaseOrderStatus status;
  final DateTime orderDate;
  final DateTime? expectedDate;
  final int subtotal;
  final int taxAmount;
  final int grandTotal;
  final String? notes;
  final DateTime? receivedAt;
  final Vendor vendor;
  final List<PurchaseOrderItem> items;
}

class InventoryAlert {
  const InventoryAlert({
    required this.id,
    required this.outletId,
    required this.ingredientId,
    required this.alertType,
    required this.message,
    required this.isResolved,
    required this.createdAt,
    required this.ingredient,
  });

  factory InventoryAlert.fromJson(Map<String, dynamic> json) => InventoryAlert(
    id: _string(json, 'id'),
    outletId: _string(json, 'outletId'),
    ingredientId: _string(json, 'ingredientId'),
    alertType: InventoryAlertType.fromJson(_string(json, 'alertType')),
    message: _string(json, 'message'),
    isResolved: json['isResolved'] as bool? ?? false,
    createdAt: DateTime.parse(_string(json, 'createdAt')),
    ingredient: Ingredient.fromJson(_map(json, 'ingredient')),
  );

  final String id;
  final String outletId;
  final String ingredientId;
  final InventoryAlertType alertType;
  final String message;
  final bool isResolved;
  final DateTime createdAt;
  final Ingredient ingredient;
}

class InventoryValuationItem {
  const InventoryValuationItem({
    required this.ingredientId,
    required this.ingredientName,
    required this.outletId,
    required this.quantity,
    required this.unitCost,
    required this.value,
  });

  factory InventoryValuationItem.fromJson(Map<String, dynamic> json) =>
      InventoryValuationItem(
        ingredientId: _string(json, 'ingredientId'),
        ingredientName: _string(json, 'ingredientName'),
        outletId: _string(json, 'outletId'),
        quantity: _number(json, 'quantity'),
        unitCost: _int(json, 'unitCost'),
        value: _int(json, 'value'),
      );

  final String ingredientId;
  final String ingredientName;
  final String outletId;
  final double quantity;
  final int unitCost;
  final int value;
}

class InventoryValuation {
  const InventoryValuation({
    required this.totalInventoryValue,
    required this.totalIngredients,
    required this.items,
  });

  factory InventoryValuation.fromJson(Map<String, dynamic> json) =>
      InventoryValuation(
        totalInventoryValue: _int(json, 'totalInventoryValue'),
        totalIngredients: _int(json, 'totalIngredients'),
        items: _objects(json['items'], InventoryValuationItem.fromJson),
      );

  final int totalInventoryValue;
  final int totalIngredients;
  final List<InventoryValuationItem> items;
}

String _string(Map<String, dynamic> json, String key) => json[key] is String
    ? json[key] as String
    : throw FormatException('Expected $key');
int _int(Map<String, dynamic> json, String key) => json[key] is num
    ? (json[key] as num).toInt()
    : throw FormatException('Expected $key');
double _number(Map<String, dynamic> json, String key) =>
    _nullableNumber(json[key]) ?? (throw FormatException('Expected $key'));
double? _nullableNumber(Object? value) => value is num
    ? value.toDouble()
    : value is String
    ? double.tryParse(value)
    : null;
Map<String, dynamic> _map(Map<String, dynamic> json, String key) =>
    json[key] is Map
    ? Map<String, dynamic>.from(json[key] as Map)
    : throw FormatException('Expected $key');
T? _object<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    value is Map ? parser(Map<String, dynamic>.from(value)) : null;
List<T> _objects<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    value is List
    ? value
          .map((item) => parser(Map<String, dynamic>.from(item as Map)))
          .toList(growable: false)
    : <T>[];
DateTime? _date(Object? value) =>
    value is String ? DateTime.tryParse(value) : null;
