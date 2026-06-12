import { Prisma } from '@prisma/client';
import { SeedConfiguration } from './seed-configuration';

export interface DemoSeedState {
  tenantId?: string;
  outletId?: string;
  adminUserId?: string;
  userIds: Record<string, string>;
  roleIds: Record<string, string>;
  categoryIds: Record<string, string>;
  menuItemIds: Record<string, string>;
  unitIds: Record<string, string>;
  ingredientIds: Record<string, string>;
  stationIds: Record<string, string>;
}

export interface SeedContext {
  prisma: Prisma.TransactionClient;
  configuration: SeedConfiguration;
  demo: DemoSeedState;
}

export type SeedStep = (context: SeedContext) => Promise<void>;

export function createSeedContext(
  prisma: Prisma.TransactionClient,
  configuration: SeedConfiguration,
): SeedContext {
  return {
    prisma,
    configuration,
    demo: {
      userIds: {},
      roleIds: {},
      categoryIds: {},
      menuItemIds: {},
      unitIds: {},
      ingredientIds: {},
      stationIds: {},
    },
  };
}

export function requireDemoValue(
  value: string | undefined,
  label: string,
): string {
  if (!value) {
    throw new Error(`Missing demo seed dependency: ${label}`);
  }
  return value;
}

export function seedUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`;
}
