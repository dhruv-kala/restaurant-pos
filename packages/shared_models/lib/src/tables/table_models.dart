import '../converters/date_time_converter.dart';

enum DiningTableStatus {
  available('AVAILABLE'),
  occupied('OCCUPIED'),
  reserved('RESERVED'),
  cleaning('CLEANING'),
  outOfService('OUT_OF_SERVICE');

  const DiningTableStatus(this.wireName);
  final String wireName;

  static DiningTableStatus fromJson(Object? value) {
    return values.firstWhere((status) => status.wireName == value);
  }
}

enum DiningTableShape {
  rectangle('RECTANGLE'),
  square('SQUARE'),
  round('ROUND'),
  oval('OVAL');

  const DiningTableShape(this.wireName);
  final String wireName;

  static DiningTableShape fromJson(Object? value) {
    return values.firstWhere((shape) => shape.wireName == value);
  }
}

enum ReservationStatus {
  pending('PENDING'),
  confirmed('CONFIRMED'),
  seated('SEATED'),
  completed('COMPLETED'),
  cancelled('CANCELLED'),
  noShow('NO_SHOW');

  const ReservationStatus(this.wireName);
  final String wireName;

  static ReservationStatus fromJson(Object? value) {
    return values.firstWhere((status) => status.wireName == value);
  }
}

class TableSection {
  const TableSection({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.name,
    required this.displayOrder,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.description,
  });

  factory TableSection.fromJson(Map<String, dynamic> json) => TableSection(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    displayOrder: json['displayOrder'] as int,
    isActive: json['isActive'] as bool,
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String name;
  final String? description;
  final int displayOrder;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class DiningTable {
  const DiningTable({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.sectionId,
    required this.tableNumber,
    required this.capacity,
    required this.status,
    required this.shape,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
    this.displayName,
    this.xPosition,
    this.yPosition,
  });

  factory DiningTable.fromJson(Map<String, dynamic> json) => DiningTable(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    sectionId: json['sectionId'] as String,
    tableNumber: json['tableNumber'] as String,
    displayName: json['displayName'] as String?,
    capacity: json['capacity'] as int,
    status: DiningTableStatus.fromJson(json['status']),
    xPosition: (json['xPosition'] as num?)?.toDouble(),
    yPosition: (json['yPosition'] as num?)?.toDouble(),
    shape: DiningTableShape.fromJson(json['shape']),
    isActive: json['isActive'] as bool,
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String sectionId;
  final String tableNumber;
  final String? displayName;
  final int capacity;
  final DiningTableStatus status;
  final double? xPosition;
  final double? yPosition;
  final DiningTableShape shape;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class TableReservation {
  const TableReservation({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.tableId,
    required this.customerName,
    required this.customerPhone,
    required this.reservationDate,
    required this.guestCount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.specialInstructions,
  });

  factory TableReservation.fromJson(Map<String, dynamic> json) =>
      TableReservation(
        id: json['id'] as String,
        tenantId: json['tenantId'] as String,
        outletId: json['outletId'] as String,
        tableId: json['tableId'] as String,
        customerName: json['customerName'] as String,
        customerPhone: json['customerPhone'] as String?,
        reservationDate: DateTimeConverter.fromJson(
          json['reservationDate'],
          field: 'reservationDate',
        ),
        guestCount: json['guestCount'] as int,
        specialInstructions: json['specialInstructions'] as String?,
        status: ReservationStatus.fromJson(json['status']),
        createdAt: DateTimeConverter.fromJson(
          json['createdAt'],
          field: 'createdAt',
        ),
        updatedAt: DateTimeConverter.fromJson(
          json['updatedAt'],
          field: 'updatedAt',
        ),
      );

  final String id;
  final String tenantId;
  final String outletId;
  final String tableId;
  final String customerName;
  final String? customerPhone;
  final DateTime reservationDate;
  final int guestCount;
  final String? specialInstructions;
  final ReservationStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
}

class MergedTable {
  const MergedTable({
    required this.id,
    required this.tenantId,
    required this.outletId,
    required this.primaryTableId,
    required this.mergedTableIds,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MergedTable.fromJson(Map<String, dynamic> json) => MergedTable(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    outletId: json['outletId'] as String,
    primaryTableId: json['primaryTableId'] as String,
    mergedTableIds: (json['mergedTableIds'] as List<dynamic>).cast<String>(),
    isActive: json['isActive'] as bool,
    createdAt: DateTimeConverter.fromJson(
      json['createdAt'],
      field: 'createdAt',
    ),
    updatedAt: DateTimeConverter.fromJson(
      json['updatedAt'],
      field: 'updatedAt',
    ),
  );

  final String id;
  final String tenantId;
  final String outletId;
  final String primaryTableId;
  final List<String> mergedTableIds;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
}
