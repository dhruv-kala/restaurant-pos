import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { BackgroundJobHandler } from '../models/background-job.model';

@Injectable()
export class BackgroundJobRegistry {
  private readonly handlers = new Map<string, BackgroundJobHandler>();

  register(handler: BackgroundJobHandler): void {
    const jobType = handler.jobType.trim();
    if (!jobType) {
      throw new ConflictException('Background job handler type is required');
    }
    if (this.handlers.has(jobType)) {
      throw new ConflictException(`Background job handler already registered for ${jobType}`);
    }
    this.handlers.set(jobType, handler);
  }

  get(jobType: string): BackgroundJobHandler {
    const handler = this.handlers.get(jobType.trim());
    if (!handler) {
      throw new NotFoundException(`No background job handler registered for ${jobType}`);
    }
    return handler;
  }

  has(jobType: string): boolean {
    return this.handlers.has(jobType.trim());
  }

  listJobTypes(): string[] {
    return [...this.handlers.keys()].sort((left, right) => left.localeCompare(right));
  }
}
