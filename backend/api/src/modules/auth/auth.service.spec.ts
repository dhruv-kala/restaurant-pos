import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MembershipStatus, TenantStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { EnvironmentVariables } from '../../config/environment.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userId = '01975f6f-b03d-7ac2-893f-c7e858a42ff1';
  const tenantId = '01975f6f-b03d-7ac2-893f-c7e858a42ff2';
  const membershipId = '01975f6f-b03d-7ac2-893f-c7e858a42ff3';
  const outletId = '01975f6f-b03d-7ac2-893f-c7e858a42ff4';
  let passwordHash: string;
  let createdRefreshToken:
    | { userId: string; tokenHash: string; expiresAt: Date }
    | undefined;
  let revokedRefreshToken:
    | { id: string; revokedAt: Date | null }
    | undefined;
  let prismaMock: {
    userAccount: { findUnique: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('Admin@123', 4);
  });

  beforeEach(() => {
    createdRefreshToken = undefined;
    revokedRefreshToken = undefined;
    prismaMock = {
      userAccount: { findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn().mockImplementation(
          (args: {
            data: { userId: string; tokenHash: string; expiresAt: Date };
          }) => {
            createdRefreshToken = args.data;
            return Promise.resolve({});
          },
        ),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockImplementation(
          (args: {
            where: { id: string; revokedAt: Date | null };
            data: { revokedAt: Date };
          }) => {
            revokedRefreshToken = {
              id: args.where.id,
              revokedAt: args.data.revokedAt,
            };
            return Promise.resolve({ count: 1 });
          },
        ),
      },
      $transaction: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: keyof EnvironmentVariables) => {
        const values: Partial<EnvironmentVariables> = {
          JWT_ACCESS_SECRET: 'test_access_secret',
          JWT_REFRESH_SECRET: 'test_refresh_secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key];
      }),
    } as unknown as ConfigService<EnvironmentVariables, true>;

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      new JwtService(),
      configService,
    );
  });

  it('uses the same generic error when the email does not exist', async () => {
    prismaMock.userAccount.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<UnauthorizedException>>({
        message: 'Invalid email or password',
      }),
    );
  });

  it('returns platform-admin context without a tenant role', async () => {
    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: userId,
      email: 'platform@example.com',
      displayName: 'Platform Admin',
      passwordHash,
      isPlatformAdmin: true,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });

    const result = await service.login({
      email: 'platform@example.com',
      password: 'Admin@123',
    });

    expect(result.user).toEqual({
      id: userId,
      email: 'platform@example.com',
      name: 'Platform Admin',
      tenantId: null,
      outletId: null,
      roles: ['SUPER_ADMIN'],
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns tokens and a safe tenant-scoped user on valid login', async () => {
    prismaMock.userAccount.findUnique.mockResolvedValue({
      id: userId,
      email: 'admin@example.com',
      displayName: 'Admin User',
      passwordHash,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });
    prismaMock.$transaction.mockImplementation(
      async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback({
          $queryRaw: jest.fn().mockResolvedValue([]),
          tenantMembership: {
            findFirst: jest.fn().mockResolvedValue({
              id: membershipId,
              tenantId,
              status: MembershipStatus.ACTIVE,
            }),
            findUnique: jest.fn().mockResolvedValue({
              tenant: { status: TenantStatus.ACTIVE, deletedAt: null },
              roleAssignments: [
                {
                  role: { name: 'Tenant Admin', systemKey: 'tenant_admin' },
                },
              ],
              outletAssignments: [{ outletId }],
            }),
          },
        }),
    );

    const result = await service.login({
      email: 'ADMIN@example.com',
      password: 'Admin@123',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: userId,
      email: 'admin@example.com',
      name: 'Admin User',
      tenantId,
      outletId,
      roles: ['TENANT_ADMIN'],
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(createdRefreshToken?.userId).toBe(userId);
    expect(createdRefreshToken?.expiresAt).toBeInstanceOf(Date);
    const storedHash = createdRefreshToken?.tokenHash;
    expect(typeof storedHash).toBe('string');
    if (storedHash === undefined) {
      throw new Error('Refresh token hash was not captured');
    }
    expect(storedHash).not.toBe(result.refreshToken);
    await expect(
      bcrypt.compare(result.refreshToken, storedHash),
    ).resolves.toBe(true);
  });

  it('revokes a valid refresh token during logout', async () => {
    const jwtService = new JwtService();
    const tokenId = '01975f6f-b03d-7ac2-893f-c7e858a42ff5';
    const refreshToken = await jwtService.signAsync(
      { sub: userId, type: 'refresh', jti: tokenId },
      { secret: 'test_refresh_secret', expiresIn: '7d' },
    );
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: tokenId,
      userId,
      tokenHash: await bcrypt.hash(refreshToken, 4),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    await expect(service.logout({ refreshToken })).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(revokedRefreshToken?.id).toBe(tokenId);
    expect(revokedRefreshToken?.revokedAt).toBeInstanceOf(Date);
  });

  it('rotates a valid refresh token and revokes the old record', async () => {
    const jwtService = new JwtService();
    const tokenId = '01975f6f-b03d-7ac2-893f-c7e858a42ff5';
    const refreshToken = await jwtService.signAsync(
      { sub: userId, type: 'refresh', jti: tokenId },
      { secret: 'test_refresh_secret', expiresIn: '7d' },
    );
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: tokenId,
      userId,
      tokenHash: await bcrypt.hash(refreshToken, 4),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: userId,
        email: 'admin@example.com',
        displayName: 'Admin User',
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    const replacementTokens: Array<{
      id: string;
      tokenHash: string;
      expiresAt: Date;
    }> = [];
    prismaMock.$transaction
      .mockImplementationOnce(
        async (callback: (transaction: unknown) => Promise<unknown>) =>
          callback({
            $queryRaw: jest.fn().mockResolvedValue([]),
            tenantMembership: {
              findFirst: jest.fn().mockResolvedValue({
                id: membershipId,
                tenantId,
              }),
              findUnique: jest.fn().mockResolvedValue({
                tenant: { status: TenantStatus.ACTIVE, deletedAt: null },
                roleAssignments: [
                  {
                    role: { name: 'Tenant Admin', systemKey: 'tenant_admin' },
                  },
                ],
                outletAssignments: [{ outletId }],
              }),
            },
          }),
      )
      .mockImplementationOnce(
        async (callback: (transaction: unknown) => Promise<unknown>) =>
          callback({
            refreshToken: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
              create: jest.fn().mockImplementation(
                (args: {
                  data: {
                    id: string;
                    tokenHash: string;
                    expiresAt: Date;
                  };
                }) => {
                  replacementTokens.push(args.data);
                  return Promise.resolve({});
                },
              ),
            },
          }),
      );

    const result = await service.refresh({ refreshToken });

    expect(result.accessToken).not.toBe('');
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(replacementTokens).toHaveLength(1);
    expect(replacementTokens[0]?.id).not.toBe(tokenId);
    expect(replacementTokens[0]?.tokenHash).not.toBe(result.refreshToken);
    await expect(
      bcrypt.compare(
        result.refreshToken,
        replacementTokens[0]?.tokenHash ?? '',
      ),
    ).resolves.toBe(true);
  });
});
