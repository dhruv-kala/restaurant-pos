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

class CommunicationDashboardSummary {
  const CommunicationDashboardSummary({
    required this.totalMessages,
    required this.successfulMessages,
    required this.failedMessages,
    required this.channelUsage,
  });

  final int totalMessages;
  final int successfulMessages;
  final int failedMessages;
  final Map<CommunicationChannel, int> channelUsage;

  double get successRate {
    final terminalMessages = successfulMessages + failedMessages;
    return terminalMessages == 0 ? 0 : successfulMessages / terminalMessages;
  }
}
