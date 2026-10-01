import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, font, gradients, space } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { Button } from './ui';
import { Skeleton } from './Skeleton';
import { Veiled } from './Veiled';

/** Gold+: today's most compatible people, framed as arches. Free members see what they're missing. */
export function TopPicks() {
  const { t } = useTranslation();
  const entitled = useAuth((s) => s.user?.entitlements.topPicks ?? false);
  const [picks, setPicks] = useState<Profile[] | null>(null);

  useEffect(() => {
    if (!entitled) return;
    api<{ profiles: Profile[] }>('/top-picks').then((r) => setPicks(r.profiles)).catch(() => setPicks([]));
  }, [entitled]);

  if (!entitled) {
    return (
      <View style={styles.locked}>
        <View style={styles.ghosts}>
          {[0, 1, 2].map((i) => <Veiled key={i} seed={i + 11} style={[styles.ghost, { transform: [{ translateY: i === 1 ? -10 : 0 }] }]} />)}
        </View>
        <Text style={styles.title}>{t('likes.topPicks')}</Text>
        <Text style={styles.sub}>{t('likes.topPicksLocked')}</Text>
        <Button title={t('premium.upgrade')} variant="secondary" onPress={() => router.push('/premium')} />
      </View>
    );
  }

  if (picks && picks.length === 0) return null;

  return (
    <View style={{ gap: space(3), marginBottom: space(6) }}>
      <View>
        <Text style={styles.title}>{t('likes.topPicks')}</Text>
        <Text style={styles.sub}>{t('likes.topPicksSubtitle')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(3), paddingRight: space(5) }}>
        {!picks
          ? [0, 1, 2].map((i) => <Skeleton key={i} width={130} height={176} radius={65} />)
          : picks.map((p) => (
            <Pressable key={p.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id, fromLikes: '1' } })} style={styles.pick}>
              {p.photos[0] ? <Image source={{ uri: p.photos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <LinearGradient colors={gradients.cardShade} style={StyleSheet.absoluteFill} />
              <Text style={styles.name} numberOfLines={1}>{p.name}{p.age != null ? `, ${p.age}` : ''}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: font.display, fontSize: 28 },
  sub: { color: colors.textMuted, fontFamily: font.body, fontSize: 14, marginTop: 2 },
  pick: { width: 130, height: 176, borderTopLeftRadius: 65, borderTopRightRadius: 65, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, overflow: 'hidden', backgroundColor: colors.card, justifyContent: 'flex-end' },
  name: { color: '#fff', fontFamily: font.display, fontSize: 18, padding: space(3) },
  locked: { gap: space(3), paddingVertical: space(5), marginBottom: space(6), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ghosts: { flexDirection: 'row', gap: space(2), marginBottom: space(2) },
  ghost: { width: 70, height: 96, borderTopLeftRadius: 35, borderTopRightRadius: 35, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, opacity: 0.8 },
});
