import '../converters/date_time_converter.dart';
import '../enums/outlet_status.dart';

class Outlet {
  const Outlet({
    required this.id,
    required this.tenantId,
    required this.code,
    required this.name,
    required this.status,
    required this.timezone,
    required this.createdAt,
    required this.updatedAt,
    this.email,
    this.addressLine1,
    this.addressLine2,
    this.city,
    this.state,
    this.postalCode,
    this.country,
    this.phone,
  });

  factory Outlet.fromJson(Map<String, dynamic> json) {
    return Outlet(
      id: _requiredString(json, 'id'),
      tenantId: _requiredString(json, 'tenantId'),
      code: _requiredString(json, 'code'),
      name: _requiredString(json, 'name'),
      status: OutletStatus.fromJson(json['status']),
      timezone: _requiredString(json, 'timezone'),
      email: _optionalString(json['email']),
      addressLine1: _optionalString(json['addressLine1']),
      addressLine2: _optionalString(json['addressLine2']),
      city: _optionalString(json['city']),
      state: _optionalString(json['state']),
      postalCode: _optionalString(json['postalCode']),
      country: _optionalString(json['country']),
      phone: _optionalString(json['phone']),
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
  final String code;
  final String name;
  final OutletStatus status;
  final String timezone;
  final String? email;
  final String? addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? postalCode;
  final String? country;
  final String? phone;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'tenantId': tenantId,
    'code': code,
    'name': name,
    'status': status.toJson(),
    'timezone': timezone,
    'email': email,
    'addressLine1': addressLine1,
    'addressLine2': addressLine2,
    'city': city,
    'state': state,
    'postalCode': postalCode,
    'country': country,
    'phone': phone,
    'createdAt': DateTimeConverter.toJson(createdAt),
    'updatedAt': DateTimeConverter.toJson(updatedAt),
  };
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }
  throw FormatException('Expected a non-empty string for "$key".');
}

String? _optionalString(Object? value) {
  if (value == null || value is String) {
    return value as String?;
  }
  throw const FormatException('Expected a string or null.');
}
