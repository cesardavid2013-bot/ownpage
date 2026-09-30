import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { colors, gradients, space } from '@/lib/theme';
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
        <LinearGradient colors={['rgba(255,79,123,0.55)', 'rgba(139,92,246,0.45)', 'rgba(11,10,18,0.97)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
          <Ionicons name="sparkles" size={34} color={colors.gold} />
          <Text style={styles.title}>{t('match.title')}</Text>
          <Text style={styles.subtitle}>{t('match.subtitle', { name: match.user.name })}</Text>
          <View style={styles.photos}>
            <Image source={{ uri: me.photos[0]?.url }} style={[styles.photo, { transform: [{ rotate: '-8deg' }] }]} />
            <Image source={{ uri: match.user.photos[0]?.url }} style={[styles.photo, { marginLeft: -24, transform: [{ rotate: '8deg' }] }]} />
            <LinearGradient colors={gradients.brand} style={styles.heart}><Ionicons name="heart" size={26} color="#fff" /></LinearGradient>
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
  title: { color: '#fff', fontSize: 46, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1, textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 17, textAlign: 'center' },
  photos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: space(6) },
  photo: { width: 140, height: 190, borderRadius: 20, borderWidth: 3, borderColor: '#fff', backgroundColor: colors.card },
  heart: {
    position: 'absolute', bottom: -22, alignSelf: 'center', left: '50%', marginLeft: -26,
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
});
