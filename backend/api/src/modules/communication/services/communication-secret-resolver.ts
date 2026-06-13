import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class CommunicationSecretResolver {
  resolve(reference: string | null): string | undefined {
    if (!reference) return undefined;
    const match = /^env:([A-Z][A-Z0-9_]*)$/.exec(reference);
    if (!match) {
      throw new ServiceUnavailableException('Communication secret reference is unsupported');
    }
    const value = process.env[match[1]];
    if (!value) {
      throw new ServiceUnavailableException('Communication provider secret is unavailable');
    }
    return value;
  }
}
