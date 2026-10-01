import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Per-member limits for actions bots abuse (mass likes, spam messages, report flooding, uploads).
 * Keyed by the signed-in member, so people sharing an IP are unaffected. Budgets sit well above
 * what a person does by hand.
 */
export function userLimiter(name: string, windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit: config.isTest ? Number(process.env[`TEST_LIMIT_${name.toUpperCase()}`] ?? 100_000) : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Mounted behind requireAuth, so every request has a member id.
    keyGenerator: (req) => `${name}:${req.userId}`,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'too_many_requests' },
  });
}

export const swipeLimiter = userLimiter('swipes', 60 * 1000, 90);
export const messageLimiter = userLimiter('messages', 60 * 1000, 40);
export const reportLimiter = userLimiter('reports', 60 * 60 * 1000, 20);
