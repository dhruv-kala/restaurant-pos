import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment.validation';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const databaseConnected = await this.isDatabaseConnected();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      service: this.configService.get('APP_NAME', { infer: true }),
      database: databaseConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  private async isDatabaseConnected(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
