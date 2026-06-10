import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MembershipStatus, Prisma, TenantStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';

import type { EnvironmentVariables } from '../../config/environment.validation';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthResponseDto,
  LogoutResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './types/jwt-payload.type';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';
const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5fR3H9uCzYVYIBz4h5VfN0D2I.8xJzK';
const REFRESH_TOKEN_HASH_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const userAccount = await this.prisma.userAccount.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });
    const passwordHash = userAccount?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);

    if (
      !passwordMatches ||
      userAccount === null ||
      userAccount.email === null ||
      userAccount.passwordHash === null ||
      userAccount.status !== UserStatus.ACTIVE ||
      userAccount.deletedAt !== null
    ) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.resolveAuthenticatedUser(
      userAccount.id,
      userAccount.email,
      userAccount.displayName,
    );
    const tokens = await this.issueTokenPair(user);

    return { ...tokens, user };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPairResponseDto> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      storedToken === null ||
      storedToken.userId !== payload.sub ||
      storedToken.revokedAt !== null ||
      storedToken.expiresAt <= new Date() ||
      storedToken.user.email === null ||
      storedToken.user.status !== UserStatus.ACTIVE ||
      storedToken.user.deletedAt !== null
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const tokenMatches = await bcrypt.compare(
      dto.refreshToken,
      storedToken.tokenHash,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const user = await this.resolveAuthenticatedUser(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.displayName,
    );

    return this.rotateRefreshToken(storedToken.id, user);
  }

  async logout(dto: RefreshTokenDto): Promise<LogoutResponseDto> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (
      storedToken === null ||
      storedToken.userId !== payload.sub ||
      storedToken.revokedAt !== null ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const tokenMatches = await bcrypt.compare(
      dto.refreshToken,
      storedToken.tokenHash,
    );
    if (!tokenMatches) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const result = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    return { message: 'Logged out successfully' };
  }

  private async resolveAuthenticatedUser(
    userId: string,
    email: string,
    name: string,
  ): Promise<AuthenticatedUser> {
    return this.prisma.$transaction(async (transaction) => {
      await this.setLocalContext(transaction, 'app.user_id', userId);

      const membership = await transaction.tenantMembership.findFirst({
        where: {
          userId,
          status: MembershipStatus.ACTIVE,
          revokedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, tenantId: true },
      });

      if (membership === null) {
        return {
          id: userId,
          email,
          name,
          tenantId: null,
          outletId: null,
          roles: [],
        };
      }

      await this.setLocalContext(
        transaction,
        'app.tenant_id',
        membership.tenantId,
      );

      const scopedMembership = await transaction.tenantMembership.findUnique({
        where: {
          tenantId_id: {
            tenantId: membership.tenantId,
            id: membership.id,
          },
        },
        select: {
          tenant: { select: { status: true, deletedAt: true } },
          roleAssignments: {
            where: { role: { deletedAt: null } },
            orderBy: { assignedAt: 'asc' },
            select: {
              role: { select: { name: true, systemKey: true } },
            },
          },
          outletAssignments: {
            where: { outlet: { status: 'ACTIVE', deletedAt: null } },
            orderBy: { assignedAt: 'asc' },
            select: { outletId: true },
          },
        },
      });

      if (
        scopedMembership === null ||
        scopedMembership.tenant.status !== TenantStatus.ACTIVE ||
        scopedMembership.tenant.deletedAt !== null
      ) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      return {
        id: userId,
        email,
        name,
        tenantId: membership.tenantId,
        outletId:
          scopedMembership.outletAssignments[0]?.outletId ?? null,
        roles: scopedMembership.roleAssignments.map(({ role }) =>
          (role.systemKey ?? role.name).toUpperCase(),
        ),
      };
    });
  }

  private async issueTokenPair(
    user: AuthenticatedUser,
  ): Promise<TokenPairResponseDto> {
    const accessToken = await this.signAccessToken(user);
    const refreshTokenId = randomUUID();
    const refreshToken = await this.signRefreshToken(user.id, refreshTokenId);
    const refreshPayload = this.jwtService.decode<RefreshTokenPayload>(refreshToken);

    if (refreshPayload.exp === undefined) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }
    const expiresAt = new Date(refreshPayload.exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash: await bcrypt.hash(
          refreshToken,
          REFRESH_TOKEN_HASH_ROUNDS,
        ),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async rotateRefreshToken(
    currentTokenId: string,
    user: AuthenticatedUser,
  ): Promise<TokenPairResponseDto> {
    const replacementTokenId = randomUUID();
    const refreshToken = await this.signRefreshToken(
      user.id,
      replacementTokenId,
    );
    const refreshPayload = this.jwtService.decode<RefreshTokenPayload>(refreshToken);

    if (refreshPayload.exp === undefined) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }
    const expiresAt = new Date(refreshPayload.exp * 1000);

    const tokenHash = await bcrypt.hash(
      refreshToken,
      REFRESH_TOKEN_HASH_ROUNDS,
    );
    const accessToken = await this.signAccessToken(user);

    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: currentTokenId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: replacementTokenId,
        },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
      }

      await transaction.refreshToken.create({
        data: {
          id: replacementTokenId,
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      outletId: user.outletId,
      roles: user.roles,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.getExpiration('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  private signRefreshToken(userId: string, tokenId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
      jti: tokenId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.getExpiration('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', {
            infer: true,
          }),
        },
      );

      if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
        throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
      }

      return payload;
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }
  }

  private getExpiration(
    key: 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN',
  ): SignOptions['expiresIn'] {
    return this.configService.get(key, { infer: true });
  }

  private async setLocalContext(
    transaction: Prisma.TransactionClient,
    key: 'app.user_id' | 'app.tenant_id',
    value: string,
  ): Promise<void> {
    await transaction.$queryRaw`SELECT set_config(${key}, ${value}, true)`;
  }
}
