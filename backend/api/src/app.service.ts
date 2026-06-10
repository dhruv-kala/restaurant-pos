import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from './config/environment.validation';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  getApiMetadata(): { name: string; status: string } {
    return {
      name: this.configService.get('APP_NAME', { infer: true }),
      status: 'running',
    };
  }
}
