import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { BackgroundJobRegistry } from './background-job-registry.service';
import { BackgroundJobsService } from './background-jobs.service';

@Injectable()
export class BackgroundWorkerService {
  private readonly logger = new Logger(BackgroundWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: BackgroundJobsService,
    private readonly registry: BackgroundJobRegistry,
  ) {}

  async runOnce(
    workerId: string,
    limit = 10,
  ): Promise<{ claimed: number; succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;
    const claimed = await this.prisma.$transaction((tx) =>
      this.jobs.claimBatch(tx, { workerId, limit }),
    );
    for (const job of claimed) {
      const attemptNumber = job.attemptCount;
      try {
        const handler = this.registry.get(job.jobType);
        await handler.handle(job);
        await this.prisma.$transaction((tx) => this.jobs.markSucceeded(tx, job.id, attemptNumber));
        succeeded += 1;
      } catch (error) {
        const safeError = this.safeError(error);
        await this.prisma.$transaction((tx) =>
          this.jobs.markFailed(tx, job.id, attemptNumber, {
            retryable: true,
            errorCode: safeError.code,
            errorClassification: safeError.classification,
            errorMessage: safeError.message,
          }),
        );
        this.logger.warn(`Background job ${job.id} failed: ${safeError.code}`);
        failed += 1;
      }
    }
    return { claimed: claimed.length, succeeded, failed };
  }

  private safeError(error: unknown): {
    code: string;
    classification: string;
    message: string;
  } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        code: error.code,
        classification: 'PRISMA',
        message: 'Database operation failed',
      };
    }
    if (error instanceof Error) {
      return {
        code: error.name || 'JOB_FAILED',
        classification: 'APPLICATION',
        message: error.message.slice(0, 500),
      };
    }
    return {
      code: 'JOB_FAILED',
      classification: 'UNKNOWN',
      message: 'Background job failed',
    };
  }
}
