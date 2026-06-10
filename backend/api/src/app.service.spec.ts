import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('Restaurant POS API'),
          },
        },
      ],
    }).compile();

    service = module.get(AppService);
  });

  it('returns API metadata', () => {
    expect(service.getApiMetadata()).toEqual({
      name: 'Restaurant POS API',
      status: 'running',
    });
  });
});
