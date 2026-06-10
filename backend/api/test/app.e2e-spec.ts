import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

interface HealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

describe('Health endpoint (e2e)', () => {
  let app: INestApplication | undefined;

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
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/health', async () => {
    if (app === undefined) {
      throw new Error('Test application was not initialized');
    }

    const response = await request(app.getHttpServer() as Server)
      .get('/api/v1/health')
      .expect(200);
    const body = response.body as HealthResponse;

    expect(body).toMatchObject({
      status: 'ok',
      service: 'Restaurant POS API',
      database: 'connected',
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });
});
