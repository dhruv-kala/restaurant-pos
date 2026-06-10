import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('Restaurant POS API'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('returns healthy status when PostgreSQL is connected', async () => {
    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('Restaurant POS API');
    expect(result.database).toBe('connected');
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });

  it('returns degraded status without exposing connection errors', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection details'));

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'degraded',
      service: 'Restaurant POS API',
      database: 'disconnected',
    });
  });
});
