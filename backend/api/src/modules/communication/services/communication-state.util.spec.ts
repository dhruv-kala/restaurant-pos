import { CommunicationAttemptStatus, CommunicationMessageStatus } from '@prisma/client';

import {
  canTransitionCommunicationAttempt,
  canTransitionCommunicationMessage,
} from './communication-state.util';

describe('communication state transitions', () => {
  it('permits queue processing and delivery progression', () => {
    expect(
      canTransitionCommunicationMessage(
        CommunicationMessageStatus.QUEUED,
        CommunicationMessageStatus.PROCESSING,
      ),
    ).toBe(true);
    expect(
      canTransitionCommunicationMessage(
        CommunicationMessageStatus.SENT,
        CommunicationMessageStatus.DELIVERED,
      ),
    ).toBe(true);
    expect(
      canTransitionCommunicationMessage(
        CommunicationMessageStatus.DELIVERED,
        CommunicationMessageStatus.READ,
      ),
    ).toBe(true);
  });

  it('does not reopen terminal message states', () => {
    expect(
      canTransitionCommunicationMessage(
        CommunicationMessageStatus.READ,
        CommunicationMessageStatus.QUEUED,
      ),
    ).toBe(false);
  });

  it('requires retries to create a new attempt', () => {
    expect(
      canTransitionCommunicationAttempt(
        CommunicationAttemptStatus.RETRYABLE_FAILED,
        CommunicationAttemptStatus.PROCESSING,
      ),
    ).toBe(false);
  });
});
