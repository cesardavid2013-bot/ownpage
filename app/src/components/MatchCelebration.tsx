import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { colors, font, gradients, space } from '@/lib/theme';
import { Bokeh } from './Bokeh';
import { Button } from './ui';

export function MatchCelebration() {
  const { t } = useTranslation();
  const match = useRealtime((s) => s.celebrate);
  const me = useAuth((s) => s.user);
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (match) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }).start();
    }
  }, [match, scale]);

  if (!match || !me) return null;
  const close = () => useRealtime.getState().setCelebrate(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
        <Bokeh count={26} seed={31} intensity={1.1} />
        <LinearGradient colors={['rgba(10,10,12,0.2)', 'rgba(10,10,12,0.55)', 'rgba(10,10,12,0.95)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
          <Text style={{ color: colors.gold, fontSize: 22 }}>✦</Text>
          <Text style={styles.title}>{t('match.title')}</Text>
          <Text style={styles.subtitle}>{t('match.subtitle', { name: match.user.name })}</Text>
          <View style={styles.photos}>
            <Image source={{ uri: me.photos[0]?.url }} style={[styles.photo, { transform: [{ rotate: '-8deg' }] }]} />
            <Image source={{ uri: match.user.photos[0]?.url }} style={[styles.photo, { marginLeft: -24, transform: [{ rotate: '8deg' }] }]} />
            <LinearGradient colors={gradients.brand} style={styles.heart}><Ionicons name="heart" size={24} color={colors.onPrimary} /></LinearGradient>
          </View>
          <View style={{ alignSelf: 'stretch', gap: space(3) }}>
            <Button title={t('match.sendMessage')} icon="chatbubble-ellipses" onPress={() => {
              close();
              router.push({ pathname: '/chat/[id]', params: { id: match.id } });
            }} />
            <Button title={t('match.keepSwiping')} variant="secondary" onPress={close} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(6) },
  content: { alignItems: 'center', gap: space(4), width: '100%', maxWidth: 420 },
  title: { color: colors.primary, fontSize: 52, fontFamily: font.displayItalic, textAlign: 'center', lineHeight: 60 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center' },
  photos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: space(6) },
  photo: { width: 140, height: 190, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.card },
  heart: {
    position: 'absolute', bottom: -22, alignSelf: 'center', left: '50%', marginLeft: -26,
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg,
  },
});
