import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { EnvironmentVariables } from '../../../config/environment.validation';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { AccessTokenPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (
      payload.type !== 'access' ||
      !payload.sub ||
      !payload.email ||
      !payload.name
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantId: payload.tenantId,
      outletId: payload.outletId,
      roles: payload.roles,
      ...(payload.permissions === undefined
        ? {}
        : { permissions: payload.permissions }),
    };
  }
}
