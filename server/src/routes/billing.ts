import express, { Router } from 'express';
import crypto from 'node:crypto';
import Stripe from 'stripe';
import { z } from 'zod';
import { config } from '../config.js';
import { one, query } from '../db/pool.js';
import { requireAuth } from '../lib/auth.js';
import { ah, badRequest, forbidden, unauthorized } from '../lib/errors.js';
import { CATALOG, ENTITLEMENTS, PRODUCTS, type Product } from '../plans.js';
import { grantProduct, revokePlan } from '../services/billing.js';
import { getUser, privateProfile } from '../services/users.js';

export const billingRouter = Router();

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;
const stripeReady = (p: Product) => !!stripe && !!config.stripe.prices[p];

billingRouter.get('/plans', (_req, res) => {
  res.json({
    products: PRODUCTS.map((id) => ({ id, ...CATALOG[id], webCheckout: stripeReady(id) })),
    entitlements: ENTITLEMENTS,
    devMode: !config.isProd,
  });
});

const productSchema = z.object({ product: z.enum(PRODUCTS as [Product, ...Product[]]) });

billingRouter.post('/checkout', requireAuth, ah(async (req, res) => {
  const { product } = productSchema.parse(req.body);
  if (!stripeReady(product)) {
    if (config.isProd) throw badRequest('payments_unavailable');
    return res.json({ url: null, devMode: true });
  }
  const user = (await getUser(req.userId!))!;
  let customer = user.stripe_customer_id;
  if (!customer) {
    customer = (await stripe!.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } })).id;
    await query('UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [user.id, customer]);
  }
  const subscription = CATALOG[product].kind === 'subscription';
  const metadata = { userId: user.id, product };
  const session = await stripe!.checkout.sessions.create({
    mode: subscription ? 'subscription' : 'payment',
    customer,
    client_reference_id: user.id,
    line_items: [{ price: config.stripe.prices[product], quantity: 1 }],
    metadata,
    ...(subscription ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    allow_promotion_codes: true,
    locale: 'auto',
    success_url: `${config.webAppUrl}/premium?status=success`,
    cancel_url: `${config.webAppUrl}/premium?status=cancel`,
  });
  res.json({ url: session.url, devMode: false });
}));

billingRouter.post('/portal', requireAuth, ah(async (req, res) => {
  const user = (await getUser(req.userId!))!;
  if (!stripe || !user.stripe_customer_id) throw badRequest('no_billing_account');
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${config.webAppUrl}/premium`,
  });
  res.json({ url: portal.url });
}));

/** Development only: simulates a successful purchase so the whole app can be tested without real payments. */
billingRouter.post('/dev-activate', requireAuth, ah(async (req, res) => {
  if (config.isProd) throw forbidden();
  const { product } = productSchema.parse(req.body);
  await grantProduct({ userId: req.userId!, product, provider: 'dev', ref: crypto.randomUUID() });
  res.json(await privateProfile((await getUser(req.userId!))!));
}));

function subscriptionPeriodEnd(sub: any): Date | null {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
  return typeof ts === 'number' ? new Date(ts * 1000) : null;
}

/** Stripe webhook. Mounted with a raw body parser because signatures are computed over the raw bytes. */
export const stripeWebhook = [
  express.raw({ type: 'application/json' }),
  ah(async (req, res) => {
    if (!stripe || !config.stripe.webhookSecret) return res.status(400).json({ error: 'payments_unavailable' });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, config.stripe.webhookSecret);
    } catch {
      return res.status(400).json({ error: 'invalid_signature' });
    }
    const obj = event.data.object as any;
    switch (event.type) {
      case 'checkout.session.completed': {
        // One-off packs are granted here; subscriptions are granted by invoice.paid (first + renewals).
        if (obj.mode === 'payment' && obj.payment_status === 'paid' && obj.metadata?.userId) {
          await grantProduct({ userId: obj.metadata.userId, product: obj.metadata.product, provider: 'stripe', ref: obj.id });
        }
        break;
      }
      case 'invoice.paid': {
        const subId = obj.parent?.subscription_details?.subscription ?? obj.subscription;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId.id);
        const { userId, product } = sub.metadata ?? {};
        if (userId && product) {
          await grantProduct({ userId, product: product as Product, provider: 'stripe', ref: obj.id, periodEnd: subscriptionPeriodEnd(sub) });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        if (obj.metadata?.userId) await revokePlan(obj.metadata.userId, 'stripe');
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  }),
];

function productFromStoreId(storeId: string): Product | null {
  const id = storeId.toLowerCase();
  if (id.includes('platinum')) return 'platinum';
  if (id.includes('gold')) return 'gold';
  if (id.includes('plus')) return 'plus';
  if (id.includes('boost')) return 'boost_pack';
  if (id.includes('superlike') || id.includes('super_like')) return 'superlike_pack';
  return null;
}

/** RevenueCat webhook for App Store / Google Play purchases. app_user_id must be our user id. */
export const revenueCatWebhook = [
  express.json(),
  ah(async (req, res) => {
    const expected = config.revenueCatWebhookAuth;
    const got = req.headers.authorization ?? '';
    if (!expected || got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
      throw unauthorized();
    }
    const ev = req.body?.event;
    if (!ev?.app_user_id || !ev.type) return res.json({ received: true });
    const userId = String(ev.app_user_id);
    if (!z.string().uuid().safeParse(userId).success || !(await one('SELECT 1 FROM users WHERE id = $1', [userId]))) {
      return res.json({ received: true });
    }
    const product = productFromStoreId(String(ev.new_product_id ?? ev.product_id ?? ''));
    const expires = ev.expiration_at_ms ? new Date(Number(ev.expiration_at_ms)) : null;
    switch (ev.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
      case 'NON_RENEWING_PURCHASE':
        if (product) await grantProduct({ userId, product, provider: 'revenuecat', ref: String(ev.id), periodEnd: expires });
        break;
      case 'EXPIRATION':
        await revokePlan(userId, 'revenuecat');
        break;
      default:
        break;
    }
    res.json({ received: true });
  }),
];
