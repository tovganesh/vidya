import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load root or local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://vidyasetu:vidyasetu_password@localhost:5432/vidyasetu_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().default('vidyasetu-development-jwt-access-secret-minimum-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('vidyasetu-development-jwt-refresh-secret-minimum-32-chars-long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
