import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { EnvironmentVariables } from '../../../config/environment.validation';

const FORMAT = 'v1';

@Injectable()
export class CommunicationAddressProtector {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  encrypt(value: string): string {
    const normalized = value.trim();
    if (!normalized) throw new BadRequestException('Communication address is required');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    return [
      FORMAT,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const [format, ivValue, tagValue, encryptedValue, extra] = ciphertext.split(':');
    if (format !== FORMAT || !ivValue || !tagValue || !encryptedValue || extra !== undefined) {
      throw new ServiceUnavailableException('Protected communication address is invalid');
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(ivValue, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('Protected communication address cannot be decrypted');
    }
  }

  private key(): Buffer {
    const encoded = this.config.get('COMMUNICATION_ADDRESS_ENCRYPTION_KEY', {
      infer: true,
    });
    if (!encoded) {
      throw new ServiceUnavailableException('Communication address encryption key is unavailable');
    }
    const key = /^[0-9a-f]{64}$/i.test(encoded)
      ? Buffer.from(encoded, 'hex')
      : Buffer.from(encoded, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        'Communication address encryption key must contain 32 bytes',
      );
    }
    return key;
  }
}
