export type SeedEnvironment = 'development' | 'staging' | 'production' | 'test';
export type SeedMode = 'all' | 'master' | 'demo';

export interface SeedConfiguration {
  environment: SeedEnvironment;
  mode: SeedMode;
  includeDemoData: boolean;
  demoPassword?: string;
}

function readArgument(args: string[], name: string): string | undefined {
  return args.find((argument) => argument.startsWith(`${name}=`))?.split('=')[1];
}

export function buildSeedConfiguration(
  args: string[],
  environmentVariables: NodeJS.ProcessEnv,
): SeedConfiguration {
  const rawEnvironment = (
    environmentVariables.SEED_ENV ??
    environmentVariables.NODE_ENV ??
    'development'
  ).toLowerCase();
  const environment = (
    ['development', 'staging', 'production', 'test'].includes(rawEnvironment)
      ? rawEnvironment
      : 'development'
  ) as SeedEnvironment;
  const rawMode = readArgument(args, '--mode') ?? 'all';
  if (!['all', 'master', 'demo'].includes(rawMode)) {
    throw new Error(`Unsupported seed mode: ${rawMode}`);
  }
  const mode = rawMode as SeedMode;
  const demoRequested = mode !== 'master';

  if (environment === 'production' && mode === 'demo') {
    throw new Error('Demo seeding is prohibited in production.');
  }

  const includeDemoData =
    demoRequested &&
    environment !== 'production' &&
    (environment === 'development' ||
      environment === 'test' ||
      environmentVariables.SEED_DEMO_DATA === 'true');

  return {
    environment,
    mode,
    includeDemoData,
    demoPassword: includeDemoData ? 'ChangeMe@123' : undefined,
  };
}
