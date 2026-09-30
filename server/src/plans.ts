export const PLANS = ['free', 'plus', 'gold', 'platinum'] as const;
export type Plan = (typeof PLANS)[number];

export interface Entitlements {
  /** null = unlimited likes per rolling 24h */
  dailyLikes: number | null;
  dailySuperLikes: number;
  rewind: boolean;
  passport: boolean;
  seeWhoLikesYou: boolean;
  seeLikesSent: boolean;
  hideAgeDistance: boolean;
  incognito: boolean;
  priorityLikes: boolean;
  /** Platinum: attach a note to a super like, visible before matching */
  noteWithSuperLike: boolean;
  /** Free boosts granted on every billing period */
  boostsPerPeriod: number;
}

export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    dailyLikes: 50, dailySuperLikes: 1, rewind: false, passport: false, seeWhoLikesYou: false,
    seeLikesSent: false, hideAgeDistance: false, incognito: false, priorityLikes: false,
    noteWithSuperLike: false, boostsPerPeriod: 0,
  },
  plus: {
    dailyLikes: null, dailySuperLikes: 1, rewind: true, passport: true, seeWhoLikesYou: false,
    seeLikesSent: false, hideAgeDistance: true, incognito: false, priorityLikes: false,
    noteWithSuperLike: false, boostsPerPeriod: 0,
  },
  gold: {
    dailyLikes: null, dailySuperLikes: 5, rewind: true, passport: true, seeWhoLikesYou: true,
    seeLikesSent: false, hideAgeDistance: true, incognito: false, priorityLikes: false,
    noteWithSuperLike: false, boostsPerPeriod: 1,
  },
  platinum: {
    dailyLikes: null, dailySuperLikes: 10, rewind: true, passport: true, seeWhoLikesYou: true,
    seeLikesSent: true, hideAgeDistance: true, incognito: true, priorityLikes: true,
    noteWithSuperLike: true, boostsPerPeriod: 2,
  },
};

export type Product = 'plus' | 'gold' | 'platinum' | 'boost_pack' | 'superlike_pack';
export const PRODUCTS: Product[] = ['plus', 'gold', 'platinum', 'boost_pack', 'superlike_pack'];

/** Display prices in USD cents; real charged prices live in Stripe / App Store / Play. */
export const CATALOG: Record<Product, { kind: 'subscription' | 'consumable'; priceCents: number; quantity?: number }> = {
  plus: { kind: 'subscription', priceCents: 999 },
  gold: { kind: 'subscription', priceCents: 1999 },
  platinum: { kind: 'subscription', priceCents: 2999 },
  boost_pack: { kind: 'consumable', priceCents: 1499, quantity: 5 },
  superlike_pack: { kind: 'consumable', priceCents: 999, quantity: 15 },
};

export function effectivePlan(user: { plan: string; plan_expires_at: Date | string | null }): Plan {
  if (user.plan === 'free') return 'free';
  if (user.plan_expires_at && new Date(user.plan_expires_at).getTime() < Date.now()) return 'free';
  return user.plan as Plan;
}

export function entitlementsFor(user: { plan: string; plan_expires_at: Date | string | null }): Entitlements {
  return ENTITLEMENTS[effectivePlan(user)];
}
