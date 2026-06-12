import { sanitizeCommunicationMetadata } from './communication-metadata.util';

describe('sanitizeCommunicationMetadata', () => {
  it('redacts communication credentials without depending on Audit', () => {
    expect(
      sanitizeCommunicationMetadata({
        apiKey: 'secret',
        nested: { authorization: 'bearer', safe: 'value' },
      }),
    ).toEqual({
      apiKey: '[REDACTED]',
      nested: { authorization: '[REDACTED]', safe: 'value' },
    });
  });
});
