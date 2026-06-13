ALTER TYPE "communication_message_status" ADD VALUE 'READ' AFTER 'DELIVERED';

ALTER TABLE "communication_messages"
  ADD COLUMN "read_at" TIMESTAMPTZ(3);

ALTER TABLE "communication_messages"
  ADD CONSTRAINT "communication_messages_read_status_check"
  CHECK (
    ("status" <> 'READ' AND "read_at" IS NULL)
    OR
    ("status" = 'READ' AND "read_at" IS NOT NULL AND "delivered_at" IS NOT NULL)
  );

CREATE INDEX "communication_attempts_provider_message_idx"
  ON "communication_attempts"("tenant_id", "provider_message_id");
