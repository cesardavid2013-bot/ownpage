import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { TopPicks } from '@/components/TopPicks';
import { GridSkeleton } from '@/components/Skeleton';
import { Veiled } from '@/components/Veiled';
import { Button, Chip, Muted, Row, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { colors, gradients, radius, space, font } from '@/lib/theme';
import type { Profile } from '@/lib/types';

type Tab = 'received' | 'sent';

export default function Likes() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [tab, setTab] = useState<Tab>('received');
  const [data, setData] = useState<{ locked: boolean; count: number; profiles: Profile[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (which: Tab) => {
    try {
      if (which === 'sent') {
        const res = await api<{ profiles: Profile[] }>('/likes/sent');
        setData({ locked: false, count: res.profiles.length, profiles: res.profiles });
      } else {
        setData(await api('/likes/received'));
      }
    } catch {
      setData({ locked: false, count: 0, profiles: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => {
    useRealtime.getState().clearLikes();
    load(tab);
  }, [load, tab]));

  const refresh = async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  };

  return (
    <Screen edges={['top']}>
      <View style={{ paddingVertical: space(3), gap: space(1) }}>
        <Title>{t('likes.title')}</Title>
        <Muted>{t('likes.subtitle')}</Muted>
      </View>
      {user.entitlements.seeLikesSent ? (
        <Row style={{ gap: space(2), marginBottom: space(3) }}>
          <Chip label={t('likes.title')} selected={tab === 'received'} onPress={() => { setTab('received'); setData(null); }} />
          <Chip label={t('likes.sent')} selected={tab === 'sent'} onPress={() => { setTab('sent'); setData(null); }} />
        </Row>
      ) : null}

      {!data ? <GridSkeleton /> : data.locked ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space(8) }}>
          <Locked count={data.count} />
          <View style={styles.rule} />
          <TopPicks />
        </ScrollView>
      ) : (
        <FlatList
          ListHeaderComponent={tab === 'received' ? <TopPicks /> : null}
          data={data.profiles}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space(3) }}
          contentContainerStyle={{ gap: space(3), paddingBottom: space(8) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(10) }}>{t('likes.empty')}</Muted>}
          renderItem={({ item }) => (
            <Pressable style={styles.tile} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id, fromLikes: '1' } })}>
              <Image source={{ uri: item.photos[0]?.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={gradients.cardShade} style={StyleSheet.absoluteFill} />
              {item.superLikedYou ? <View style={styles.super}><Ionicons name="star" size={11} color={colors.onPrimary} /></View> : null}
              <View style={styles.tileInfo}>
                <Text style={styles.tileName} numberOfLines={1}>{item.name}{item.age != null ? `, ${item.age}` : ''}</Text>
                {item.note ? <Text style={styles.tileNote} numberOfLines={2}>“{item.note}”</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function Locked({ count }: { count: number }) {
  const { t } = useTranslation();
  const tiles = count > 0 ? Math.min(count, 6) : 3;
  return (
    <View style={{ gap: space(6), paddingTop: space(2) }}>
      <View style={styles.veilGrid}>
        {Array.from({ length: tiles }).map((_, i) => (
          <Veiled key={i} seed={i + 3} style={[styles.veil, i % 3 === 1 && { marginTop: space(5) }]} />
        ))}
      </View>
      <View style={{ gap: space(2), alignItems: 'center' }}>
        <Text style={styles.lockedTitle}>{count > 0 ? t('likes.lockedTitle', { count }) : t('likes.empty')}</Text>
        {count > 0 ? <Muted style={{ textAlign: 'center', maxWidth: 300 }}>{t('likes.lockedSubtitle')}</Muted> : null}
      </View>
      {count > 0 ? <Button title={t('likes.seeWho')} variant="gold" onPress={() => router.push('/premium')} testID="likes-upgrade" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, aspectRatio: 0.75, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card, maxWidth: '50%' },
  tileInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: space(3) },
  tileName: { color: colors.text, fontSize: 20, fontFamily: font.display },
  tileNote: { color: colors.primary, fontSize: 12, marginTop: 2, fontFamily: font.body },
  super: {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  veilGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '3.5%', rowGap: space(3) },
  veil: { width: '31%' },
  lockedTitle: { color: colors.text, fontFamily: font.display, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space(8) },
});
