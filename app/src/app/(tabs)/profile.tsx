import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MembershipCard } from '@/components/MembershipCard';
import { Button, webMaxWidth } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, font, gradients, space } from '@/lib/theme';
import type { Me } from '@/lib/types';

export function completeness(u: Me) {
  const checks = [u.photos.length >= 1, u.photos.length >= 3, !!u.bio, !!u.jobTitle, !!u.school, u.interests.length >= 3,
    u.languages.length > 0, !!u.city, (u.prompts?.length ?? 0) >= 1, u.lookingFor !== 'unsure'];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfileTab() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const pct = completeness(user);
  const member = user.plan !== 'free';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[{ paddingBottom: space(12) }, webMaxWidth]} showsVerticalScrollIndicator={false}>
        <View style={styles.portrait}>
          {user.photos[0] ? <Image source={{ uri: user.photos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          <LinearGradient colors={['rgba(10,10,12,0.35)', 'transparent', 'rgba(10,10,12,0.4)', colors.bg]} locations={[0, 0.25, 0.65, 1]} style={StyleSheet.absoluteFill} />
          <Pressable style={styles.settings} onPress={() => router.push('/settings')} accessibilityLabel={t('profile.settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{user.name}<Text style={styles.age}>  {user.age}</Text></Text>
            {user.isVerified ? <Text style={styles.verified}>✦ {t('profile.verified')}</Text> : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: space(5), gap: space(8) }}>
          {pct < 100 ? (
            <Pressable onPress={() => router.push('/edit-profile')} style={{ gap: space(2) }}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
              <Text style={styles.progressText}>{t('profile.completeness', { percent: pct })}</Text>
            </Pressable>
          ) : null}

          <View style={styles.list}>
            <Row icon="create-outline" label={t('profile.edit')} onPress={() => router.push('/edit-profile')} />
            <Row icon="eye-outline" label={t('profile.preview')} onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })} />
            <Row icon="options-outline" label={t('profile.settings')} onPress={() => router.push('/settings')} last />
          </View>

          <View style={{ gap: space(4) }}>
            <Text style={styles.section}>{t('premium.title')}</Text>
            {member ? (
              <Pressable onPress={() => router.push('/premium')} style={{ gap: space(3) }}>
                <MembershipCard tier={user.plan as Exclude<typeof user.plan, 'free'>} holder={user.name} />
                {user.planExpiresAt ? (
                  <Text style={styles.muted}>{t('premium.activeUntil', { date: new Date(user.planExpiresAt).toLocaleDateString(i18n.language) })}</Text>
                ) : null}
              </Pressable>
            ) : (
              <View style={styles.invite}>
                <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.peek} />
                <Text style={styles.inviteTitle}>{t('premium.subtitle')}</Text>
                <Button title={t('premium.upgrade')} onPress={() => router.push('/premium')} />
              </View>
            )}
          </View>

          <View style={styles.stats}>
            <Stat value={user.limits.superLikesRemaining} label={t('discover.superLike')} />
            <Stat value={user.boost.credits} label={t('premium.boosts')} />
            <Stat value={user.limits.likesRemaining ?? '∞'} label={t('discover.like')} last />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={colors.gold} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

function Stat({ value, label, last }: { value: ReactNode; label: string; last?: boolean }) {
  return (
    <View style={[styles.stat, !last && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  portrait: { width: '100%', aspectRatio: 4 / 4.4, maxHeight: 560, backgroundColor: colors.card, justifyContent: 'flex-end', marginBottom: space(5) },
  settings: {
    position: 'absolute', top: space(3), right: space(4), width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(10,10,12,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  nameBlock: { paddingHorizontal: space(5), gap: space(1) },
  name: { color: colors.text, fontFamily: font.display, fontSize: 48, lineHeight: 54 },
  age: { fontFamily: undefined, fontSize: 26, color: colors.textMuted },
  verified: { color: colors.gold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: font.semibold },
  progressTrack: { height: 2, backgroundColor: colors.border, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: 2, backgroundColor: colors.primary },
  progressText: { color: colors.textMuted, fontSize: 13, fontFamily: font.body },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingVertical: space(4.5) },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.text, fontSize: 16, flex: 1, fontFamily: font.body },
  section: { color: colors.gold, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', fontFamily: font.semibold },
  muted: { color: colors.textMuted, fontSize: 13, fontFamily: font.body },
  invite: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(233,217,190,0.2)', padding: space(5), gap: space(4), overflow: 'hidden' },
  peek: { position: 'absolute', right: -40, top: -30, width: 150, height: 95, borderRadius: 12, opacity: 0.35, transform: [{ rotate: '-12deg' }] },
  inviteTitle: { color: colors.text, fontFamily: font.display, fontSize: 24, lineHeight: 30, maxWidth: '80%' },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space(5), gap: 2 },
  statValue: { color: colors.text, fontFamily: font.display, fontSize: 30 },
  statLabel: { color: colors.textMuted, fontSize: 12, fontFamily: font.body },
});
