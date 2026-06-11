# Receipt Printing Module

## Workflow

```text
Paid bill -> immutable receipt snapshot -> thermal/PDF rendering
          -> print or reprint command -> append-only print audit
```

The server owns receipt identity, fiscal content, authorization, and audit. The
Flutter app owns printer discovery and transport.

Supported layouts are 58mm thermal text at a 32-character target width, 80mm
thermal text at a 48-character target width, and A4 PDF streamed by NestJS with
`pdfkit`. Layouts include outlet, customer, bill, item, GST breakdown, payment,
total, footer, and verification payload sections.

The Flutter `PrinterService` is a mock abstraction exposing
`getAvailablePrinters`, `connectPrinter`, `disconnectPrinter`, `printReceipt`,
and `printPdf`. Bluetooth, USB, and network adapters remain deferred.

PDF files are generated on demand from the immutable JSONB snapshot. The QR
payload carries receipt number, bill number, payment reference, and verification
code. The PDF currently renders a QR placeholder; image encoding and a public
verification endpoint are future work.
