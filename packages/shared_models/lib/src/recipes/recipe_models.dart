import '../inventory/inventory_models.dart';

enum InventoryConsumptionTrigger {
  ready,
  completed;

  static InventoryConsumptionTrigger fromJson(String value) =>
      value == 'READY' ? ready : completed;
}

enum WastageReason {
  preparation,
  expired,
  damaged,
  spillage,
  qualityRejection,
  other;

  static WastageReason fromJson(String value) => switch (value) {
    'PREPARATION' => preparation,
    'EXPIRED' => expired,
    'DAMAGED' => damaged,
    'SPILLAGE' => spillage,
    'QUALITY_REJECTION' => qualityRejection,
    _ => other,
  };

  String get wireName => switch (this) {
    preparation => 'PREPARATION',
    expired => 'EXPIRED',
    damaged => 'DAMAGED',
    spillage => 'SPILLAGE',
    qualityRejection => 'QUALITY_REJECTION',
    other => 'OTHER',
  };
}

class RecipeIngredient {
  const RecipeIngredient({
    required this.id,
    required this.ingredientId,
    required this.unitId,
    required this.quantity,
    required this.wastagePercentage,
    this.notes,
    this.ingredient,
    this.unit,
  });

  factory RecipeIngredient.fromJson(Map<String, dynamic> json) =>
      RecipeIngredient(
        id: _string(json, 'id'),
        ingredientId: _string(json, 'ingredientId'),
        unitId: _string(json, 'unitId'),
        quantity: _number(json['quantity']),
        wastagePercentage: _number(json['wastagePercentage']),
        notes: json['notes'] as String?,
        ingredient: _object(json['ingredient'], Ingredient.fromJson),
        unit: _object(json['unit'], UnitOfMeasure.fromJson),
      );

  final String id;
  final String ingredientId;
  final String unitId;
  final double quantity;
  final double wastagePercentage;
  final String? notes;
  final Ingredient? ingredient;
  final UnitOfMeasure? unit;
}

class RecipeCostSnapshot {
  const RecipeCostSnapshot({
    required this.id,
    required this.calculatedCost,
    required this.calculatedAt,
    required this.ingredientBreakdown,
  });

  factory RecipeCostSnapshot.fromJson(Map<String, dynamic> json) =>
      RecipeCostSnapshot(
        id: _string(json, 'id'),
        calculatedCost: _integer(json['calculatedCost']),
        calculatedAt: DateTime.parse(_string(json, 'calculatedAt')),
        ingredientBreakdown: (json['ingredientBreakdown'] as List? ?? const [])
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList(growable: false),
      );

  final String id;
  final int calculatedCost;
  final DateTime calculatedAt;
  final List<Map<String, dynamic>> ingredientBreakdown;
}

class Recipe {
  const Recipe({
    required this.id,
    required this.tenantId,
    required this.menuItemId,
    required this.name,
    required this.yieldUnitId,
    required this.yieldQuantity,
    required this.portionMultiplier,
    required this.isActive,
    this.variantId,
    this.description,
    this.menuItemName,
    this.variantName,
    this.ingredients = const [],
    this.costSnapshots = const [],
  });

  factory Recipe.fromJson(Map<String, dynamic> json) => Recipe(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    menuItemId: _string(json, 'menuItemId'),
    variantId: json['variantId'] as String?,
    name: _string(json, 'name'),
    description: json['description'] as String?,
    yieldUnitId: _string(json, 'yieldUnitId'),
    yieldQuantity: _number(json['yieldQuantity']),
    portionMultiplier: _number(json['portionMultiplier']),
    isActive: json['isActive'] as bool? ?? true,
    menuItemName: _nestedString(json['menuItem'], 'name'),
    variantName: _nestedString(json['variant'], 'name'),
    ingredients: _objects(json['ingredients'], RecipeIngredient.fromJson),
    costSnapshots: _objects(json['costSnapshots'], RecipeCostSnapshot.fromJson),
  );

  final String id;
  final String tenantId;
  final String menuItemId;
  final String? variantId;
  final String name;
  final String? description;
  final String yieldUnitId;
  final double yieldQuantity;
  final double portionMultiplier;
  final bool isActive;
  final String? menuItemName;
  final String? variantName;
  final List<RecipeIngredient> ingredients;
  final List<RecipeCostSnapshot> costSnapshots;
}

class RecipeCost {
  const RecipeCost({
    required this.recipeId,
    required this.calculatedCost,
    required this.ingredientBreakdown,
  });

  factory RecipeCost.fromJson(Map<String, dynamic> json) => RecipeCost(
    recipeId: _string(json, 'recipeId'),
    calculatedCost: _integer(json['calculatedCost'] ?? json['recipeCost']),
    ingredientBreakdown: (json['ingredientBreakdown'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false),
  );

  final String recipeId;
  final int calculatedCost;
  final List<Map<String, dynamic>> ingredientBreakdown;
}

class RecipeProfitability {
  const RecipeProfitability({
    required this.recipeId,
    required this.name,
    required this.sellingPrice,
    required this.recipeCost,
    required this.grossProfit,
    required this.foodCostPercentage,
    required this.grossMarginPercentage,
  });

  factory RecipeProfitability.fromJson(Map<String, dynamic> json) =>
      RecipeProfitability(
        recipeId: _string(json, 'recipeId'),
        name:
            json['name']?.toString() ?? json['menuItemName']?.toString() ?? '',
        sellingPrice: _integer(json['sellingPrice'] ?? json['menuPrice']),
        recipeCost: _integer(json['recipeCost']),
        grossProfit: _integer(json['grossProfit']),
        foodCostPercentage: _number(json['foodCostPercentage']),
        grossMarginPercentage: _number(
          json['grossMarginPercentage'] ?? json['marginPercentage'],
        ),
      );

  final String recipeId;
  final String name;
  final int sellingPrice;
  final int recipeCost;
  final int grossProfit;
  final double foodCostPercentage;
  final double grossMarginPercentage;
}

class ProductionRecipe {
  const ProductionRecipe({
    required this.id,
    required this.name,
    required this.yieldUnitId,
    required this.yieldQuantity,
    required this.isActive,
    this.outputIngredientId,
    this.description,
    this.ingredients = const [],
  });

  factory ProductionRecipe.fromJson(Map<String, dynamic> json) =>
      ProductionRecipe(
        id: _string(json, 'id'),
        name: _string(json, 'name'),
        outputIngredientId: json['outputIngredientId'] as String?,
        yieldUnitId: _string(json, 'yieldUnitId'),
        yieldQuantity: _number(json['yieldQuantity']),
        isActive: json['isActive'] as bool? ?? true,
        description: json['description'] as String?,
        ingredients: _objects(json['ingredients'], RecipeIngredient.fromJson),
      );

  final String id;
  final String name;
  final String? outputIngredientId;
  final String yieldUnitId;
  final double yieldQuantity;
  final bool isActive;
  final String? description;
  final List<RecipeIngredient> ingredients;
}

class InventoryConsumption {
  const InventoryConsumption({
    required this.id,
    required this.outletId,
    required this.orderId,
    required this.orderItemId,
    required this.recipeId,
    required this.ingredientId,
    required this.unitId,
    required this.consumedQuantity,
    required this.costAtConsumption,
    required this.trigger,
    required this.consumedAt,
    this.ingredientName,
    this.recipeName,
    this.orderNumber,
  });

  factory InventoryConsumption.fromJson(Map<String, dynamic> json) =>
      InventoryConsumption(
        id: _string(json, 'id'),
        outletId: _string(json, 'outletId'),
        orderId: _string(json, 'orderId'),
        orderItemId: _string(json, 'orderItemId'),
        recipeId: _string(json, 'recipeId'),
        ingredientId: _string(json, 'ingredientId'),
        unitId: _string(json, 'unitId'),
        consumedQuantity: _number(json['consumedQuantity']),
        costAtConsumption: _integer(json['costAtConsumption']),
        trigger: InventoryConsumptionTrigger.fromJson(_string(json, 'trigger')),
        consumedAt: DateTime.parse(_string(json, 'consumedAt')),
        ingredientName: _nestedString(json['ingredient'], 'name'),
        recipeName: _nestedString(json['recipe'], 'name'),
        orderNumber: _nestedString(json['order'], 'orderNumber'),
      );

  final String id;
  final String outletId;
  final String orderId;
  final String orderItemId;
  final String recipeId;
  final String ingredientId;
  final String unitId;
  final double consumedQuantity;
  final int costAtConsumption;
  final InventoryConsumptionTrigger trigger;
  final DateTime consumedAt;
  final String? ingredientName;
  final String? recipeName;
  final String? orderNumber;
}

class InventoryWastage {
  const InventoryWastage({
    required this.id,
    required this.outletId,
    required this.ingredientId,
    required this.unitId,
    required this.quantity,
    required this.reason,
    required this.costAtWastage,
    required this.recordedAt,
    this.notes,
    this.ingredientName,
  });

  factory InventoryWastage.fromJson(Map<String, dynamic> json) =>
      InventoryWastage(
        id: _string(json, 'id'),
        outletId: _string(json, 'outletId'),
        ingredientId: _string(json, 'ingredientId'),
        unitId: _string(json, 'unitId'),
        quantity: _number(json['quantity']),
        reason: WastageReason.fromJson(_string(json, 'reason')),
        notes: json['notes'] as String?,
        costAtWastage: _integer(json['costAtWastage']),
        recordedAt: DateTime.parse(_string(json, 'recordedAt')),
        ingredientName: _nestedString(json['ingredient'], 'name'),
      );

  final String id;
  final String outletId;
  final String ingredientId;
  final String unitId;
  final double quantity;
  final WastageReason reason;
  final String? notes;
  final int costAtWastage;
  final DateTime recordedAt;
  final String? ingredientName;
}

String _string(Map<String, dynamic> json, String key) =>
    json[key]?.toString() ?? '';
int _integer(Object? value) =>
    value is num ? value.toInt() : int.parse('$value');
double _number(Object? value) =>
    value is num ? value.toDouble() : double.parse('${value ?? 0}');
String? _nestedString(Object? value, String key) =>
    value is Map ? value[key]?.toString() : null;
T? _object<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    value is Map ? parser(Map<String, dynamic>.from(value)) : null;
List<T> _objects<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    (value as List? ?? const [])
        .map((item) => parser(Map<String, dynamic>.from(item as Map)))
        .toList(growable: false);
