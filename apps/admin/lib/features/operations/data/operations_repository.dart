import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/operations_query.dart';

class OperationsRepository {
  const OperationsRepository(this._api);
  final OperationsApiService _api;

  Future<PaginatedResponse<BusinessDay>> businessDays(BusinessDayQuery query) =>
      _api.getBusinessDays(
        tenantId: query.tenantId,
        outletId: query.outletId,
        status: query.status,
        businessDate: query.businessDate,
        page: query.page,
        limit: query.limit,
      );

  Future<BusinessDay> openBusinessDay({
    required String tenantId,
    required String outletId,
    required DateTime businessDate,
    String? openingNotes,
  }) => _api.openBusinessDay(
    tenantId: tenantId,
    outletId: outletId,
    businessDate: businessDate,
    openingNotes: openingNotes,
  );

  Future<BusinessDay> closeBusinessDay(
    BusinessDay day, {
    String? closingNotes,
  }) => _api.closeBusinessDay(
    tenantId: day.tenantId,
    id: day.id,
    version: day.version,
    closingNotes: closingNotes,
  );

  Future<BusinessDayClosing> businessDayClosing(BusinessDay day) =>
      _api.getBusinessDayClosing(tenantId: day.tenantId, id: day.id);

  Future<PaginatedResponse<ShiftSession>> shiftSessions(
    ShiftSessionQuery query,
  ) => _api.getShiftSessions(
    tenantId: query.tenantId,
    outletId: query.outletId,
    businessDayId: query.businessDayId,
    assignedUserId: query.assignedUserId,
    status: query.status,
    page: query.page,
    limit: query.limit,
  );

  Future<ShiftSession> openShiftSession({
    required String tenantId,
    required String outletId,
    String? assignedUserId,
    String? shiftId,
    String? openingNotes,
  }) => _api.openShiftSession(
    tenantId: tenantId,
    outletId: outletId,
    assignedUserId: assignedUserId,
    shiftId: shiftId,
    openingNotes: openingNotes,
  );

  Future<ShiftSession> closeShiftSession(
    ShiftSession shift, {
    String? closingNotes,
  }) => _api.closeShiftSession(
    tenantId: shift.tenantId,
    id: shift.id,
    version: shift.version,
    closingNotes: closingNotes,
  );

  Future<PaginatedResponse<CashDrawer>> cashDrawers(CashDrawerQuery query) =>
      _api.getCashDrawers(
        tenantId: query.tenantId,
        outletId: query.outletId,
        businessDayId: query.businessDayId,
        shiftSessionId: query.shiftSessionId,
        status: query.status,
        page: query.page,
        limit: query.limit,
      );

  Future<CashDrawer> openCashDrawer({
    required String tenantId,
    required String shiftSessionId,
    required int openingBalanceMinor,
    required String currencyCode,
    String? openingNotes,
  }) => _api.openCashDrawer(
    tenantId: tenantId,
    shiftSessionId: shiftSessionId,
    openingBalanceMinor: openingBalanceMinor,
    currencyCode: currencyCode,
    openingNotes: openingNotes,
  );

  Future<CashDrawerTransaction> addCashDrawerTransaction({
    required String tenantId,
    required String drawerId,
    required CashDrawerTransactionType transactionType,
    required int amountMinor,
    String? note,
  }) => _api.addCashDrawerTransaction(
    tenantId: tenantId,
    drawerId: drawerId,
    transactionType: transactionType,
    amountMinor: amountMinor,
    note: note,
  );

  Future<CashDrawer> closeCashDrawer(
    CashDrawer drawer, {
    required int closingBalanceMinor,
    String? closingNotes,
  }) => _api.closeCashDrawer(
    tenantId: drawer.tenantId,
    id: drawer.id,
    version: drawer.version,
    closingBalanceMinor: closingBalanceMinor,
    closingNotes: closingNotes,
  );

  Future<List<CashDrawerTransaction>> cashDrawerTransactions(
    CashDrawer drawer,
  ) => _api.getCashDrawerTransactions(
    tenantId: drawer.tenantId,
    drawerId: drawer.id,
  );

  Future<PaginatedResponse<ShiftReconciliation>> shiftReconciliations(
    ShiftReconciliationQuery query,
  ) => _api.getShiftReconciliations(
    tenantId: query.tenantId,
    outletId: query.outletId,
    businessDayId: query.businessDayId,
    shiftSessionId: query.shiftSessionId,
    cashDrawerId: query.cashDrawerId,
    page: query.page,
    limit: query.limit,
  );

  Future<ShiftReconciliation> createShiftReconciliation({
    required String tenantId,
    required String shiftSessionId,
    required String cashDrawerId,
    required int countedCashMinor,
    String? approvalNotes,
  }) => _api.createShiftReconciliation(
    tenantId: tenantId,
    shiftSessionId: shiftSessionId,
    cashDrawerId: cashDrawerId,
    countedCashMinor: countedCashMinor,
    approvalNotes: approvalNotes,
  );
}
