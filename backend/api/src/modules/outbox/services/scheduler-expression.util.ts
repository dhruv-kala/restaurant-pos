import { BadRequestException } from '@nestjs/common';
import { ScheduledJobScheduleType, type ScheduledJob } from '@prisma/client';

const maxCronSearchMinutes = 366 * 24 * 60;

export function validateScheduleShape(input: {
  scheduleType: ScheduledJobScheduleType;
  cronExpression?: string | null;
  intervalSeconds?: number | null;
}): void {
  if (input.scheduleType === ScheduledJobScheduleType.INTERVAL) {
    if (!Number.isInteger(input.intervalSeconds) || (input.intervalSeconds ?? 0) < 60) {
      throw new BadRequestException('intervalSeconds must be an integer of at least 60');
    }
    if (input.cronExpression) {
      throw new BadRequestException('cronExpression is not allowed for interval schedules');
    }
    return;
  }
  if (input.scheduleType !== ScheduledJobScheduleType.CRON) {
    throw new BadRequestException('Unsupported schedule type');
  }
  if (input.intervalSeconds !== undefined && input.intervalSeconds !== null) {
    throw new BadRequestException('intervalSeconds is not allowed for cron schedules');
  }
  parseCronExpression(input.cronExpression);
}

export function calculateNextRunAt(schedule: ScheduledJob, after: Date): Date {
  if (schedule.scheduleType === ScheduledJobScheduleType.INTERVAL) {
    if (!schedule.intervalSeconds) {
      throw new BadRequestException('interval schedule is missing intervalSeconds');
    }
    return new Date(after.getTime() + schedule.intervalSeconds * 1000);
  }
  const cron = parseCronExpression(schedule.cronExpression);
  const candidate = new Date(after.getTime());
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  for (let i = 0; i < maxCronSearchMinutes; i += 1) {
    if (cron.matches(candidate)) return candidate;
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new BadRequestException('cronExpression does not produce a run within one year');
}

export function parseCronExpression(expression: string | null | undefined): ParsedCronExpression {
  const trimmed = expression?.trim();
  if (!trimmed) throw new BadRequestException('cronExpression is required');
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    throw new BadRequestException('cronExpression must contain five fields');
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
    throw new BadRequestException(
      'Only minute and hour cron fields are supported in scheduler foundation',
    );
  }
  const minuteMatcher = parseCronField(minute, 0, 59, 'minute');
  const hourMatcher = parseCronField(hour, 0, 23, 'hour');
  return {
    expression: trimmed,
    matches(date: Date): boolean {
      return minuteMatcher(date.getUTCMinutes()) && hourMatcher(date.getUTCHours());
    },
  };
}

export interface ParsedCronExpression {
  expression: string;
  matches(date: Date): boolean;
}

function parseCronField(
  value: string,
  min: number,
  max: number,
  field: string,
): (candidate: number) => boolean {
  if (value === '*') return () => true;
  const step = value.match(/^\*\/(\d+)$/);
  if (step) {
    const divisor = Number(step[1]);
    if (!Number.isInteger(divisor) || divisor < 1 || divisor > max + 1) {
      throw new BadRequestException(`${field} cron step is invalid`);
    }
    return (candidate) => candidate % divisor === 0;
  }
  const exact = Number(value);
  if (!Number.isInteger(exact) || exact < min || exact > max) {
    throw new BadRequestException(`${field} cron field is invalid`);
  }
  return (candidate) => candidate === exact;
}
