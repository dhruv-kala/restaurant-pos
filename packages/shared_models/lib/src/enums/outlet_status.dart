enum OutletStatus {
  active,
  inactive,
  temporarilyClosed,
  suspended,
  closed;

  static OutletStatus fromJson(Object? value) {
    return switch (value) {
      'ACTIVE' => OutletStatus.active,
      'INACTIVE' => OutletStatus.inactive,
      'TEMPORARILY_CLOSED' => OutletStatus.temporarilyClosed,
      'SUSPENDED' => OutletStatus.suspended,
      'CLOSED' => OutletStatus.closed,
      _ => throw FormatException('Unsupported outlet status: $value'),
    };
  }

  String toJson() {
    return switch (this) {
      OutletStatus.active => 'ACTIVE',
      OutletStatus.inactive => 'INACTIVE',
      OutletStatus.temporarilyClosed => 'TEMPORARILY_CLOSED',
      OutletStatus.suspended => 'SUSPENDED',
      OutletStatus.closed => 'CLOSED',
    };
  }
}
