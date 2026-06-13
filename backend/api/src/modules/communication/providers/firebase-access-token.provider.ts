import { Injectable } from '@nestjs/common';
import { GoogleAuth, type JWTInput } from 'google-auth-library';

import { CommunicationProviderError } from './communication-provider.adapter';
import { CommunicationSecretResolver } from '../services/communication-secret-resolver';

const FIREBASE_MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

@Injectable()
export class FirebaseAccessTokenProvider {
  constructor(private readonly secrets: CommunicationSecretResolver) {}

  async get(secretReference: string | null): Promise<string> {
    const secret = this.secrets.resolve(secretReference);
    if (!secret) {
      throw this.credentialsUnavailable();
    }
    try {
      const auth = secret.trim().startsWith('{')
        ? new GoogleAuth({
            credentials: this.credentials(secret),
            scopes: [FIREBASE_MESSAGING_SCOPE],
          })
        : new GoogleAuth({
            keyFile: secret,
            scopes: [FIREBASE_MESSAGING_SCOPE],
          });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      const token = typeof accessToken === 'string' ? accessToken : accessToken.token;
      if (!token) throw new Error('Access token missing');
      return token;
    } catch {
      throw this.credentialsUnavailable();
    }
  }

  private credentials(secret: string): JWTInput {
    const value: unknown = JSON.parse(secret);
    if (
      !value ||
      Array.isArray(value) ||
      typeof value !== 'object'
    ) {
      throw new Error('Invalid service account');
    }
    const credentials = value as Record<string, unknown>;
    if (
      typeof credentials.client_email !== 'string' ||
      typeof credentials.private_key !== 'string'
    ) {
      throw new Error('Invalid service account');
    }
    return credentials;
  }

  private credentialsUnavailable(): CommunicationProviderError {
    return new CommunicationProviderError(
      'Firebase credentials are unavailable',
      'FIREBASE_CREDENTIALS_UNAVAILABLE',
      false,
    );
  }
}
