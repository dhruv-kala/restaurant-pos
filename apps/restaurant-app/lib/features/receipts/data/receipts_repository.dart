import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../domain/receipt_query.dart';

class ReceiptsRepository {
  const ReceiptsRepository(this._api);
  final ReceiptsApiService _api;

  Future<Receipt> generate(String billId, ReceiptType type) =>
      _api.generateReceipt(billId, type: type);
  Future<Receipt> receipt(String id) => _api.getReceipt(id);
  Future<PaginatedResponse<Receipt>> receipts(ReceiptQuery query) =>
      _api.getReceipts(
        type: query.type,
        status: query.status,
        receiptNumber: query.search,
      );
  Future<Receipt> recordPrint(
    String id,
    String printerName,
    PrinterType printerType,
    int copies,
    bool reprint,
  ) => _api.printReceipt(
    id,
    printerName: printerName,
    printerType: printerType,
    copies: copies,
    reprint: reprint,
  );
  Future<List<int>> pdf(String id) => _api.downloadPdf(id);
}
