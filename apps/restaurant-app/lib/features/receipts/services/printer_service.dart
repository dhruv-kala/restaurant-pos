class PrinterDevice {
  const PrinterDevice({required this.name, required this.connection});
  final String name;
  final String connection;
}

class PrinterService {
  const PrinterService();

  Future<List<PrinterDevice>>
  getAvailablePrinters() async => const <PrinterDevice>[
    PrinterDevice(name: 'Mock 58mm Printer', connection: 'mock://thermal-58'),
    PrinterDevice(name: 'Mock 80mm Printer', connection: 'mock://thermal-80'),
  ];

  Future<void> connectPrinter(PrinterDevice printer) async {
    await Future<void>.delayed(const Duration(milliseconds: 150));
  }

  Future<void> disconnectPrinter() async {
    await Future<void>.delayed(const Duration(milliseconds: 75));
  }

  Future<void> printReceipt(String formattedReceipt) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }

  Future<void> printPdf(List<int> pdfBytes) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }
}
