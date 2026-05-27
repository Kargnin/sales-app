import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: Required environment variable ${key} is not set.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  PORT: parseInt(process.env.PORT || '3001', 10),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'sales_app_dev',
  REDIS_URL: process.env.REDIS_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
