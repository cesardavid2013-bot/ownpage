import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { requireAuth } from './lib/auth.js';
import { errorHandler } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { discoverRouter } from './routes/discover.js';
import { matchesRouter } from './routes/matches.js';
import { usersRouter } from './routes/users.js';
import { billingRouter, revenueCatWebhook, stripeWebhook } from './routes/billing.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));

  // Webhooks need their own body parsers and must come before express.json().
  app.post('/billing/webhook/stripe', ...stripeWebhook);
  app.post('/billing/webhook/revenuecat', ...revenueCatWebhook);

  app.use(express.json({ limit: '100kb' }));
  app.use(rateLimit({
    windowMs: 60 * 1000,
    limit: config.isTest ? 100_000 : 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_requests' },
  }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', immutable: true, index: false }));

  app.use('/auth', authRouter);
  app.use('/billing', billingRouter);
  app.use('/me', requireAuth, meRouter);
  app.use('/matches', requireAuth, matchesRouter);
  app.use('/users', requireAuth, usersRouter);
  app.use('/', requireAuth, discoverRouter);

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use(errorHandler);
  return app;
}
