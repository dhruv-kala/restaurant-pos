import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService, type HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'Restaurant POS API',
        database: 'connected',
        timestamp: '2026-06-10T00:00:00.000Z',
      },
    },
  })
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }
}
