import { kitchenSlaStatus } from './kds-sla.util';

describe('kitchenSlaStatus', () => {
  it('classifies on-time, at-risk, and delayed preparation', () => {
    expect(kitchenSlaStatus(10, 10)).toBe('ON_TIME');
    expect(kitchenSlaStatus(10, 12)).toBe('AT_RISK');
    expect(kitchenSlaStatus(10, 13)).toBe('DELAYED');
  });
});
