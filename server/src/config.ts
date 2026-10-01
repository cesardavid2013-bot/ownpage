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
  // Render exposes the service URL as RENDER_EXTERNAL_URL, so a Blueprint deploy needs no extra setup.
  publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ''),
  /** Optional: a built Expo web app (app/dist) served from this same origin. */
  webDir: process.env.WEB_DIR ?? '',
  webAppUrl: '',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    prices: {
      plus: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? '',
      gold: process.env.STRIPE_PRICE_GOLD_MONTHLY ?? '',
      platinum: process.env.STRIPE_PRICE_PLATINUM_MONTHLY ?? '',
      plus_yearly: process.env.STRIPE_PRICE_PLUS_YEARLY ?? '',
      gold_yearly: process.env.STRIPE_PRICE_GOLD_YEARLY ?? '',
      platinum_yearly: process.env.STRIPE_PRICE_PLATINUM_YEARLY ?? '',
      boost_pack: process.env.STRIPE_PRICE_BOOST_PACK ?? '',
      superlike_pack: process.env.STRIPE_PRICE_SUPERLIKE_PACK ?? '',
    },
  },
  revenueCatWebhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH ?? '',
  /** Moderators sign in to /admin with this token. Empty disables the admin API. */
  adminToken: process.env.ADMIN_TOKEN ?? '',
};

config.webAppUrl = (process.env.WEB_APP_URL || (config.webDir ? config.publicUrl : 'http://localhost:8081')).replace(/\/$/, '');

if (isProd && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
