import { ConflictException, NotFoundException } from '@nestjs/common';

import { BackgroundJobRegistry } from './background-job-registry.service';

describe('BackgroundJobRegistry', () => {
  it('registers and resolves handlers by job type', () => {
    const registry = new BackgroundJobRegistry();
    const handler = {
      jobType: 'receipt.created',
      handle: jest.fn(),
    };

    registry.register(handler);

    expect(registry.has('receipt.created')).toBe(true);
    expect(registry.get('receipt.created')).toBe(handler);
    expect(registry.listJobTypes()).toEqual(['receipt.created']);
  });

  it('rejects duplicate handlers and missing handlers', () => {
    const registry = new BackgroundJobRegistry();
    const handler = {
      jobType: 'receipt.created',
      handle: jest.fn(),
    };
    registry.register(handler);

    expect(() => registry.register(handler)).toThrow(ConflictException);
    expect(() => registry.get('missing.job')).toThrow(NotFoundException);
  });
});
