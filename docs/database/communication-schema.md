# Communication Database Schema

Migration:
`backend/api/prisma/migrations/20260614020000_add_communication_foundation/migration.sql`

## Tables

- `communication_providers`
- `communication_messages`
- `communication_attempts`

All tables carry `tenant_id`, use tenant-aware composite foreign keys where
applicable, and have forced row-level security.

## History And Security

- Message recipient/content/idempotency snapshots are immutable.
- Attempts retain immutable identity/request data and cannot be deleted.
- Recipient addresses use ciphertext, hash, and masked fields.
- Provider records store only a secret reference, never credential values.
- Message request fingerprints prevent idempotency-key payload substitution.

Queue, retry, and provider indexes support later Task 27 delivery workers
without adding an external queue dependency.
