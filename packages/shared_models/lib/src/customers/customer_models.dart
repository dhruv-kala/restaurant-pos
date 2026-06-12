enum CustomerType {
  walkIn,
  regular,
  vip,
  corporate,
  delivery;

  static CustomerType fromJson(String value) => switch (value) {
    'REGULAR' => regular,
    'VIP' => vip,
    'CORPORATE' => corporate,
    'DELIVERY' => delivery,
    _ => walkIn,
  };

  String get wireName => switch (this) {
    walkIn => 'WALK_IN',
    regular => 'REGULAR',
    vip => 'VIP',
    corporate => 'CORPORATE',
    delivery => 'DELIVERY',
  };
}

enum CustomerStatus {
  active,
  inactive,
  blocked;

  static CustomerStatus fromJson(String value) =>
      CustomerStatus.values.byName(value.toLowerCase());
  String get wireName => name.toUpperCase();
}

enum CustomerSource {
  pos,
  waiterApp,
  qrOrder,
  onlineOrder,
  customerApp,
  import;

  static CustomerSource fromJson(String value) => switch (value) {
    'WAITER_APP' => waiterApp,
    'QR_ORDER' => qrOrder,
    'ONLINE_ORDER' => onlineOrder,
    'CUSTOMER_APP' => customerApp,
    'IMPORT' => import,
    _ => pos,
  };
}

class CustomerAddress {
  const CustomerAddress({
    required this.id,
    required this.customerId,
    required this.label,
    required this.addressLine1,
    required this.isDefault,
    this.addressLine2,
    this.city,
    this.state,
    this.country,
    this.postalCode,
    this.latitude,
    this.longitude,
  });

  factory CustomerAddress.fromJson(Map<String, dynamic> json) =>
      CustomerAddress(
        id: _string(json, 'id'),
        customerId: _string(json, 'customerId'),
        label: _string(json, 'label'),
        addressLine1: _string(json, 'addressLine1'),
        addressLine2: json['addressLine2'] as String?,
        city: json['city'] as String?,
        state: json['state'] as String?,
        country: json['country'] as String?,
        postalCode: json['postalCode'] as String?,
        latitude: _nullableNumber(json['latitude']),
        longitude: _nullableNumber(json['longitude']),
        isDefault: json['isDefault'] as bool? ?? false,
      );

  final String id;
  final String customerId;
  final String label;
  final String addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? country;
  final String? postalCode;
  final double? latitude;
  final double? longitude;
  final bool isDefault;
}

class Customer {
  const Customer({
    required this.id,
    required this.tenantId,
    required this.displayName,
    required this.customerType,
    required this.status,
    required this.source,
    required this.smsOptIn,
    required this.emailOptIn,
    required this.whatsappOptIn,
    this.firstName,
    this.lastName,
    this.phone,
    this.email,
    this.gender,
    this.dateOfBirth,
    this.anniversaryDate,
    this.gstNumber,
    this.notes,
    this.addresses = const [],
    this.stats,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
    id: _string(json, 'id'),
    tenantId: _string(json, 'tenantId'),
    firstName: json['firstName'] as String?,
    lastName: json['lastName'] as String?,
    displayName: _string(json, 'displayName'),
    phone: json['phone'] as String?,
    email: json['email'] as String?,
    gender: json['gender'] as String?,
    dateOfBirth: _date(json['dateOfBirth']),
    anniversaryDate: _date(json['anniversaryDate']),
    gstNumber: json['gstNumber'] as String?,
    customerType: CustomerType.fromJson(_string(json, 'customerType')),
    status: CustomerStatus.fromJson(_string(json, 'status')),
    notes: json['notes'] as String?,
    source: CustomerSource.fromJson(_string(json, 'source')),
    smsOptIn: json['smsOptIn'] as bool? ?? false,
    emailOptIn: json['emailOptIn'] as bool? ?? false,
    whatsappOptIn: json['whatsappOptIn'] as bool? ?? false,
    addresses: _objects(json['addresses'], CustomerAddress.fromJson),
    stats: _object(json['stats'], CustomerStats.fromJson),
  );

  final String id;
  final String tenantId;
  final String? firstName;
  final String? lastName;
  final String displayName;
  final String? phone;
  final String? email;
  final String? gender;
  final DateTime? dateOfBirth;
  final DateTime? anniversaryDate;
  final String? gstNumber;
  final CustomerType customerType;
  final CustomerStatus status;
  final String? notes;
  final CustomerSource source;
  final bool smsOptIn;
  final bool emailOptIn;
  final bool whatsappOptIn;
  final List<CustomerAddress> addresses;
  final CustomerStats? stats;
}

class CustomerNote {
  const CustomerNote({
    required this.id,
    required this.customerId,
    required this.note,
    required this.createdAt,
    this.createdByName,
  });

  factory CustomerNote.fromJson(Map<String, dynamic> json) => CustomerNote(
    id: _string(json, 'id'),
    customerId: _string(json, 'customerId'),
    note: _string(json, 'note'),
    createdAt: DateTime.parse(_string(json, 'createdAt')),
    createdByName: _nestedString(json['createdBy'], 'displayName'),
  );

  final String id;
  final String customerId;
  final String note;
  final DateTime createdAt;
  final String? createdByName;
}

class CustomerVisit {
  const CustomerVisit({
    required this.id,
    required this.customerId,
    required this.outletId,
    required this.visitDate,
    required this.totalSpend,
    this.orderId,
    this.billId,
    this.paymentId,
    this.outletName,
  });

  factory CustomerVisit.fromJson(Map<String, dynamic> json) => CustomerVisit(
    id: _string(json, 'id'),
    customerId: _string(json, 'customerId'),
    outletId: _string(json, 'outletId'),
    orderId: json['orderId'] as String?,
    billId: json['billId'] as String?,
    paymentId: json['paymentId'] as String?,
    visitDate: DateTime.parse(_string(json, 'visitDate')),
    totalSpend: _integer(json['totalSpend']),
    outletName: _nestedString(json['outlet'], 'name'),
  );

  final String id;
  final String customerId;
  final String outletId;
  final String? orderId;
  final String? billId;
  final String? paymentId;
  final DateTime visitDate;
  final int totalSpend;
  final String? outletName;
}

class CustomerStats {
  const CustomerStats({
    required this.customerId,
    required this.totalOrders,
    required this.totalSpend,
    required this.averageOrderValue,
    this.lastVisitAt,
    this.firstVisitAt,
    this.favoriteOutletId,
    this.favoriteOutletName,
  });

  factory CustomerStats.fromJson(Map<String, dynamic> json) => CustomerStats(
    customerId: _string(json, 'customerId'),
    totalOrders: _integer(json['totalOrders']),
    totalSpend: _integer(json['totalSpend']),
    averageOrderValue: _integer(json['averageOrderValue']),
    lastVisitAt: _date(json['lastVisitAt']),
    firstVisitAt: _date(json['firstVisitAt']),
    favoriteOutletId: json['favoriteOutletId'] as String?,
    favoriteOutletName: _nestedString(json['favoriteOutlet'], 'name'),
  );

  final String customerId;
  final int totalOrders;
  final int totalSpend;
  final int averageOrderValue;
  final DateTime? lastVisitAt;
  final DateTime? firstVisitAt;
  final String? favoriteOutletId;
  final String? favoriteOutletName;
}

class CustomerDashboardStats {
  const CustomerDashboardStats({
    required this.totalCustomers,
    required this.newCustomers,
    required this.repeatCustomers,
    required this.vipCustomers,
    required this.inactiveCustomers,
  });
  factory CustomerDashboardStats.fromJson(Map<String, dynamic> json) =>
      CustomerDashboardStats(
        totalCustomers: _integer(json['totalCustomers']),
        newCustomers: _integer(json['newCustomers']),
        repeatCustomers: _integer(json['repeatCustomers']),
        vipCustomers: _integer(json['vipCustomers']),
        inactiveCustomers: _integer(json['inactiveCustomers']),
      );
  final int totalCustomers;
  final int newCustomers;
  final int repeatCustomers;
  final int vipCustomers;
  final int inactiveCustomers;
}

String _string(Map<String, dynamic> json, String key) =>
    json[key]?.toString() ?? '';
int _integer(Object? value) =>
    value is num ? value.toInt() : int.parse('${value ?? 0}');
double? _nullableNumber(Object? value) => value == null
    ? null
    : (value is num ? value.toDouble() : double.parse('$value'));
DateTime? _date(Object? value) =>
    value == null ? null : DateTime.parse('$value');
String? _nestedString(Object? value, String key) =>
    value is Map ? value[key]?.toString() : null;
T? _object<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    value is Map ? parser(Map<String, dynamic>.from(value)) : null;
List<T> _objects<T>(Object? value, T Function(Map<String, dynamic>) parser) =>
    (value as List? ?? const [])
        .map((item) => parser(Map<String, dynamic>.from(item as Map)))
        .toList(growable: false);
