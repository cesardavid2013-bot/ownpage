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
import { adminRouter } from './routes/admin.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApp({ webDir = config.webDir }: { webDir?: string } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        // blob: is how the web app reads a picked photo before uploading it.
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'", 'blob:', 'ws:', 'wss:'],
        // Local runs are plain http (including from a phone on the same Wi-Fi); upgrading would break every asset.
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
  }));
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

  app.use('/admin/api', adminRouter);
  app.use('/admin', express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'admin'), { index: 'index.html' }));
  if (webDir) serveWebApp(app, webDir);
  app.use('/auth', authRouter);
  app.use('/billing', billingRouter);
  app.use('/me', requireAuth, meRouter);
  app.use('/matches', requireAuth, matchesRouter);
  app.use('/users', requireAuth, usersRouter);
  // Discovery routes live at the root; only they require a session, so unknown paths still 404.
  const discoveryPaths = ['/discover', '/swipes', '/likes', '/boost', '/top-picks'];
  app.use((req, res, next) => (discoveryPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`)) ? requireAuth(req, res, next) : next()), discoverRouter);

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use(errorHandler);
  return app;
}

/**
 * Serves the exported Expo web app from the API origin. Browser navigations (Accept: text/html)
 * get the single-page shell, so app routes like /likes never collide with the JSON API.
 */
function serveWebApp(app: express.Express, dir: string) {
  const root = path.resolve(dir);
  const shell = path.join(root, 'index.html');
  app.use('/_expo', express.static(path.join(root, '_expo'), { maxAge: '1y', immutable: true, index: false }));
  app.use('/assets', express.static(path.join(root, 'assets'), { maxAge: '30d', index: false }));
  app.get('/favicon.ico', (_req, res) => res.sendFile(path.join(root, 'favicon.ico')));
  app.get('*', (req, res, next) => {
    if (req.accepts(['json', 'html']) !== 'html') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(shell);
  });
}
