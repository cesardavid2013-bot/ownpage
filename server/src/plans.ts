export const PLANS = ['free', 'plus', 'gold', 'platinum'] as const;
export type Plan = (typeof PLANS)[number];

export interface Entitlements {
  /** null = unlimited likes per rolling 24h */
  dailyLikes: number | null;
  dailySuperLikes: number;
  rewind: boolean;
  passport: boolean;
  /** Filter discovery by verified profiles, intentions and answered prompts */
  advancedFilters: boolean;
  hideAgeDistance: boolean;
  seeWhoLikesYou: boolean;
  /** A daily, scored selection of the most compatible profiles */
  topPicks: boolean;
  /** See when your messages have been read */
  readReceipts: boolean;
  seeLikesSent: boolean;
  incognito: boolean;
  priorityLikes: boolean;
  /** Platinum: attach a note to a super like, visible before matching */
  noteWithSuperLike: boolean;
  /** Free boosts granted for every month of membership */
  boostsPerPeriod: number;
}

const NONE = {
  rewind: false, passport: false, advancedFilters: false, hideAgeDistance: false, seeWhoLikesYou: false,
  topPicks: false, readReceipts: false, seeLikesSent: false, incognito: false, priorityLikes: false,
  noteWithSuperLike: false,
};

export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: { ...NONE, dailyLikes: 50, dailySuperLikes: 1, boostsPerPeriod: 0 },
  plus: {
    ...NONE, dailyLikes: null, dailySuperLikes: 1, boostsPerPeriod: 0,
    rewind: true, passport: true, advancedFilters: true, hideAgeDistance: true,
  },
  gold: {
    ...NONE, dailyLikes: null, dailySuperLikes: 5, boostsPerPeriod: 1,
    rewind: true, passport: true, advancedFilters: true, hideAgeDistance: true,
    seeWhoLikesYou: true, topPicks: true, readReceipts: true,
  },
  platinum: {
    dailyLikes: null, dailySuperLikes: 10, boostsPerPeriod: 2,
    rewind: true, passport: true, advancedFilters: true, hideAgeDistance: true,
    seeWhoLikesYou: true, topPicks: true, readReceipts: true,
    seeLikesSent: true, incognito: true, priorityLikes: true, noteWithSuperLike: true,
  },
};

export type Product =
  | 'plus' | 'gold' | 'platinum'
  | 'plus_yearly' | 'gold_yearly' | 'platinum_yearly'
  | 'boost_pack' | 'superlike_pack';
export const PRODUCTS: Product[] = [
  'plus', 'gold', 'platinum', 'plus_yearly', 'gold_yearly', 'platinum_yearly', 'boost_pack', 'superlike_pack',
];

type CatalogItem =
  | { kind: 'subscription'; plan: Exclude<Plan, 'free'>; months: number; priceCents: number }
  | { kind: 'consumable'; priceCents: number; quantity: number };

/** Display prices in USD cents; real charged prices live in Stripe / App Store / Play. Yearly ≈ 40% off. */
export const CATALOG: Record<Product, CatalogItem> = {
  plus: { kind: 'subscription', plan: 'plus', months: 1, priceCents: 999 },
  gold: { kind: 'subscription', plan: 'gold', months: 1, priceCents: 1999 },
  platinum: { kind: 'subscription', plan: 'platinum', months: 1, priceCents: 2999 },
  plus_yearly: { kind: 'subscription', plan: 'plus', months: 12, priceCents: 5999 },
  gold_yearly: { kind: 'subscription', plan: 'gold', months: 12, priceCents: 11999 },
  platinum_yearly: { kind: 'subscription', plan: 'platinum', months: 12, priceCents: 17999 },
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
