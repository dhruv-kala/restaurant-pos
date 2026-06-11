# Receipts Feature

Provides receipt history, receipt detail, invoice preview, and print screens.
The feature consumes shared receipt contracts and records every successful mock
print through the backend.

`PrinterService` is a hardware abstraction with mock discovery, connection,
thermal text printing, and PDF printing methods. Bluetooth, USB, and network
adapters can replace it later without changing receipt screens.
