# Receipts Module

The receipts module issues immutable customer receipts and tax invoices from
fully paid bills. Receipt and invoice numbers are outlet scoped and allocated
atomically per UTC business date.

The `printablePayload` JSONB field is the fiscal presentation snapshot. PDF and
thermal layouts render from that snapshot, never from mutable menu or outlet
records. Print and reprint commands append `ReceiptPrintLog` rows and update the
aggregate print counters.

Hardware printer transport is intentionally outside the API. The server records
authorized print outcomes and streams PDF bytes.
