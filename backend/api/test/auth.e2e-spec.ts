import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  outletId: string | null;
  roles: string[];
}

describe('Auth endpoints (e2e)', () => {
  let app: INestApplication | undefined;
  const user: AuthUserResponse = {
    id: 'user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    tenantId: 'tenant-id',
    outletId: 'outlet-id',
    roles: ['TENANT_ADMIN'],
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.APP_NAME = 'Restaurant POS API';
    process.env.API_PREFIX = 'api/v1';
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/restaurant_pos?schema=public';
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const { AppModule } = await import('../src/app.module');
    const { AuthService } = await import('../src/modules/auth/auth.service');
    const { PrismaService } = await import('../src/prisma/prisma.service');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(AuthService)
      .useValue({
        login: jest.fn().mockResolvedValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user,
        }),
        refresh: jest.fn().mockResolvedValue({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
        logout: jest.fn().mockResolvedValue({
          message: 'Logged out successfully',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/auth/login', async () => {
    const response = await request(getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user,
    });
  });

  it('POST /api/v1/auth/refresh', async () => {
    await request(getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'refresh-token' })
      .expect(200)
      .expect({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
  });

  it('POST /api/v1/auth/logout', async () => {
    await request(getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'refresh-token' })
      .expect(200)
      .expect({ message: 'Logged out successfully' });
  });

  it('GET /api/v1/auth/me with a valid access token', async () => {
    const accessToken = await new JwtService().signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        outletId: user.outletId,
        roles: user.roles,
        type: 'access',
      },
      { secret: 'test_access_secret', expiresIn: '15m' },
    );

    await request(getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(user);
  });

  function getHttpServer(): Server {
    if (app === undefined) {
      throw new Error('Test application was not initialized');
    }

    return app.getHttpServer() as Server;
  }
});
