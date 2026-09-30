import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Button, Muted, PlanBadge, Title } from '@/components/ui';
import { LANGUAGES, currentLanguage, errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT_EMAIL } from '@/lib/config';
import { confirm, notify } from '@/lib/notify';
import { manageSubscription, restorePurchases } from '@/lib/purchases';
import { colors, radius, space } from '@/lib/theme';
import type { Me } from '@/lib/types';

const CITIES = [
  { name: 'New York', lat: 40.71, lng: -74.01 }, { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Paris', lat: 48.86, lng: 2.35 }, { name: 'Madrid', lat: 40.42, lng: -3.7 },
  { name: 'Ciudad de México', lat: 19.43, lng: -99.13 }, { name: 'São Paulo', lat: -23.55, lng: -46.63 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38 }, { name: 'Tokyo', lat: 35.68, lng: 139.69 },
  { name: 'Seoul', lat: 37.57, lng: 126.98 }, { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Berlin', lat: 52.52, lng: 13.4 }, { name: 'Miami', lat: 25.76, lng: -80.19 },
];

type Settings = Me['settings'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [s, setS] = useState<Settings>(user.settings);
  const [passportOpen, setPassportOpen] = useState(false);
  const ent = user.entitlements;

  async function update(patch: Partial<Settings>) {
    const next = { ...s, ...patch };
    setS(next);
    try {
      useAuth.getState().setUser(await api<Me>('/me/settings', { method: 'PATCH', body: patch }));
    } catch (e) {
      setS(s);
      notify(errorMessage(e));
    }
  }

  function gated(allowed: boolean, fn: () => void) {
    if (allowed) fn();
    else router.push('/premium');
  }

  async function setPassport(loc: { lat: number; lng: number } | null) {
    setPassportOpen(false);
    try {
      useAuth.getState().setUser(await api<Me>('/me/passport', { method: 'PUT', body: { location: loc } }));
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  async function restore() {
    try {
      useAuth.getState().setUser(await restorePurchases(user.id));
      notify(t('premium.success', { plan: t(`premium.plans.${useAuth.getState().user!.plan}`, { defaultValue: 'Lumi' }) }));
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  async function deleteAccount() {
    if (!(await confirm(t('settings.deleteConfirm'), t('common.delete'), t('common.cancel')))) return;
    try {
      await api('/me', { method: 'DELETE' });
      await useAuth.getState().logout();
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  const passportCity = user.passport
    ? CITIES.find((c) => Math.abs(c.lat - user.passport!.lat) < 0.05 && Math.abs(c.lng - user.passport!.lng) < 0.05)?.name ?? '📍'
    : t('settings.passportCurrent');

  return (
    <Screen scroll>
      <Header title={t('settings.title')} />

      <Section title={t('settings.discovery')}>
        <Item label={t('settings.passport')} hint={passportCity} premium={!ent.passport}
          onPress={() => gated(ent.passport, () => setPassportOpen(true))} chevron />
        <Stepper label={t('settings.maxDistance')} value={`${s.maxDistanceKm} km`}
          onMinus={() => update({ maxDistanceKm: Math.max(1, s.maxDistanceKm - (s.maxDistanceKm > 20 ? 10 : 1)) })}
          onPlus={() => update({ maxDistanceKm: Math.min(500, s.maxDistanceKm + (s.maxDistanceKm >= 20 ? 10 : 1)) })} />
        <Stepper label={`${t('settings.ageRange')} (min)`} value={String(s.ageMin)}
          onMinus={() => update({ ageMin: Math.max(18, s.ageMin - 1) })}
          onPlus={() => update({ ageMin: Math.min(s.ageMax, s.ageMin + 1) })} />
        <Stepper label={`${t('settings.ageRange')} (max)`} value={s.ageMax >= 99 ? '99+' : String(s.ageMax)}
          onMinus={() => update({ ageMax: Math.max(s.ageMin, Math.min(99, s.ageMax) - 1) })}
          onPlus={() => update({ ageMax: Math.min(99, s.ageMax + 1) })} />
        <Toggle label={t('settings.globalMode')} hint={t('settings.globalModeHint')} value={s.globalMode} onChange={(v) => update({ globalMode: v })} />
      </Section>

      <Section title={t('settings.privacy')}>
        <Toggle label={t('settings.hideAge')} value={s.hideAge} premium={!ent.hideAgeDistance}
          onChange={(v) => gated(ent.hideAgeDistance, () => update({ hideAge: v }))} />
        <Toggle label={t('settings.hideDistance')} value={s.hideDistance} premium={!ent.hideAgeDistance}
          onChange={(v) => gated(ent.hideAgeDistance, () => update({ hideDistance: v }))} />
        <Toggle label={t('settings.incognito')} hint={t('settings.incognitoHint')} value={s.incognito} premium={!ent.incognito}
          onChange={(v) => gated(ent.incognito, () => update({ incognito: v }))} />
      </Section>

      <Section title={t('settings.language')}>
        <Item label={LANGUAGES.find((l) => l.code === currentLanguage())?.name ?? 'English'} onPress={() => router.push('/language')} chevron icon="globe-outline" />
      </Section>

      <Section title={t('settings.account')}>
        <Item label={t('premium.title')} right={<PlanBadge plan={user.plan} />} onPress={() => router.push('/premium')} chevron icon="diamond-outline" />
        {user.plan !== 'free' && user.planSource && user.planSource !== 'dev' ? (
          <Item label={t('settings.manageSubscription')} onPress={() => manageSubscription(user.planSource).catch((e) => notify(errorMessage(e)))} chevron />
        ) : null}
        <Item label={t('settings.restore')} onPress={restore} />
        <Item label={user.email} icon="mail-outline" />
      </Section>

      <Section title={t('settings.help')}>
        <Item label={t('settings.safetyTips')} icon="shield-checkmark-outline" onPress={() => notify(t('safety.tips'), t('safety.title'))} chevron />
        <Item label={t('settings.contact')} icon="help-circle-outline" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} chevron />
      </Section>

      <View style={{ gap: space(3), marginTop: space(6) }}>
        <Button title={t('auth.logout')} variant="secondary" icon="log-out-outline" onPress={() => useAuth.getState().logout()} />
        <Button title={t('settings.deleteAccount')} variant="ghost" onPress={deleteAccount} />
        <Muted style={{ textAlign: 'center', fontSize: 12 }}>
          Lumi · {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Muted>
      </View>

      <Sheet visible={passportOpen} onClose={() => setPassportOpen(false)}>
        <Title style={{ fontSize: 22 }}>{t('settings.passport')}</Title>
        <Muted>{t('settings.passportHint')}</Muted>
        <Item label={t('settings.passportCurrent')} icon="navigate" onPress={() => setPassport(null)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {CITIES.map((c) => (
            <Pressable key={c.name} onPress={() => setPassport({ lat: c.lat, lng: c.lng })} style={styles.city}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space(5), gap: space(2) }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.section}>{children}</View>
    </View>
  );
}

function PremiumTag() {
  return <View style={styles.tag}><Ionicons name="diamond" size={10} color="#2A1D05" /><Text style={styles.tagText}>PREMIUM</Text></View>;
}

function Item({ label, hint, onPress, chevron, icon, right, premium }: {
  label: string; hint?: string; onPress?: () => void; chevron?: boolean; icon?: keyof typeof Ionicons.glyphMap; right?: ReactNode; premium?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.item}>
      {icon ? <Ionicons name={icon} size={20} color={colors.textMuted} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel} numberOfLines={1}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {premium ? <PremiumTag /> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

function Toggle({ label, hint, value, onChange, premium }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; premium?: boolean }) {
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {premium ? <PremiumTag /> : null}
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { flex: 1 }]}>{label}</Text>
      <Pressable onPress={onMinus} style={styles.step} accessibilityLabel="-"><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={onPlus} style={styles.step} accessibilityLabel="+"><Ionicons name="add" size={18} color={colors.text} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.primary, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: space(1) },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingVertical: space(3.5),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 56,
  },
  itemLabel: { color: colors.text, fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { color: '#2A1D05', fontSize: 9, fontWeight: '900' },
  step: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cardHigh, alignItems: 'center', justifyContent: 'center' },
  stepValue: { color: colors.text, fontWeight: '700', minWidth: 58, textAlign: 'center' },
  city: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
