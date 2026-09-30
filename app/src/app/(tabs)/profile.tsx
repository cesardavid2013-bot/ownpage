import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Muted, PlanBadge, Row } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, gradients, radius, space } from '@/lib/theme';
import type { Me } from '@/lib/types';

export function completeness(u: Me) {
  const checks = [u.photos.length >= 1, u.photos.length >= 3, !!u.bio, !!u.jobTitle, !!u.school, u.interests.length >= 3,
    u.languages.length > 0, !!u.city, !!u.heightCm, u.lookingFor !== 'unsure'];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfileTab() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const pct = completeness(user);

  return (
    <Screen edges={['top']} scroll>
      <View style={styles.top}>
        <View>
          <LinearGradient colors={gradients.brand} style={styles.ring}>
            <Image source={{ uri: user.photos[0]?.url }} style={styles.avatar} />
          </LinearGradient>
          <View style={styles.pct}><Text style={styles.pctText}>{pct}%</Text></View>
        </View>
        <Row style={{ gap: space(2) }}>
          <Text style={styles.name}>{user.name}, {user.age}</Text>
          {user.isVerified ? <Ionicons name="checkmark-circle" size={22} color={colors.info} /> : null}
        </Row>
        <PlanBadge plan={user.plan} />
        {pct < 100 ? <Muted>{t('profile.completeness', { percent: pct })}</Muted> : null}
      </View>

      <Row style={styles.actions}>
        <RoundAction icon="settings-sharp" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        <RoundAction icon="pencil" label={t('profile.edit')} onPress={() => router.push('/edit-profile')} primary />
        <RoundAction icon="eye" label={t('profile.preview')} onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })} />
      </Row>

      <Pressable onPress={() => router.push('/premium')}>
        <LinearGradient colors={user.plan === 'free' ? gradients.gold : ['#2A2440', '#1C1929']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premium}>
          <Row style={{ gap: space(3) }}>
            <Ionicons name="diamond" size={28} color={user.plan === 'free' ? '#2A1D05' : colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumTitle, user.plan !== 'free' && { color: colors.text }]}>{t('premium.title')}</Text>
              <Text style={[styles.premiumSub, user.plan !== 'free' && { color: colors.textMuted }]}>{t('premium.subtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={user.plan === 'free' ? '#2A1D05' : colors.text} />
          </Row>
        </LinearGradient>
      </Pressable>

      <Row style={{ gap: space(3), marginTop: space(4) }}>
        <Stat icon="star" color={colors.info} value={user.limits.superLikesRemaining} label={t('discover.superLike')} />
        <Stat icon="flash" color={colors.violet} value={user.boost.credits} label={t('premium.boosts')} />
        <Stat icon="heart" color={colors.success} value={user.limits.likesRemaining ?? '∞'} label={t('discover.like')} />
      </Row>
    </Screen>
  );
}

function RoundAction({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: space(2), flex: 1 }} accessibilityRole="button">
      {primary ? (
        <LinearGradient colors={gradients.brand} style={[styles.round, { width: 68, height: 68, borderRadius: 34 }]}>
          <Ionicons name={icon} size={28} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={styles.round}><Ionicons name={icon} size={24} color={colors.textMuted} /></View>
      )}
      <Text style={styles.roundLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Stat({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: space(2.5), paddingTop: space(6) },
  ring: { width: 148, height: 148, borderRadius: 74, padding: 4, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: colors.bg, backgroundColor: colors.card },
  pct: {
    position: 'absolute', bottom: -4, alignSelf: 'center', backgroundColor: colors.primary, paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 999, borderWidth: 3, borderColor: colors.bg,
  },
  pctText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  name: { color: colors.text, fontSize: 28, fontWeight: '800' },
  actions: { justifyContent: 'space-around', marginVertical: space(7) },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  roundLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  premium: { borderRadius: radius.lg, padding: space(5) },
  premiumTitle: { color: '#2A1D05', fontWeight: '900', fontSize: 20 },
  premiumSub: { color: '#4A3510', fontSize: 14, marginTop: 2 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: space(4), alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12 },
});
