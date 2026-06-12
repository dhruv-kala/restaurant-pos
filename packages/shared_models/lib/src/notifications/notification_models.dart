enum NotificationAudience {
  user,
  tenant,
  outlet;

  factory NotificationAudience.fromJson(Object? value) =>
      _enumFromWire(values, value);
  String get wireName => name.toUpperCase();
}

enum NotificationCategory {
  system,
  security,
  operations,
  orders,
  kitchen,
  billing,
  payments,
  inventory,
  staff,
  customer,
  reports;

  factory NotificationCategory.fromJson(Object? value) =>
      _enumFromWire(values, value);
  String get wireName => name.toUpperCase();
}

enum NotificationPriority {
  low,
  normal,
  high,
  urgent;

  factory NotificationPriority.fromJson(Object? value) =>
      _enumFromWire(values, value);
  String get wireName => name.toUpperCase();
}

enum NotificationDeliveryStatus {
  pending,
  delivered,
  skipped,
  failed,
  cancelled;

  factory NotificationDeliveryStatus.fromJson(Object? value) =>
      _enumFromWire(values, value);
  String get wireName => name.toUpperCase();
}

class NotificationMessage {
  const NotificationMessage({
    required this.id,
    required this.tenantId,
    required this.audience,
    required this.category,
    required this.priority,
    required this.title,
    required this.body,
    required this.isMandatory,
    required this.createdAt,
    this.recipientId,
    this.outlet,
    this.actionUrl,
    this.metadata,
    this.deliveredAt,
    this.readAt,
    this.createdBy,
  });

  factory NotificationMessage.fromJson(Map<String, dynamic> json) =>
      NotificationMessage(
        id: _requiredString(json, 'id'),
        recipientId: json['recipientId']?.toString(),
        tenantId: _requiredString(json, 'tenantId'),
        outlet: _mapOrNull(json['outlet']),
        audience: NotificationAudience.fromJson(json['audience']),
        category: NotificationCategory.fromJson(json['category']),
        priority: NotificationPriority.fromJson(json['priority']),
        title: _requiredString(json, 'title'),
        body: _requiredString(json, 'body'),
        actionUrl: json['actionUrl']?.toString(),
        metadata: _mapOrNull(json['metadata']),
        isMandatory: json['isMandatory'] == true,
        deliveredAt: _dateOrNull(json['deliveredAt']),
        readAt: _dateOrNull(json['readAt']),
        createdAt: DateTime.parse(_requiredString(json, 'createdAt')).toUtc(),
        createdBy: _mapOrNull(json['createdBy']),
      );

  final String id;
  final String? recipientId;
  final String tenantId;
  final Map<String, dynamic>? outlet;
  final NotificationAudience audience;
  final NotificationCategory category;
  final NotificationPriority priority;
  final String title;
  final String body;
  final String? actionUrl;
  final Map<String, dynamic>? metadata;
  final bool isMandatory;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final DateTime createdAt;
  final Map<String, dynamic>? createdBy;

  bool get isRead => readAt != null;
}

class NotificationPreference {
  const NotificationPreference({
    required this.category,
    required this.inAppEnabled,
  });

  factory NotificationPreference.fromJson(Map<String, dynamic> json) =>
      NotificationPreference(
        category: NotificationCategory.fromJson(json['category']),
        inAppEnabled: json['inAppEnabled'] == true,
      );

  final NotificationCategory category;
  final bool inAppEnabled;

  Map<String, dynamic> toJson() => {
    'category': category.wireName,
    'inAppEnabled': inAppEnabled,
  };
}

class NotificationAdminRecord {
  const NotificationAdminRecord({
    required this.id,
    required this.tenantId,
    required this.audience,
    required this.category,
    required this.priority,
    required this.title,
    required this.body,
    required this.deliveryStatus,
    required this.recipientCount,
    required this.isMandatory,
    required this.createdAt,
    this.outletId,
    this.actionUrl,
    this.deliveredAt,
    this.expiresAt,
    this.deliverySummary,
  });

  factory NotificationAdminRecord.fromJson(Map<String, dynamic> json) =>
      NotificationAdminRecord(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        audience: NotificationAudience.fromJson(json['audience']),
        category: NotificationCategory.fromJson(json['category']),
        priority: NotificationPriority.fromJson(json['priority']),
        title: _requiredString(json, 'title'),
        body: _requiredString(json, 'body'),
        actionUrl: json['actionUrl']?.toString(),
        deliveryStatus: NotificationDeliveryStatus.fromJson(
          json['deliveryStatus'],
        ),
        recipientCount: _intOrZero(json['recipientCount']),
        isMandatory: json['isMandatory'] == true,
        deliveredAt: _dateOrNull(json['deliveredAt']),
        expiresAt: _dateOrNull(json['expiresAt']),
        createdAt: DateTime.parse(_requiredString(json, 'createdAt')).toUtc(),
        deliverySummary: _mapOrNull(json['deliverySummary']),
      );

  final String id;
  final String tenantId;
  final String? outletId;
  final NotificationAudience audience;
  final NotificationCategory category;
  final NotificationPriority priority;
  final String title;
  final String body;
  final String? actionUrl;
  final NotificationDeliveryStatus deliveryStatus;
  final int recipientCount;
  final bool isMandatory;
  final DateTime? deliveredAt;
  final DateTime? expiresAt;
  final DateTime createdAt;
  final Map<String, dynamic>? deliverySummary;
}

T _enumFromWire<T extends Enum>(List<T> values, Object? value) {
  final wire = value?.toString().toLowerCase();
  return values.firstWhere(
    (item) => item.name == wire,
    orElse: () => throw FormatException('Unsupported enum value: $value'),
  );
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key]?.toString();
  if (value == null || value.isEmpty) {
    throw FormatException('Missing "$key".');
  }
  return value;
}

DateTime? _dateOrNull(Object? value) =>
    value == null ? null : DateTime.parse(value.toString()).toUtc();

Map<String, dynamic>? _mapOrNull(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

int _intOrZero(Object? value) => value is int ? value : 0;
