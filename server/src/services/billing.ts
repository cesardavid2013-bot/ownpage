import { tx } from '../db/pool.js';
import { CATALOG, ENTITLEMENTS, type Plan, type Product } from '../plans.js';

export type Provider = 'stripe' | 'revenuecat' | 'dev';

/**
 * Applies a purchase to a user. Idempotent per (provider, ref): webhooks may be delivered more
 * than once and only the first delivery changes anything. Returns false for duplicates.
 */
export async function grantProduct(opts: {
  userId: string;
  product: Product;
  provider: Provider;
  ref: string;
  periodEnd?: Date | null;
}): Promise<boolean> {
  return tx(async (c) => {
    const user = (await c.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [opts.userId])).rows[0];
    if (!user) return false;
    const ins = await c.query(
      `INSERT INTO payments (user_id, provider, provider_ref, product, status) VALUES ($1, $2, $3, $4, 'succeeded')
       ON CONFLICT (provider, provider_ref) DO NOTHING RETURNING id`,
      [opts.userId, opts.provider, opts.ref, opts.product],
    );
    if (!ins.rowCount) return false;
    const item = CATALOG[opts.product];
    if (item.kind === 'subscription') {
      const plan = opts.product as Plan;
      const end = opts.periodEnd ?? new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await c.query(
        `UPDATE users SET plan = $2, plan_expires_at = $3, plan_source = $4, boost_credits = boost_credits + $5 WHERE id = $1`,
        [opts.userId, plan, end, opts.provider, ENTITLEMENTS[plan].boostsPerPeriod],
      );
    } else if (opts.product === 'boost_pack') {
      await c.query('UPDATE users SET boost_credits = boost_credits + $2 WHERE id = $1', [opts.userId, item.quantity]);
    } else {
      await c.query('UPDATE users SET superlike_credits = superlike_credits + $2 WHERE id = $1', [opts.userId, item.quantity]);
    }
    return true;
  });
}

/** Ends a subscription (only if it came from the same provider, so a Stripe cancel can't kill an App Store plan). */
export async function revokePlan(userId: string, provider: Provider) {
  await tx(async (c) => {
    await c.query(
      `UPDATE users SET plan = 'free', plan_expires_at = NULL, plan_source = NULL,
         incognito = false, hide_age = false, hide_distance = false
       WHERE id = $1 AND plan_source = $2`,
      [userId, provider],
    );
  });
}
