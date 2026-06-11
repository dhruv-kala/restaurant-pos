class AnalyticsEvent {
  const AnalyticsEvent({
    required this.name,
    this.properties = const <String, Object?>{},
    this.occurredAt,
  });

  final String name;
  final Map<String, Object?> properties;
  final DateTime? occurredAt;
}
