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
  DATABASE_URL: z.string().default('postgresql://vidya:vidya_password@localhost:5432/vidya_db?schema=public'),
  JWT_ACCESS_SECRET: z.string().default('vidya-development-jwt-access-secret-minimum-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('vidya-development-jwt-refresh-secret-minimum-32-chars-long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Institutional / School Deployment Profile Variables
  SCHOOL_NAME: z.string().optional(),
  SCHOOL_CODE: z.string().optional(),
  SCHOOL_DESCRIPTION: z.string().optional(),
  SCHOOL_BOARD: z.string().optional(),
  SCHOOL_AFFILIATION_NO: z.string().optional(),
  SCHOOL_EMAIL: z.string().optional(),
  SCHOOL_PHONE: z.string().optional(),
  SCHOOL_CITY: z.string().optional(),
  SCHOOL_STATE: z.string().optional(),
  SCHOOL_THEME_COLOR: z.string().optional(),
  SCHOOL_THEME_MODE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
