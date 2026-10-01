import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Glyph } from '@/components/Glyphs';
import { Screen } from '@/components/Screen';
import { CardSkeleton } from '@/components/Skeleton';
import { Sheet } from '@/components/Sheet';
import { SwipeCard, type SwipeAction, type SwipeCardHandle } from '@/components/SwipeCard';
import { Button, ErrorText, Input, Logo, Muted, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { refreshLocationIfAllowed, shareLocation } from '@/lib/location';
import { notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, gradients, space, font } from '@/lib/theme';
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
  // After a pass, offer to undo it for a few seconds instead of a permanent rewind button.
  const [undoable, setUndoable] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoable(action === 'pass');
    if (action === 'pass') undoTimer.current = setTimeout(() => setUndoable(false), 6000);
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
    setUndoable(false);
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
          <Pressable onPress={boost} style={[styles.headerBtn, user.boost.activeUntil ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button" accessibilityLabel={t('discover.boost')}>
            <Ionicons name={user.boost.activeUntil ? 'flash' : 'flash-outline'} size={19} color={user.boost.activeUntil ? colors.onPrimary : colors.primary} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t('settings.title')}>
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {!user.settings.discoverable ? (
        <Pressable onPress={() => api<Me>('/me/settings', { method: 'PATCH', body: { discoverable: true } }).then((me) => useAuth.getState().setUser(me)).catch((e) => notify(errorMessage(e)))}
          style={styles.banner} testID="paused-banner">
          <Ionicons name="pause-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.bannerText}>{t('privacy.paused')}</Text>
          <Text style={[styles.bannerText, { flex: 0, color: colors.primary }]}>{t('privacy.resume')}</Text>
        </Pressable>
      ) : null}

      {noLocation ? (
        <Pressable onPress={enableLocation} style={styles.banner}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.bannerText}>{t('discover.locationNeeded')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.deck}>
        {loading ? <CardSkeleton /> : deck.length === 0 ? (
          <Empty photo={user.photos[0]?.thumb} error={error} onRetry={() => { setLoading(true); load(true); }} />
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

      <View style={styles.undoRow} pointerEvents="box-none">
        {undoable ? (
          <Pressable onPress={rewind} style={styles.undo} accessibilityRole="button" accessibilityLabel={t('discover.rewind')} testID="btn-undo">
            <Ionicons name="arrow-undo-outline" size={14} color={colors.primary} />
            <Text style={styles.undoText}>{t('discover.rewind')}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.actions}>
        <RoundAction onPress={() => press('pass')} label={t('discover.nope')} testID="btn-pass">
          <Ionicons name="close" size={26} color={colors.text} />
        </RoundAction>
        <Pressable onPress={() => press('like')} accessibilityRole="button" accessibilityLabel={t('discover.like')} testID="btn-like"
          style={({ pressed }) => [styles.like, pressed && { transform: [{ scale: 0.97 }] }]}>
          <Ionicons name="heart" size={20} color={colors.onPrimary} />
          <Text style={styles.likeText}>{t('discover.like')}</Text>
        </Pressable>
        <RoundAction onPress={() => press('superlike')} label={t('discover.superLike')} testID="btn-superlike">
          <Glyph name="spark" size={24} color={colors.gold} filled />
        </RoundAction>
      </View>

      <Sheet visible={!!upsell} onClose={() => setUpsell(null)}>
        <View style={styles.upsellIcon}><Glyph name="spark" size={30} color={colors.gold} filled /></View>
        <Title style={{ fontSize: 26, textAlign: 'center' }}>{upsell}</Title>
        <Muted style={{ textAlign: 'center' }}>{t('discover.outOfLikesBody')}</Muted>
        <Button title={t('premium.upgrade')} variant="gold" onPress={() => { setUpsell(null); router.push('/premium'); }} />
        <Button title={t('common.close')} variant="ghost" onPress={() => setUpsell(null)} />
      </Sheet>

      <Sheet visible={!!noteFor} onClose={() => setNoteFor(null)}>
        <Title style={{ fontSize: 24 }}>{t('discover.noteTitle')}</Title>
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

function RoundAction({ children, onPress, label, testID }: { children: ReactNode; onPress: () => void; label: string; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} testID={testID} hitSlop={6}
      style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.93 }] }]}>
      {children}
    </Pressable>
  );
}

function Empty({ photo, error, onRetry }: { photo?: string; error: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  // A slow breath on the light, nothing more: the screen is resting, not searching.
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glow]);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArch}>
        {photo ? <Image source={{ uri: photo }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} contentFit="cover" /> : null}
        <Animated.View style={{ opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }}>
          <Glyph name="spark" size={26} color={colors.gold} filled />
        </Animated.View>
      </View>
      <Title style={{ fontSize: 26, textAlign: 'center' }}>{t('discover.emptyTitle')}</Title>
      <Muted style={{ textAlign: 'center' }}>{t('discover.emptySubtitle')}</Muted>
      <ErrorText message={error} />
      <Button title={t('discover.adjust')} variant="secondary" onPress={() => router.push('/settings')} />
      <Button title={t('common.retry')} variant="ghost" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space(5), paddingVertical: space(2) },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: space(2), marginHorizontal: space(4), padding: space(3),
    backgroundColor: 'rgba(233,217,190,0.07)', borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(233,217,190,0.22)',
  },
  bannerText: { color: colors.text, flex: 1, fontFamily: font.semibold },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: space(2), marginHorizontal: space(3) },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space(4), paddingBottom: space(3), paddingTop: space(1) },
  action: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(233,217,190,0.35)',
  },
  like: {
    height: 56, minWidth: 148, paddingHorizontal: space(7), borderRadius: 28, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2),
  },
  likeText: { color: colors.onPrimary, fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.4 },
  undoRow: { height: 30, alignItems: 'center', justifyContent: 'center' },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space(3), paddingVertical: 4 },
  undoText: { color: colors.primary, fontFamily: font.medium, fontSize: 13 },
  empty: { alignItems: 'stretch', gap: space(3), paddingHorizontal: space(6), maxWidth: 420 },
  emptyArch: {
    width: 112, height: 148, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: space(4),
    borderTopLeftRadius: 56, borderTopRightRadius: 56, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.5)', backgroundColor: colors.card,
  },
  upsellIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.5)' },
});
