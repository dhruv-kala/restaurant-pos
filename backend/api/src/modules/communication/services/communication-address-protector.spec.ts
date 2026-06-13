import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../../config/environment.validation';
import { CommunicationAddressProtector } from './communication-address-protector';

function protector(key?: string) {
  const config = {
    get: jest.fn(() => key),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  return new CommunicationAddressProtector(config);
}

describe('CommunicationAddressProtector', () => {
  it('round trips an address using authenticated encryption', () => {
    const service = protector(Buffer.alloc(32, 7).toString('base64'));
    const encrypted = service.encrypt('customer@example.test');

    expect(encrypted).not.toContain('customer@example.test');
    expect(service.decrypt(encrypted)).toBe('customer@example.test');
  });

  it('rejects tampered ciphertext and invalid keys', () => {
    const service = protector(Buffer.alloc(32, 7).toString('base64'));
    const encrypted = service.encrypt('customer@example.test');
    const parts = encrypted.split(':');
    parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
    expect(() => service.decrypt(parts.join(':'))).toThrow(ServiceUnavailableException);
    expect(() => protector('short').encrypt('customer@example.test')).toThrow(
      ServiceUnavailableException,
    );
  });
});
