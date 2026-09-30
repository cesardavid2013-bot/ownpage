import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';
import { REVENUECAT_KEYS } from './config';
import type { Me, Product } from './types';

/**
 * Purchases:
 *  - Web: Stripe Checkout (server creates the session, we redirect).
 *  - iOS / Android: App Store / Google Play billing through RevenueCat (required by store rules).
 *  - Development without payment keys: the API's dev-activate endpoint simulates a purchase.
 * The server is the source of truth for entitlements in every case (webhooks update the plan).
 */

type Result = { status: 'success' | 'cancelled' | 'redirected'; user?: Me };

const storeKey = Platform.OS === 'ios' ? REVENUECAT_KEYS.ios : Platform.OS === 'android' ? REVENUECAT_KEYS.android : '';
let rcConfiguredFor: string | null = null;

async function revenueCat(userId: string) {
  if (!storeKey) return null;
  const Purchases = (await import('react-native-purchases')).default;
  if (rcConfiguredFor !== userId) {
    Purchases.configure({ apiKey: storeKey, appUserID: userId });
    rcConfiguredFor = userId;
  }
  return Purchases;
}

async function devActivate(product: Product): Promise<Result> {
  const user = await api<Me>('/billing/dev-activate', { body: { product } });
  return { status: 'success', user };
}

export async function purchase(product: Product, userId: string): Promise<Result> {
  if (Platform.OS !== 'web') {
    const Purchases = await revenueCat(userId);
    if (Purchases) {
      const offerings = await Purchases.getOfferings();
      const pkg = Object.values(offerings.all)
        .flatMap((o) => o.availablePackages)
        .find((p) => p.product.identifier.toLowerCase().includes(product.replace('_pack', '')));
      if (!pkg) throw new Error('product_unavailable');
      try {
        await Purchases.purchasePackage(pkg);
      } catch (e: any) {
        if (e?.userCancelled) return { status: 'cancelled' };
        throw e;
      }
      // The RevenueCat webhook updates the server; give it a moment, then reload.
      await new Promise((r) => setTimeout(r, 2500));
      return { status: 'success', user: await api<Me>('/me') };
    }
    return devActivate(product);
  }

  const { url, devMode } = await api<{ url: string | null; devMode: boolean }>('/billing/checkout', { body: { product } });
  if (!url && devMode) return devActivate(product);
  if (!url) throw new Error('payments_unavailable');
  window.location.assign(url);
  return { status: 'redirected' };
}

export async function restorePurchases(userId: string): Promise<Me> {
  const Purchases = await revenueCat(userId);
  if (Purchases) {
    await Purchases.restorePurchases();
    await new Promise((r) => setTimeout(r, 2000));
  }
  return api<Me>('/me');
}

export async function manageSubscription(planSource: string | null) {
  if (planSource === 'stripe') {
    const { url } = await api<{ url: string }>('/billing/portal', { body: {} });
    if (Platform.OS === 'web') window.location.assign(url);
    else await WebBrowser.openBrowserAsync(url);
    return;
  }
  const url = Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
  await WebBrowser.openBrowserAsync(url);
}

/** Localized store prices (App Store / Play) when RevenueCat is configured; the store is the price authority on devices. */
export async function storePrices(userId: string): Promise<Partial<Record<Product, string>>> {
  if (Platform.OS === 'web') return {};
  try {
    const Purchases = await revenueCat(userId);
    if (!Purchases) return {};
    const offerings = await Purchases.getOfferings();
    const out: Partial<Record<Product, string>> = {};
    const all: Product[] = ['plus', 'gold', 'platinum', 'boost_pack', 'superlike_pack'];
    for (const pkg of Object.values(offerings.all).flatMap((o) => o.availablePackages)) {
      const id = pkg.product.identifier.toLowerCase();
      const match = all.find((p) => id.includes(p.replace('_pack', '')));
      if (match && !out[match]) out[match] = pkg.product.priceString;
    }
    return out;
  } catch {
    return {};
  }
}
