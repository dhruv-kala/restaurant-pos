enum TenantStatus {
  active,
  inactive,
  suspended,
  trial,
  expired,
  closed;

  static TenantStatus fromJson(Object? value) {
    return switch (value) {
      'ACTIVE' => TenantStatus.active,
      'INACTIVE' => TenantStatus.inactive,
      'SUSPENDED' => TenantStatus.suspended,
      'TRIAL' => TenantStatus.trial,
      'EXPIRED' => TenantStatus.expired,
      'CLOSED' => TenantStatus.closed,
      _ => throw FormatException('Unsupported tenant status: $value'),
    };
  }

  String toJson() => name.toUpperCase();
}
