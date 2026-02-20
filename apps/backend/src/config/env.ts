import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Firebase (optionnel en dev avec emulateur)
  FIREBASE_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Cookie
  COOKIE_SECRET: z.string().min(32).optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    if (process.env['NODE_ENV'] !== 'test') {
      process.exit(1);
    }
    // En test, retourner des valeurs par défaut
    return {
      NODE_ENV: 'test' as const,
      PORT: 3001,
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-characters!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters!',
      CORS_ORIGIN: 'http://localhost:5173',
    };
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
