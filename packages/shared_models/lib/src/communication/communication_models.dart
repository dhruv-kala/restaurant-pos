enum CommunicationChannel {
  email,
  sms,
  whatsapp,
  push;

  factory CommunicationChannel.fromJson(Object? value) => switch (value) {
    'EMAIL' => CommunicationChannel.email,
    'SMS' => CommunicationChannel.sms,
    'WHATSAPP' => CommunicationChannel.whatsapp,
    'PUSH' => CommunicationChannel.push,
    _ => throw FormatException('Unsupported communication channel: $value'),
  };

  String get wireName => name.toUpperCase();
}

enum CommunicationProviderStatus {
  active,
  inactive;

  factory CommunicationProviderStatus.fromJson(Object? value) =>
      switch (value) {
        'ACTIVE' => CommunicationProviderStatus.active,
        'INACTIVE' => CommunicationProviderStatus.inactive,
        _ => throw FormatException(
          'Unsupported communication provider status: $value',
        ),
      };

  String get wireName => name.toUpperCase();
}

enum CommunicationTemplateStatus {
  draft,
  active,
  inactive;

  factory CommunicationTemplateStatus.fromJson(Object? value) =>
      switch (value) {
        'DRAFT' => CommunicationTemplateStatus.draft,
        'ACTIVE' => CommunicationTemplateStatus.active,
        'INACTIVE' => CommunicationTemplateStatus.inactive,
        _ => throw FormatException(
          'Unsupported communication template status: $value',
        ),
      };

  String get wireName => name.toUpperCase();
}

enum CommunicationMessageStatus {
  queued,
  processing,
  sent,
  delivered,
  read,
  failed,
  cancelled;

  factory CommunicationMessageStatus.fromJson(Object? value) => switch (value) {
    'QUEUED' => CommunicationMessageStatus.queued,
    'PROCESSING' => CommunicationMessageStatus.processing,
    'SENT' => CommunicationMessageStatus.sent,
    'DELIVERED' => CommunicationMessageStatus.delivered,
    'READ' => CommunicationMessageStatus.read,
    'FAILED' => CommunicationMessageStatus.failed,
    'CANCELLED' => CommunicationMessageStatus.cancelled,
    _ => throw FormatException(
      'Unsupported communication message status: $value',
    ),
  };

  String get wireName => name.toUpperCase();
}

enum CommunicationAttemptStatus {
  pending,
  processing,
  accepted,
  delivered,
  retryableFailed,
  terminalFailed;

  factory CommunicationAttemptStatus.fromJson(Object? value) => switch (value) {
    'PENDING' => CommunicationAttemptStatus.pending,
    'PROCESSING' => CommunicationAttemptStatus.processing,
    'ACCEPTED' => CommunicationAttemptStatus.accepted,
    'DELIVERED' => CommunicationAttemptStatus.delivered,
    'RETRYABLE_FAILED' => CommunicationAttemptStatus.retryableFailed,
    'TERMINAL_FAILED' => CommunicationAttemptStatus.terminalFailed,
    _ => throw FormatException(
      'Unsupported communication attempt status: $value',
    ),
  };

  String get wireName => switch (this) {
    CommunicationAttemptStatus.retryableFailed => 'RETRYABLE_FAILED',
    CommunicationAttemptStatus.terminalFailed => 'TERMINAL_FAILED',
    _ => name.toUpperCase(),
  };
}

class CommunicationProvider {
  const CommunicationProvider({
    required this.id,
    required this.tenantId,
    required this.channel,
    required this.providerKey,
    required this.displayName,
    required this.status,
    required this.priority,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.secretReference,
    this.configMetadata,
    this.capabilities,
  });

  factory CommunicationProvider.fromJson(Map<String, dynamic> json) =>
      CommunicationProvider(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        channel: CommunicationChannel.fromJson(json['channel']),
        providerKey: _requiredString(json, 'providerKey'),
        displayName: _requiredString(json, 'displayName'),
        status: CommunicationProviderStatus.fromJson(json['status']),
        priority: _requiredInt(json, 'priority'),
        secretReference: json['secretReference']?.toString(),
        configMetadata: _mapOrNull(json['configMetadata']),
        capabilities: _mapOrNull(json['capabilities']),
        version: _requiredInt(json, 'version'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final CommunicationChannel channel;
  final String providerKey;
  final String displayName;
  final CommunicationProviderStatus status;
  final int priority;
  final String? secretReference;
  final Map<String, dynamic>? configMetadata;
  final Map<String, dynamic>? capabilities;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CommunicationTemplateVariable {
  const CommunicationTemplateVariable({
    required this.key,
    this.description,
    this.required = true,
  });

  factory CommunicationTemplateVariable.fromJson(Map<String, dynamic> json) =>
      CommunicationTemplateVariable(
        key: _requiredString(json, 'key'),
        description: json['description']?.toString(),
        required: json['required'] as bool? ?? true,
      );

  final String key;
  final String? description;
  final bool required;

  Map<String, dynamic> toJson() => {
    'key': key,
    if (description != null) 'description': description,
    'required': required,
  };
}

class CommunicationTemplateVersion {
  const CommunicationTemplateVersion({
    required this.id,
    required this.tenantId,
    required this.templateId,
    required this.versionNumber,
    required this.bodyTemplate,
    required this.variables,
    required this.createdAt,
    this.subjectTemplate,
    this.createdByName,
  });

  factory CommunicationTemplateVersion.fromJson(Map<String, dynamic> json) {
    final createdBy = _mapOrNull(json['createdBy']);
    return CommunicationTemplateVersion(
      id: _requiredString(json, 'id'),
      tenantId: _requiredString(json, 'tenantId'),
      templateId: _requiredString(json, 'templateId'),
      versionNumber: _requiredInt(json, 'versionNumber'),
      subjectTemplate: json['subjectTemplate']?.toString(),
      bodyTemplate: _requiredString(json, 'bodyTemplate'),
      variables: _mapList(
        json['variableSchema'],
      ).map(CommunicationTemplateVariable.fromJson).toList(growable: false),
      createdByName: createdBy?['displayName']?.toString(),
      createdAt: _date(json, 'createdAt'),
    );
  }

  final String id;
  final String tenantId;
  final String templateId;
  final int versionNumber;
  final String? subjectTemplate;
  final String bodyTemplate;
  final List<CommunicationTemplateVariable> variables;
  final String? createdByName;
  final DateTime createdAt;
}

class CommunicationTemplate {
  const CommunicationTemplate({
    required this.id,
    required this.tenantId,
    required this.templateKey,
    required this.channel,
    required this.name,
    required this.status,
    required this.version,
    required this.latestVersion,
    required this.versionCount,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
    this.description,
  });

  factory CommunicationTemplate.fromJson(Map<String, dynamic> json) =>
      CommunicationTemplate(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        templateKey: _requiredString(json, 'templateKey'),
        channel: CommunicationChannel.fromJson(json['channel']),
        name: _requiredString(json, 'name'),
        description: json['description']?.toString(),
        status: CommunicationTemplateStatus.fromJson(json['status']),
        version: _requiredInt(json, 'version'),
        latestVersion: CommunicationTemplateVersion.fromJson(
          _requiredMap(json, 'latestVersion'),
        ),
        versionCount: _requiredInt(json, 'versionCount'),
        messageCount: _requiredInt(json, 'messageCount'),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String templateKey;
  final CommunicationChannel channel;
  final String name;
  final String? description;
  final CommunicationTemplateStatus status;
  final int version;
  final CommunicationTemplateVersion latestVersion;
  final int versionCount;
  final int messageCount;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CommunicationTemplatePreview {
  const CommunicationTemplatePreview({
    required this.templateId,
    required this.versionId,
    required this.versionNumber,
    required this.channel,
    required this.body,
    this.subject,
  });

  factory CommunicationTemplatePreview.fromJson(Map<String, dynamic> json) =>
      CommunicationTemplatePreview(
        templateId: _requiredString(json, 'templateId'),
        versionId: _requiredString(json, 'versionId'),
        versionNumber: _requiredInt(json, 'versionNumber'),
        channel: CommunicationChannel.fromJson(json['channel']),
        subject: json['subject']?.toString(),
        body: _requiredString(json, 'body'),
      );

  final String templateId;
  final String versionId;
  final int versionNumber;
  final CommunicationChannel channel;
  final String? subject;
  final String body;
}

class CommunicationAttempt {
  const CommunicationAttempt({
    required this.id,
    required this.providerId,
    required this.attemptNumber,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.providerMessageId,
    this.errorCode,
    this.errorClassification,
    this.startedAt,
    this.completedAt,
    this.nextRetryAt,
  });

  factory CommunicationAttempt.fromJson(Map<String, dynamic> json) =>
      CommunicationAttempt(
        id: _requiredString(json, 'id'),
        providerId: _requiredString(json, 'providerId'),
        attemptNumber: _requiredInt(json, 'attemptNumber'),
        status: CommunicationAttemptStatus.fromJson(json['status']),
        providerMessageId: json['providerMessageId']?.toString(),
        errorCode: json['errorCode']?.toString(),
        errorClassification: json['errorClassification']?.toString(),
        startedAt: _optionalDate(json['startedAt']),
        completedAt: _optionalDate(json['completedAt']),
        nextRetryAt: _optionalDate(json['nextRetryAt']),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String providerId;
  final int attemptNumber;
  final CommunicationAttemptStatus status;
  final String? providerMessageId;
  final String? errorCode;
  final String? errorClassification;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? nextRetryAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class CommunicationMessageReference {
  const CommunicationMessageReference({
    required this.id,
    required this.name,
    this.key,
  });

  factory CommunicationMessageReference.fromJson(Map<String, dynamic> json) =>
      CommunicationMessageReference(
        id: _requiredString(json, 'id'),
        name:
            json['displayName']?.toString() ??
            json['name']?.toString() ??
            _requiredString(json, 'id'),
        key: json['providerKey']?.toString() ?? json['templateKey']?.toString(),
      );

  final String id;
  final String name;
  final String? key;
}

class CommunicationMessage {
  const CommunicationMessage({
    required this.id,
    required this.tenantId,
    required this.channel,
    required this.recipientType,
    required this.recipientAddressMasked,
    required this.bodySnapshot,
    required this.locale,
    required this.status,
    required this.idempotencyKey,
    required this.attempts,
    required this.createdAt,
    required this.updatedAt,
    this.outletId,
    this.subjectSnapshot,
    this.provider,
    this.template,
    this.sentAt,
    this.deliveredAt,
    this.readAt,
    this.failedAt,
  });

  factory CommunicationMessage.fromJson(Map<String, dynamic> json) =>
      CommunicationMessage(
        id: _requiredString(json, 'id'),
        tenantId: _requiredString(json, 'tenantId'),
        outletId: json['outletId']?.toString(),
        channel: CommunicationChannel.fromJson(json['channel']),
        recipientType: _requiredString(json, 'recipientType'),
        recipientAddressMasked: _requiredString(json, 'recipientAddressMasked'),
        subjectSnapshot: json['subjectSnapshot']?.toString(),
        bodySnapshot: _requiredString(json, 'bodySnapshot'),
        locale: _requiredString(json, 'locale'),
        status: CommunicationMessageStatus.fromJson(json['status']),
        idempotencyKey: _requiredString(json, 'idempotencyKey'),
        provider: _optionalReference(json['provider']),
        template: _optionalReference(json['template']),
        attempts: _mapList(
          json['attempts'],
        ).map(CommunicationAttempt.fromJson).toList(growable: false),
        sentAt: _optionalDate(json['sentAt']),
        deliveredAt: _optionalDate(json['deliveredAt']),
        readAt: _optionalDate(json['readAt']),
        failedAt: _optionalDate(json['failedAt']),
        createdAt: _date(json, 'createdAt'),
        updatedAt: _date(json, 'updatedAt'),
      );

  final String id;
  final String tenantId;
  final String? outletId;
  final CommunicationChannel channel;
  final String recipientType;
  final String recipientAddressMasked;
  final String? subjectSnapshot;
  final String bodySnapshot;
  final String locale;
  final CommunicationMessageStatus status;
  final String idempotencyKey;
  final CommunicationMessageReference? provider;
  final CommunicationMessageReference? template;
  final List<CommunicationAttempt> attempts;
  final DateTime? sentAt;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final DateTime? failedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
}

String _requiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) return value;
  throw FormatException('Expected a non-empty string for "$key".');
}

int _requiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) return value;
  throw FormatException('Expected an integer for "$key".');
}

DateTime _date(Map<String, dynamic> json, String key) =>
    DateTime.parse(_requiredString(json, key)).toUtc();

DateTime? _optionalDate(Object? value) =>
    value == null ? null : DateTime.parse(value.toString()).toUtc();

Map<String, dynamic> _requiredMap(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is Map) return Map<String, dynamic>.from(value);
  throw FormatException('Expected an object for "$key".');
}

Map<String, dynamic>? _mapOrNull(Object? value) =>
    value is Map ? Map<String, dynamic>.from(value) : null;

List<Map<String, dynamic>> _mapList(Object? value) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList(growable: false);

CommunicationMessageReference? _optionalReference(Object? value) => value is Map
    ? CommunicationMessageReference.fromJson(Map<String, dynamic>.from(value))
    : null;
