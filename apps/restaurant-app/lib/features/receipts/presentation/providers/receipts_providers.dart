import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_auth/restaurant_pos_auth.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../../data/receipts_repository.dart';
import '../../domain/receipt_query.dart';
import '../../services/printer_service.dart';
import '../../services/receipt_formatter.dart';

final receiptsApiServiceProvider = Provider<ReceiptsApiService>(
  (ref) => ReceiptsApiService(ref.watch(dioProvider)),
);
final receiptsRepositoryProvider = Provider<ReceiptsRepository>(
  (ref) => ReceiptsRepository(ref.watch(receiptsApiServiceProvider)),
);
final receiptProvider = FutureProvider.autoDispose.family<Receipt, String>(
  (ref, id) => ref.watch(receiptsRepositoryProvider).receipt(id),
);
final receiptDetailsProvider = receiptProvider;
final receiptsProvider = FutureProvider.autoDispose
    .family<PaginatedResponse<Receipt>, ReceiptQuery>(
      (ref, query) => ref.watch(receiptsRepositoryProvider).receipts(query),
    );
final receiptListProvider = receiptsProvider;
final printerServiceProvider = Provider<PrinterService>(
  (ref) => const PrinterService(),
);
final receiptFormatterProvider = Provider<ReceiptFormatter>(
  (ref) => const ReceiptFormatter(),
);
