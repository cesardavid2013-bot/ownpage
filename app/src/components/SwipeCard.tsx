import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius, shadow, space } from '@/lib/theme';
import type { Profile } from '@/lib/types';

export type SwipeAction = 'like' | 'pass' | 'superlike';
export interface SwipeCardHandle {
  swipe: (action: SwipeAction) => void;
}

interface Props {
  profile: Profile;
  active: boolean;
  onSwiped: (action: SwipeAction) => void;
  onInfo: () => void;
}

export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ profile, active, onSwiped, onInfo }, ref) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - space(6), 480);
  const pos = useRef(new Animated.ValueXY()).current;
  const [photo, setPhoto] = useState(0);
  const photos = profile.photos.length ? profile.photos : [{ id: 'none', url: '' }];
  const done = useRef(false);

  const fly = (action: SwipeAction) => {
    if (done.current) return;
    done.current = true;
    const x = action === 'like' ? width * 1.5 : action === 'pass' ? -width * 1.5 : 0;
    const y = action === 'superlike' ? -1200 : 60;
    Animated.timing(pos, { toValue: { x, y }, duration: 260, useNativeDriver: false }).start(() => onSwiped(action));
  };

  useImperativeHandle(ref, () => ({ swipe: fly }));

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => active,
    onMoveShouldSetPanResponder: (_e, g) => active && (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6),
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (e, g) => {
      const threshold = cardWidth * 0.28;
      if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
        // Tap: left third goes back, the rest goes forward through photos.
        const x = e.nativeEvent.locationX;
        setPhoto((p) => (x < cardWidth / 3 ? Math.max(0, p - 1) : Math.min(photos.length - 1, p + 1)));
        return;
      }
      if (g.dx > threshold || g.vx > 1.2) fly('like');
      else if (g.dx < -threshold || g.vx < -1.2) fly('pass');
      else if (g.dy < -threshold * 1.2 || g.vy < -1.4) fly('superlike');
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
  }), [active, cardWidth, photos.length]);

  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOpacity = pos.x.interpolate({ inputRange: [20, 120], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pos.x.interpolate({ inputRange: [-120, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const superOpacity = pos.y.interpolate({ inputRange: [-160, -40], outputRange: [1, 0], extrapolate: 'clamp' });

  const details = [profile.jobTitle, profile.school].filter(Boolean)[0];
  // Photo by photo, the card cycles through the person's prompts too.
  const prompt = profile.prompts?.length ? profile.prompts[photo % profile.prompts.length] : null;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.card, shadow, { width: cardWidth, transform: [...pos.getTranslateTransform(), { rotate }] },
        Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab', touchAction: 'none' } as object) : null]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {photos[photo]?.url ? (
          <Image source={{ uri: photos[photo].url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cardHigh }]} />}
        <LinearGradient colors={gradients.cardShade} locations={[0.45, 0.65, 1]} style={StyleSheet.absoluteFill} />
      </View>

      {photos.length > 1 && (
        <View style={styles.bars} pointerEvents="none">
          {photos.map((p, i) => <View key={p.id} style={[styles.bar, i === photo && styles.barActive]} />)}
        </View>
      )}

      {profile.superLikedYou && (
        <View style={styles.superTag} pointerEvents="none">
          <Ionicons name="star" size={13} color={colors.onPrimary} />
          <Text style={styles.superTagText}>{t('discover.superLikedYou')}</Text>
        </View>
      )}

      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]} pointerEvents="none">
        <Text style={[styles.stampText, { color: colors.primary }]}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]} pointerEvents="none">
        <Text style={[styles.stampText, { color: colors.textMuted }]}>NOPE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.superStamp, { opacity: superOpacity }]} pointerEvents="none">
        <Text style={[styles.stampText, { color: colors.gold }]}>SUPER</Text>
      </Animated.View>

      <View style={styles.info}>
        <View style={{ flex: 1, gap: 4 }} pointerEvents="none">
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
            {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
            {profile.isVerified ? <Ionicons name="checkmark-circle" size={22} color={colors.info} /> : null}
          </View>
          {profile.recentlyActive ? (
            <View style={styles.meta}><View style={styles.online} /><Text style={styles.metaText}>{t('discover.recentlyActive')}</Text></View>
          ) : null}
          {details ? (
            <View style={styles.meta}><Ionicons name="briefcase-outline" size={15} color="#fff" /><Text style={styles.metaText} numberOfLines={1}>{details}</Text></View>
          ) : null}
          {profile.distanceKm != null ? (
            <View style={styles.meta}><Ionicons name="location-outline" size={15} color="#fff" /><Text style={styles.metaText}>{t('common.km', { count: profile.distanceKm })}</Text></View>
          ) : null}
          {profile.note ? <Text style={styles.note} numberOfLines={2}>“{profile.note}”</Text> : prompt ? (
            <View style={styles.prompt}>
              <Text style={styles.promptQ}>{t(`prompts.${prompt.id}`)}</Text>
              <Text style={styles.promptA} numberOfLines={3}>{prompt.answer}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={onInfo} style={styles.infoBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Info">
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute', aspectRatio: 0.68, maxHeight: '100%', borderRadius: radius.xl,
    overflow: 'hidden', backgroundColor: colors.card, alignSelf: 'center',
  },
  bars: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  barActive: { backgroundColor: '#fff' },
  superTag: {
    position: 'absolute', top: 26, alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  superTagText: { color: colors.onPrimary, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontFamily: font.bold },
  stamp: { position: 'absolute', top: 60, borderWidth: 2, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 2 },
  likeStamp: { left: 28, borderColor: colors.primary, transform: [{ rotate: '-14deg' }] },
  nopeStamp: { right: 28, borderColor: colors.textMuted, transform: [{ rotate: '14deg' }] },
  superStamp: { alignSelf: 'center', top: undefined, bottom: 170, borderColor: colors.gold, transform: [{ rotate: '-8deg' }] },
  stampText: { fontSize: 34, fontFamily: font.display, letterSpacing: 6 },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space(5), flexDirection: 'row', alignItems: 'flex-end' },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { color: '#fff', fontSize: 36, fontFamily: font.display, flexShrink: 1 },
  age: { color: '#fff', fontSize: 26, fontFamily: font.body },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontFamily: font.body },
  online: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  prompt: { marginTop: space(3), paddingTop: space(3), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(233,217,190,0.35)', gap: 4 },
  promptQ: { color: colors.gold, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: font.bold },
  promptA: { color: '#fff', fontFamily: font.display, fontSize: 21, lineHeight: 26 },
  note: { color: colors.primary, fontFamily: font.displayItalic, marginTop: 6, fontSize: 17 },
  infoBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginLeft: space(3),
  },
});
