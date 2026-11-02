import { ttlToSeconds } from '../common/ttl';

const REQUIRED = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

/**
 * Minimal, dependency-free environment validation. Fails fast at startup.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env = { ...config } as Record<string, string | undefined>;
  const errors: string[] = [];

  for (const key of REQUIRED) {
    if (!env[key]) errors.push(`${key} is required`);
  }

  env.NODE_ENV ??= 'development';
  env.PORT ??= '4000';
  env.JWT_ACCESS_TTL ??= '15m';
  env.JWT_REFRESH_TTL ??= '7d';
  env.STORAGE_ROOT ??= '../../storage/development-only';
  env.CORS_ORIGINS ??= 'http://localhost:5173,http://localhost:4200';

  for (const key of ['JWT_ACCESS_TTL', 'JWT_REFRESH_TTL'] as const) {
    try {
      ttlToSeconds(env[key] as string);
    } catch (error) {
      errors.push(`${key}: ${(error as Error).message}`);
    }
  }

  if (Number.isNaN(Number(env.PORT))) errors.push('PORT must be a number');

  if (env.NODE_ENV === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      const value = env[key] ?? '';
      if (value.startsWith('change-me') || value.length < 32) {
        errors.push(
          `${key} must be a strong random secret (>= 32 chars) in production`,
        );
      }
    }
    if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }
  return env;
}
