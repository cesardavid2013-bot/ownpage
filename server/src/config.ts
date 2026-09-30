import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const env = process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', isProd ? undefined : 'postgres://postgres:postgres@localhost:5432/dating_dev'),
  jwtSecret: required('JWT_SECRET', isProd ? undefined : 'dev-secret-change-me-dev-secret-change-me'),
  accessTokenTtl: '15m',
  refreshTokenDays: 30,
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:8081',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    prices: {
      plus: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? '',
      gold: process.env.STRIPE_PRICE_GOLD_MONTHLY ?? '',
      platinum: process.env.STRIPE_PRICE_PLATINUM_MONTHLY ?? '',
      boost_pack: process.env.STRIPE_PRICE_BOOST_PACK ?? '',
      superlike_pack: process.env.STRIPE_PRICE_SUPERLIKE_PACK ?? '',
    },
  },
  revenueCatWebhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH ?? '',
};

if (isProd && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
