import '../converters/date_time_converter.dart';
import '../enums/tenant_status.dart';

class Tenant {
  const Tenant({
    required this.id,
    required this.slug,
    required this.name,
    required this.status,
    required this.locale,
    required this.timezone,
    required this.currencyCode,
    required this.outletLimit,
    required this.createdAt,
    required this.updatedAt,
    this.legalName,
    this.email,
    this.phone,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: _requiredString(json, 'id'),
      slug: _requiredString(json, 'slug'),
      name: _requiredString(json, 'name'),
      legalName: _optionalString(json['legalName']),
      email: _optionalString(json['email']),
      phone: _optionalString(json['phone']),
      status: TenantStatus.fromJson(json['status']),
      locale: _requiredString(json, 'locale'),
      timezone: _requiredString(json, 'timezone'),
      currencyCode: _requiredString(json, 'currencyCode'),
      outletLimit: _requiredInt(json, 'outletLimit'),
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
  final String slug;
  final String name;
  final String? legalName;
  final String? email;
  final String? phone;
  final TenantStatus status;
  final String locale;
  final String timezone;
  final String currencyCode;
  final int outletLimit;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'slug': slug,
        'name': name,
        'legalName': legalName,
        'email': email,
        'phone': phone,
        'status': status.toJson(),
        'locale': locale,
        'timezone': timezone,
        'currencyCode': currencyCode,
        'outletLimit': outletLimit,
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

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }
  throw FormatException('Expected an integer for "$key".');
}
