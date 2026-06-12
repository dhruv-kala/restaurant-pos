import type { CommunicationChannel, CommunicationRecipientType, Prisma } from '@prisma/client';

export interface EnqueueCommunicationMessage {
  tenantId: string;
  outletId?: string | null;
  notificationId?: string | null;
  providerId?: string | null;
  channel: CommunicationChannel;
  recipientType: CommunicationRecipientType;
  recipientUserId?: string | null;
  recipientReferenceId?: string | null;
  recipientAddressCiphertext: string;
  recipientAddressHash: string;
  recipientAddressMasked: string;
  subjectSnapshot?: string | null;
  bodySnapshot: string;
  locale?: string;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue | null;
  scheduledAt?: Date | null;
}
