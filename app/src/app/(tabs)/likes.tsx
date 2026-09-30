import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Button, Chip, Muted, Row, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { colors, gradients, radius, space } from '@/lib/theme';
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

      {!data ? <ActivityIndicator color={colors.primary} style={{ marginTop: space(10) }} /> : data.locked ? (
        <Locked count={data.count} />
      ) : (
        <FlatList
          data={data.profiles}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space(3) }}
          contentContainerStyle={{ gap: space(3), paddingBottom: space(8) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: space(10) }}>{t('likes.empty')}</Muted>}
          renderItem={({ item }) => (
            <Pressable style={styles.tile} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id, fromLikes: '1' } })}>
              <Image source={{ uri: item.photos[0]?.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={gradients.cardShade} style={StyleSheet.absoluteFill} />
              {item.superLikedYou ? <View style={styles.super}><Ionicons name="star" size={12} color="#fff" /></View> : null}
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
  return (
    <View style={{ gap: space(5) }}>
      <View style={styles.blurGrid}>
        {Array.from({ length: Math.max(4, Math.min(count, 6)) }).map((_, i) => (
          <LinearGradient key={i} colors={i % 2 ? ['#3B2B4F', '#1C1929'] : ['#4A2438', '#1C1929']} style={styles.blurTile}>
            <Ionicons name="heart" size={28} color="rgba(255,255,255,0.25)" />
          </LinearGradient>
        ))}
      </View>
      <View style={{ gap: space(2) }}>
        <Title style={{ fontSize: 24, textAlign: 'center' }}>{t('likes.lockedTitle', { count })}</Title>
        <Muted style={{ textAlign: 'center' }}>{t('likes.lockedSubtitle')}</Muted>
      </View>
      <Button title={t('likes.seeWho')} variant="gold" icon="diamond" onPress={() => router.push('/premium')} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, aspectRatio: 0.75, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card, maxWidth: '50%' },
  tileInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: space(3) },
  tileName: { color: '#fff', fontWeight: '800', fontSize: 17 },
  tileNote: { color: '#fff', fontStyle: 'italic', fontSize: 12, marginTop: 2 },
  super: {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.info,
    alignItems: 'center', justifyContent: 'center',
  },
  blurGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3), justifyContent: 'center' },
  blurTile: { width: '30%', aspectRatio: 0.75, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
