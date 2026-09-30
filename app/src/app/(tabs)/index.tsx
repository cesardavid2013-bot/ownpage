import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { SwipeCard, type SwipeAction, type SwipeCardHandle } from '@/components/SwipeCard';
import { Button, ErrorText, Input, Logo, Muted, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { refreshLocationIfAllowed, shareLocation } from '@/lib/location';
import { notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, gradients, space } from '@/lib/theme';
import type { Match, Me, Profile } from '@/lib/types';

export default function Discover() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [deck, setDeck] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upsell, setUpsell] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<Profile | null>(null);
  const [note, setNote] = useState('');
  const topRef = useRef<SwipeCardHandle>(null);
  const fetching = useRef(false);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const load = useCallback(async (replace = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const exclude = replace ? [] : deckRef.current.map((p) => p.id);
      const res = await api<{ profiles: Profile[] }>(`/discover${exclude.length ? `?exclude=${exclude.join(',')}` : ''}`);
      setDeck((d) => {
        const base = replace ? [] : d;
        const ids = new Set(base.map((p) => p.id));
        return [...base, ...res.profiles.filter((p) => !ids.has(p.id))];
      });
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLocationIfAllowed().finally(() => load(true));
  }, [load]);

  // Settings may have changed while away (distance, age, passport...).
  const settingsKey = JSON.stringify([user.settings, user.passport, user.hasLocation]);
  const lastKey = useRef(settingsKey);
  useFocusEffect(useCallback(() => {
    if (lastKey.current !== settingsKey) {
      lastKey.current = settingsKey;
      setLoading(true);
      load(true);
    }
  }, [settingsKey, load]));

  useEffect(() => {
    if (!loading && deck.length < 4) load();
  }, [deck.length, loading, load]);

  async function handleSwiped(profile: Profile, action: SwipeAction, withNote?: string) {
    setDeck((d) => d.filter((p) => p.id !== profile.id));
    try {
      const res = await api<{ matched: boolean; match: Match | null }>('/swipes', {
        body: { targetId: profile.id, action, ...(withNote ? { note: withNote } : {}) },
      });
      if (res.matched && res.match) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        useRealtime.getState().setCelebrate(res.match);
        useRealtime.getState().bump();
      }
      useAuth.getState().reload();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'out_of_likes' || code === 'out_of_superlikes' || code === 'premium_required') {
        setDeck((d) => [profile, ...d]);
        setUpsell(errorMessage(e));
      } else if (code !== 'already_swiped') {
        notify(errorMessage(e));
      }
    }
  }

  function press(action: SwipeAction) {
    const top = deck[0];
    if (!top) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (action === 'like' && user.limits.likesRemaining === 0) return setUpsell(t('errors.out_of_likes'));
    if (action === 'superlike') {
      if (user.limits.superLikesRemaining <= 0) return setUpsell(t('errors.out_of_superlikes'));
      if (user.entitlements.noteWithSuperLike) {
        setNote('');
        return setNoteFor(top);
      }
    }
    topRef.current?.swipe(action);
  }

  async function rewind() {
    if (!user.entitlements.rewind) return setUpsell(t('errors.premium_required'));
    try {
      const res = await api<{ profile: Profile | null }>('/swipes/rewind', { body: {} });
      if (res.profile) setDeck((d) => [res.profile!, ...d.filter((p) => p.id !== res.profile!.id)]);
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  async function boost() {
    if (user.boost.activeUntil) return notify(t('discover.boostActive'));
    if (user.boost.credits <= 0) return router.push('/premium');
    try {
      useAuth.getState().setUser(await api<Me>('/boost', { body: {} }));
      notify(t('discover.boostActive'));
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  async function enableLocation() {
    if (await shareLocation()) {
      await useAuth.getState().reload();
    }
  }

  const noLocation = !user.hasLocation && !user.settings.globalMode;

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <Logo size={30} />
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <Pressable onPress={boost} style={[styles.headerBtn, user.boost.activeUntil ? { backgroundColor: colors.violet } : null]}
            accessibilityRole="button" accessibilityLabel={t('discover.boost')}>
            <Ionicons name="flash" size={20} color={user.boost.activeUntil ? '#fff' : colors.violet} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('settings.title')}>
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {noLocation ? (
        <Pressable onPress={enableLocation} style={styles.banner}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.bannerText}>{t('discover.locationNeeded')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.deck}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : deck.length === 0 ? (
          <Empty photo={user.photos[0]?.url} error={error} onRetry={() => { setLoading(true); load(true); }} />
        ) : (
          deck.slice(0, 3).reverse().map((p, i, arr) => {
            const isTop = i === arr.length - 1;
            return (
              <SwipeCard
                key={p.id}
                ref={isTop ? topRef : undefined}
                profile={p}
                active={isTop}
                onSwiped={(action) => handleSwiped(p, action)}
                onInfo={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}
              />
            );
          })
        )}
      </View>

      <View style={styles.actions}>
        <ActionButton icon="refresh" color={colors.gold} size={48} onPress={rewind} label={t('discover.rewind')} />
        <ActionButton icon="close" color={colors.danger} size={64} onPress={() => press('pass')} label={t('discover.nope')} testID="btn-pass" />
        <ActionButton icon="star" color={colors.info} size={52} onPress={() => press('superlike')} label={t('discover.superLike')} testID="btn-superlike" />
        <ActionButton icon="heart" color={colors.success} size={64} onPress={() => press('like')} label={t('discover.like')} testID="btn-like" />
        <ActionButton icon="flash" color={colors.violet} size={48} onPress={boost} label={t('discover.boost')} />
      </View>

      <Sheet visible={!!upsell} onClose={() => setUpsell(null)}>
        <LinearGradient colors={gradients.gold} style={styles.upsellIcon}><Ionicons name="diamond" size={30} color="#2A1D05" /></LinearGradient>
        <Title style={{ fontSize: 24, textAlign: 'center' }}>{upsell}</Title>
        <Muted style={{ textAlign: 'center' }}>{t('discover.outOfLikesBody')}</Muted>
        <Button title={t('premium.upgrade')} variant="gold" onPress={() => { setUpsell(null); router.push('/premium'); }} />
        <Button title={t('common.close')} variant="ghost" onPress={() => setUpsell(null)} />
      </Sheet>

      <Sheet visible={!!noteFor} onClose={() => setNoteFor(null)}>
        <Title style={{ fontSize: 22 }}>{t('discover.noteTitle')}</Title>
        <Input value={note} onChangeText={setNote} placeholder={t('discover.notePlaceholder')} maxLength={140} multiline />
        <Button title={t('discover.superLike')} icon="star" onPress={() => {
          const target = noteFor!;
          setNoteFor(null);
          handleSwiped(target, 'superlike', note.trim() || undefined);
        }} />
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setNoteFor(null)} />
      </Sheet>
    </Screen>
  );
}

function ActionButton({ icon, color, size, onPress, label, testID }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; size: number; onPress: () => void; label: string; testID?: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID}
      style={({ pressed }) => [styles.action, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
      <Ionicons name={icon} size={size * 0.46} color={color} />
    </Pressable>
  );
}

function Empty({ photo, error, onRetry }: { photo?: string; error: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={styles.empty}>
      <View style={styles.radar}>
        <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />
        {photo ? <Image source={{ uri: photo }} style={styles.radarPhoto} /> : null}
      </View>
      <Title style={{ fontSize: 22, textAlign: 'center' }}>{t('discover.emptyTitle')}</Title>
      <Muted style={{ textAlign: 'center' }}>{t('discover.emptySubtitle')}</Muted>
      <ErrorText message={error} />
      <Button title={t('discover.adjust')} variant="secondary" icon="options-outline" onPress={() => router.push('/settings')} />
      <Button title={t('common.retry')} variant="ghost" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space(5), paddingVertical: space(2) },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space(2), marginHorizontal: space(4), padding: space(3),
    backgroundColor: 'rgba(255,79,123,0.12)', borderRadius: 14,
  },
  bannerText: { color: colors.text, flex: 1, fontWeight: '600' },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: space(2), marginHorizontal: space(3) },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space(3.5), paddingBottom: space(3), paddingTop: space(1) },
  action: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  empty: { alignItems: 'stretch', gap: space(3), paddingHorizontal: space(6), maxWidth: 420 },
  radar: { width: 120, height: 120, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: space(6) },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary },
  radarPhoto: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#fff' },
  upsellIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
