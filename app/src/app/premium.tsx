import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MembershipCard } from '@/components/MembershipCard';
import { Button, Muted, Row, webMaxWidth } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { purchase, storePrices } from '@/lib/purchases';
import { colors, font, gradients, radius, space } from '@/lib/theme';
import type { Entitlements, Plan, Product } from '@/lib/types';

type Tier = Exclude<Plan, 'free'>;
const TIERS: Tier[] = ['plus', 'gold', 'platinum'];
const RANK: Record<Plan, number> = { free: 0, plus: 1, gold: 2, platinum: 3 };

interface Catalog {
  products: { id: Product; kind: string; priceCents: number; quantity?: number }[];
  entitlements: Record<Plan, Entitlements>;
  devMode: boolean;
}

function features(e: Entitlements, t: TFunction): string[] {
  const f: string[] = [];
  if (e.dailyLikes == null) f.push(t('premium.features.unlimitedLikes'));
  if (e.rewind) f.push(t('premium.features.rewind'));
  if (e.passport) f.push(t('premium.features.passport'));
  if (e.advancedFilters) f.push(t('premium.features.advancedFilters'));
  if (e.hideAgeDistance) f.push(t('premium.features.hideAds'));
  if (e.seeWhoLikesYou) f.push(t('premium.features.seeLikes'));
  if (e.topPicks) f.push(t('premium.features.topPicks'));
  if (e.readReceipts) f.push(t('premium.features.readReceipts'));
  f.push(t('premium.features.superLikes', { count: e.dailySuperLikes }));
  if (e.boostsPerPeriod) f.push(t('premium.features.boosts', { count: e.boostsPerPeriod }));
  if (e.priorityLikes) f.push(t('premium.features.priorityLikes'));
  if (e.noteWithSuperLike) f.push(t('premium.features.notes'));
  if (e.incognito) f.push(t('premium.features.incognito'));
  if (e.seeLikesSent) f.push(t('premium.features.likesSent'));
  return f;
}

export default function Premium() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [prices, setPrices] = useState<Partial<Record<Product, string>>>({});
  const [tier, setTier] = useState<Tier>(user.plan === 'free' ? 'gold' : (user.plan as Tier));
  const [yearly, setYearly] = useState(true);
  const product = (yearly ? `${tier}_yearly` : tier) as Product;
  const [busy, setBusy] = useState<Product | null>(null);

  useEffect(() => {
    api<Catalog>('/billing/plans', { auth: false }).then(setCatalog).catch((e) => notify(errorMessage(e)));
    storePrices(user.id).then(setPrices);
  }, [user.id]);

  useEffect(() => {
    // Returning from Stripe Checkout on the web. The webhook may take a moment.
    if (status === 'success') {
      const timer = setTimeout(async () => {
        const me = await useAuth.getState().reload();
        if (me && me.plan !== 'free') notify(t('premium.success', { plan: t(`premium.plans.${me.plan}`) }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, t]);

  const money = (p: Product) => {
    if (prices[p]) return prices[p]!;
    const cents = catalog?.products.find((x) => x.id === p)?.priceCents ?? 0;
    return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD' }).format(cents / 100);
  };
  const cents = (p: Product) => catalog?.products.find((x) => x.id === p)?.priceCents ?? 0;
  const perMonth = (p: Product) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD' }).format(cents(p) / 1200);
  const savePercent = cents(tier) ? Math.round((1 - cents(`${tier}_yearly` as Product) / (cents(tier) * 12)) * 100) : 0;

  async function buy(product: Product) {
    setBusy(product);
    try {
      const res = await purchase(product, user.id);
      if (res.status === 'cancelled') notify(t('premium.cancelled'));
      if (res.status === 'success' && res.user) {
        useAuth.getState().setUser(res.user);
        const label = product === 'boost_pack' ? t('premium.boostPack') : product === 'superlike_pack' ? t('premium.superLikePack') : t(`premium.plans.${product.replace('_yearly', '')}`);
        notify(t('premium.success', { plan: label }));
        if (product !== 'boost_pack' && product !== 'superlike_pack') router.back();
      }
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const isCurrent = user.plan === tier;
  const isLower = RANK[tier] < RANK[user.plan];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[{ padding: space(5), paddingBottom: space(12), gap: space(5) }, webMaxWidth]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
        </Row>

        <View style={{ alignItems: 'center', gap: space(2) }}>
          <Text style={styles.crownStar}>✦</Text>
          <Text style={styles.title}>{t('premium.title')}</Text>
          <Muted style={{ textAlign: 'center' }}>{t('premium.subtitle')}</Muted>
        </View>

        <Row style={styles.tabs}>
          {TIERS.map((k) => (
            <Pressable key={k} onPress={() => setTier(k)} style={[styles.tab, tier === k && styles.tabActive]} testID={`tier-${k}`}>
              <Text style={[styles.tabText, tier === k && { color: colors.text }]}>{t(`premium.plans.${k}`).replace('Lumi ', '')}</Text>
              {k === 'gold' ? <Text style={styles.popular}>{t('premium.mostPopular')}</Text> : null}
              {k === 'platinum' ? <Text style={[styles.popular, { color: colors.platinum }]}>{t('premium.bestValue')}</Text> : null}
            </Pressable>
          ))}
        </Row>

        <Row style={styles.period}>
          {[false, true].map((y) => (
            <Pressable key={String(y)} onPress={() => setYearly(y)} style={[styles.periodBtn, yearly === y && styles.periodActive]} testID={y ? 'period-yearly' : 'period-monthly'}>
              <Text style={[styles.periodText, yearly === y && { color: colors.onPrimary }]}>{t(y ? 'premium.yearly' : 'premium.monthly')}</Text>
              {y && savePercent > 0 ? <Text style={[styles.saveText, yearly && { color: colors.onPrimary }]}>{t('premium.save', { percent: savePercent })}</Text> : null}
            </Pressable>
          ))}
        </Row>

        <MembershipCard tier={tier} holder={user.name} />
        <View style={{ gap: space(1) }}>
          <Row style={{ alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.price}>{yearly && !prices[product] ? perMonth(product) : money(product)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15, fontFamily: font.body }}>{yearly && prices[product] ? '' : t('premium.perMonth')}</Text>
          </Row>
          {yearly ? <Text style={styles.billed}>{t('premium.billedYearly', { price: money(product) })}</Text> : null}
          <View style={{ gap: space(3), marginTop: space(3) }}>
            {catalog && features(catalog.entitlements[tier], t).map((f) => (
              <Row key={f} style={{ gap: space(3), alignItems: 'flex-start' }}>
                <View style={styles.dash} />
                <Text style={{ color: colors.text, fontSize: 15.5, flex: 1, lineHeight: 22, fontFamily: font.body }}>{f}</Text>
              </Row>
            ))}
          </View>
        </View>

        {isCurrent ? (
          <View style={styles.current}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={{ color: colors.text, fontFamily: font.bold }}>
              {t('premium.current')}{user.planExpiresAt ? ` · ${t('premium.activeUntil', { date: new Date(user.planExpiresAt).toLocaleDateString(i18n.language) })}` : ''}
            </Text>
          </View>
        ) : (
          <Button
            title={t('premium.choose', { plan: t(`premium.plans.${tier}`) })}
            variant="primary"
            onPress={() => buy(product)}
            loading={busy === product}
            disabled={isLower || !catalog}
            testID="buy-plan"
          />
        )}

        <Text style={styles.section}>{t('premium.boosts')}</Text>
        <Pack icon="flash-outline" color={colors.primary} title={t('premium.boostPack')} desc={t('premium.boostPackDesc')}
          owned={t('premium.credits', { count: user.boost.credits })} price={money('boost_pack')}
          busy={busy === 'boost_pack'} onBuy={() => buy('boost_pack')} buyLabel={t('premium.buy')} />
        <Pack icon="star-outline" color={colors.gold} title={t('premium.superLikePack')} desc={t('premium.superLikePackDesc')}
          owned={t('premium.credits', { count: user.limits.superLikesRemaining })} price={money('superlike_pack')}
          busy={busy === 'superlike_pack'} onBuy={() => buy('superlike_pack')} buyLabel={t('premium.buy')} />

        {catalog?.devMode ? <Muted style={styles.dev}>{t('premium.devNotice')}</Muted> : null}
        <Muted style={styles.legal}>{t('premium.legal')}</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pack({ icon, color, title, desc, owned, price, busy, onBuy, buyLabel }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; title: string; desc: string; owned: string; price: string;
  busy: boolean; onBuy: () => void; buyLabel: string;
}) {
  return (
    <View style={styles.pack}>
      <View style={[styles.packIcon, { backgroundColor: color + '22' }]}><Ionicons name={icon} size={26} color={color} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.packTitle}>{title}</Text>
        <Text style={styles.packDesc}>{desc}</Text>
        <Text style={[styles.packDesc, { color }]}>{owned}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space(2) }}>
        <Text style={styles.packPrice}>{price}</Text>
        <Button title={buyLabel} variant="secondary" onPress={onBuy} loading={busy} style={{ minWidth: 90 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  period: { alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(233,217,190,0.22)', padding: 4 },
  periodBtn: { paddingHorizontal: space(5), paddingVertical: space(2), borderRadius: 999, alignItems: 'center', minWidth: 120 },
  periodActive: { backgroundColor: colors.primary },
  periodText: { color: colors.textMuted, fontSize: 14, fontFamily: font.semibold },
  saveText: { color: colors.gold, fontSize: 10.5, fontFamily: font.semibold, letterSpacing: 0.6 },
  billed: { color: colors.textMuted, fontSize: 13, fontFamily: font.body },
  crownStar: { color: colors.gold, fontSize: 26, fontFamily: font.body },
  title: { color: colors.text, fontSize: 38, fontFamily: font.display },
  tabs: { backgroundColor: colors.card, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space(2.5), borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.cardHigh },
  tabText: { color: colors.textMuted, fontSize: 15, fontFamily: font.bold },
  popular: { color: colors.gold, fontSize: 9, textTransform: 'uppercase', marginTop: 2, fontFamily: font.bold },
  price: { fontSize: 46, fontFamily: font.display, color: colors.text },
  dash: { width: 12, height: 1, backgroundColor: colors.gold, marginTop: 11 },
  current: { flexDirection: 'row', gap: space(2), alignItems: 'center', justifyContent: 'center', padding: space(4), backgroundColor: colors.card, borderRadius: radius.pill },
  section: { color: colors.text, fontSize: 20, marginTop: space(4), fontFamily: font.bold },
  pack: { flexDirection: 'row', gap: space(3), alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.border },
  packIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  packTitle: { color: colors.text, fontSize: 16, fontFamily: font.bold },
  packDesc: { color: colors.textMuted, fontSize: 13, fontFamily: font.body },
  packPrice: { color: colors.text, fontSize: 16, fontFamily: font.bold },
  dev: { textAlign: 'center', color: colors.gold, fontSize: 13, fontFamily: font.body },
  legal: { textAlign: 'center', fontSize: 11, lineHeight: 16, color: colors.textFaint, fontFamily: font.body },
});
