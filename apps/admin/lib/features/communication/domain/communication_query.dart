import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

class CommunicationTemplateQuery {
  const CommunicationTemplateQuery({
    this.page = 1,
    this.limit = 20,
    this.channel,
    this.status,
    this.search,
  });

  final int page;
  final int limit;
  final CommunicationChannel? channel;
  final CommunicationTemplateStatus? status;
  final String? search;

  CommunicationTemplateQuery copyWith({
    int? page,
    CommunicationChannel? channel,
    bool clearChannel = false,
    CommunicationTemplateStatus? status,
    bool clearStatus = false,
    String? search,
  }) => CommunicationTemplateQuery(
    page: page ?? this.page,
    limit: limit,
    channel: clearChannel ? null : channel ?? this.channel,
    status: clearStatus ? null : status ?? this.status,
    search: search ?? this.search,
  );

  @override
  bool operator ==(Object other) =>
      other is CommunicationTemplateQuery &&
      other.page == page &&
      other.limit == limit &&
      other.channel == channel &&
      other.status == status &&
      other.search == search;

  @override
  int get hashCode => Object.hash(page, limit, channel, status, search);
}

class CommunicationMessageQuery {
  const CommunicationMessageQuery({
    this.page = 1,
    this.limit = 20,
    this.channel,
    this.status,
    this.search,
  });

  final int page;
  final int limit;
  final CommunicationChannel? channel;
  final CommunicationMessageStatus? status;
  final String? search;

  CommunicationMessageQuery copyWith({
    int? page,
    CommunicationChannel? channel,
    bool clearChannel = false,
    CommunicationMessageStatus? status,
    bool clearStatus = false,
    String? search,
  }) => CommunicationMessageQuery(
    page: page ?? this.page,
    limit: limit,
    channel: clearChannel ? null : channel ?? this.channel,
    status: clearStatus ? null : status ?? this.status,
    search: search ?? this.search,
  );

  @override
  bool operator ==(Object other) =>
      other is CommunicationMessageQuery &&
      other.page == page &&
      other.limit == limit &&
      other.channel == channel &&
      other.status == status &&
      other.search == search;

  @override
  int get hashCode => Object.hash(page, limit, channel, status, search);
}

class CommunicationAnalyticsQuery {
  const CommunicationAnalyticsQuery({
    required this.from,
    required this.to,
    this.groupBy = CommunicationAnalyticsGroup.day,
  });

  factory CommunicationAnalyticsQuery.last30Days() {
    final to = DateTime.now().toUtc();
    return CommunicationAnalyticsQuery(
      from: to.subtract(const Duration(days: 29)),
      to: to,
    );
  }

  final DateTime from;
  final DateTime to;
  final CommunicationAnalyticsGroup groupBy;

  CommunicationAnalyticsQuery copyWith({
    DateTime? from,
    DateTime? to,
    CommunicationAnalyticsGroup? groupBy,
  }) => CommunicationAnalyticsQuery(
    from: from ?? this.from,
    to: to ?? this.to,
    groupBy: groupBy ?? this.groupBy,
  );

  @override
  bool operator ==(Object other) =>
      other is CommunicationAnalyticsQuery &&
      other.from == from &&
      other.to == to &&
      other.groupBy == groupBy;

  @override
  int get hashCode => Object.hash(from, to, groupBy);
}
