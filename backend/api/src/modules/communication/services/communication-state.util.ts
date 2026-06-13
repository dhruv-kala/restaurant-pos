import { CommunicationAttemptStatus, CommunicationMessageStatus } from '@prisma/client';

const messageTransitions: Record<
  CommunicationMessageStatus,
  readonly CommunicationMessageStatus[]
> = {
  QUEUED: [CommunicationMessageStatus.PROCESSING, CommunicationMessageStatus.CANCELLED],
  PROCESSING: [
    CommunicationMessageStatus.QUEUED,
    CommunicationMessageStatus.SENT,
    CommunicationMessageStatus.FAILED,
    CommunicationMessageStatus.CANCELLED,
  ],
  SENT: [CommunicationMessageStatus.DELIVERED, CommunicationMessageStatus.FAILED],
  DELIVERED: [CommunicationMessageStatus.READ],
  READ: [],
  FAILED: [],
  CANCELLED: [],
};

const attemptTransitions: Record<
  CommunicationAttemptStatus,
  readonly CommunicationAttemptStatus[]
> = {
  PENDING: [CommunicationAttemptStatus.PROCESSING],
  PROCESSING: [
    CommunicationAttemptStatus.ACCEPTED,
    CommunicationAttemptStatus.DELIVERED,
    CommunicationAttemptStatus.RETRYABLE_FAILED,
    CommunicationAttemptStatus.TERMINAL_FAILED,
  ],
  ACCEPTED: [
    CommunicationAttemptStatus.DELIVERED,
    CommunicationAttemptStatus.RETRYABLE_FAILED,
    CommunicationAttemptStatus.TERMINAL_FAILED,
  ],
  DELIVERED: [],
  RETRYABLE_FAILED: [],
  TERMINAL_FAILED: [],
};

export function canTransitionCommunicationMessage(
  from: CommunicationMessageStatus,
  to: CommunicationMessageStatus,
): boolean {
  return messageTransitions[from].includes(to);
}

export function canTransitionCommunicationAttempt(
  from: CommunicationAttemptStatus,
  to: CommunicationAttemptStatus,
): boolean {
  return attemptTransitions[from].includes(to);
}
