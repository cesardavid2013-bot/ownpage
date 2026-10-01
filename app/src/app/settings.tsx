import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header, Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { Button, Chip, Muted, PlanBadge, Title } from '@/components/ui';
import { LANGUAGES, currentLanguage, errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT_EMAIL } from '@/lib/config';
import { confirm, notify } from '@/lib/notify';
import { manageSubscription, restorePurchases } from '@/lib/purchases';
import { colors, font, radius, space } from '@/lib/theme';
import type { LookingFor, Me } from '@/lib/types';

const INTENTIONS: LookingFor[] = ['long_term', 'short_term', 'friendship', 'casual'];

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
    ? CITIES.find((c) => Math.abs(c.lat - user.passport!.lat) < 0.05 && Math.abs(c.lng - user.passport!.lng) < 0.05)?.name ?? `${user.passport.lat.toFixed(2)}, ${user.passport.lng.toFixed(2)}`
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

      <Section title={t('settings.filters')}>
        <Toggle label={t('settings.filterVerified')} value={s.filterVerified} premium={!ent.advancedFilters}
          onChange={(v) => gated(ent.advancedFilters, () => update({ filterVerified: v }))} />
        <Toggle label={t('settings.filterHasPrompts')} value={s.filterHasPrompts} premium={!ent.advancedFilters}
          onChange={(v) => gated(ent.advancedFilters, () => update({ filterHasPrompts: v }))} />
        <View style={[styles.item, { flexDirection: 'column', alignItems: 'stretch', gap: space(3) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <Text style={[styles.itemLabel, { flex: 1 }]}>{t('settings.filterIntentions')}</Text>
            {!ent.advancedFilters ? <PremiumTag /> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {INTENTIONS.map((l) => (
              <Chip key={l} label={t(`lookingFor.${l}`)} selected={s.filterLookingFor.includes(l)} onPress={() => gated(ent.advancedFilters, () =>
                update({ filterLookingFor: s.filterLookingFor.includes(l) ? s.filterLookingFor.filter((x) => x !== l) : [...s.filterLookingFor, l] }))} />
            ))}
          </View>
        </View>
      </Section>

      <Section title={t('privacy.title')}>
        <Toggle label={t('privacy.pause')} hint={t('privacy.pauseHint')} value={!s.discoverable} onChange={(v) => update({ discoverable: !v })} />
        <Toggle label={t('privacy.showActivity')} hint={t('privacy.showActivityHint')} value={s.showActivity} onChange={(v) => update({ showActivity: v })} />
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
        <Muted style={{ textAlign: 'center', fontSize: 12, fontFamily: font.body }}>
          Lumi · {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Muted>
      </View>

      <Sheet visible={passportOpen} onClose={() => setPassportOpen(false)}>
        <Title style={{ fontSize: 22, fontFamily: font.body }}>{t('settings.passport')}</Title>
        <Muted>{t('settings.passportHint')}</Muted>
        <Item label={t('settings.passportCurrent')} icon="navigate" onPress={() => setPassport(null)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {CITIES.map((c) => (
            <Pressable key={c.name} onPress={() => setPassport({ lat: c.lat, lng: c.lng })} style={styles.city}>
              <Text style={{ color: colors.text, fontFamily: font.semibold }}>{c.name}</Text>
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
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={value ? colors.onPrimary : '#d8d4cc'} />
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
  sectionTitle: { color: colors.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.2, marginLeft: space(1), marginBottom: space(1), fontFamily: font.semibold },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(1), paddingVertical: space(4),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, minHeight: 56,
  },
  itemLabel: { color: colors.text, fontSize: 16, fontFamily: font.body },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: font.body },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { color: '#2A1D05', fontSize: 9, fontFamily: font.bold },
  step: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(233,217,190,0.25)', alignItems: 'center', justifyContent: 'center' },
  stepValue: { color: colors.text, fontFamily: font.display, fontSize: 18, minWidth: 64, textAlign: 'center' },
  city: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
});
