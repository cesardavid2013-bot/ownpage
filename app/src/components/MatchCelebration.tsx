import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, font, space, keyboardBehavior } from '@/lib/theme';
import { Bokeh } from './Bokeh';
import { Glyph } from './Glyphs';

/**
 * The mutual-like moment: two arch portraits drift together and a single light comes on between
 * them. The first message can be written right here, because that is what people want to do next.
 */
export function MatchCelebration() {
  const { t } = useTranslation();
  const match = useRealtime((s) => s.celebrate);
  const me = useAuth((s) => s.user);
  const meet = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!match) return;
    setText('');
    meet.setValue(0);
    spark.setValue(0);
    Animated.sequence([
      Animated.timing(meet, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(spark, { toValue: 1, friction: 6, tension: 90, useNativeDriver: false }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [match, meet, spark]);

  if (!match || !me) return null;
  const close = () => useRealtime.getState().setCelebrate(null);
  const openChat = () => {
    close();
    router.push({ pathname: '/chat/[id]', params: { id: match.id } });
  };

  async function sendFirst() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const clientId = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      await api(`/matches/${match!.id}/messages`, { body: { body, clientId } });
      useRealtime.getState().bump();
      openChat();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const slide = (from: number) => ({
    opacity: meet,
    transform: [{ translateX: meet.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior={keyboardBehavior}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
        <Bokeh count={14} seed={31} intensity={0.7} />
        <LinearGradient colors={['rgba(10,10,12,0.55)', 'rgba(10,10,12,0.75)', 'rgba(10,10,12,0.97)']} style={StyleSheet.absoluteFill} />

        <Pressable onPress={close} style={styles.close} hitSlop={12} accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>

        <View style={styles.content} accessibilityRole="alert">
          <View style={styles.pair}>
            <Animated.View style={[styles.arch, slide(-36)]}>
              {me.photos[0] ? <Image source={{ uri: me.photos[0].thumb }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </Animated.View>
            <Animated.View style={[styles.spark, { opacity: spark, transform: [{ scale: spark }] }]}>
              <Glyph name="spark" size={22} color={colors.gold} filled />
            </Animated.View>
            <Animated.View style={[styles.arch, slide(36)]}>
              {match.user.photos[0] ? <Image source={{ uri: match.user.photos[0].thumb }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </Animated.View>
          </View>

          <Text style={styles.title}>{t('match.title', { name: match.user.name })}</Text>
          <Text style={styles.subtitle}>{t('match.subtitle', { name: match.user.name })}</Text>

          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('match.placeholder', { name: match.user.name })}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={2000}
              onSubmitEditing={sendFirst}
              returnKeyType="send"
              testID="match-input"
            />
            <Pressable onPress={sendFirst} disabled={!text.trim() || sending} style={[styles.send, { opacity: text.trim() ? 1 : 0.35 }]}
              accessibilityLabel={t('common.send')} testID="match-send">
              <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>

          <View style={styles.links}>
            <Pressable onPress={openChat} hitSlop={8} testID="match-open-chat"><Text style={styles.link}>{t('match.sendMessage')}</Text></Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable onPress={close} hitSlop={8} testID="match-close"><Text style={[styles.link, { color: colors.textMuted }]}>{t('match.keepSwiping')}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ARCH_W = 128;
const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(6) },
  close: { position: 'absolute', top: space(12), right: space(6) },
  content: { alignItems: 'center', width: '100%', maxWidth: 400 },
  pair: { flexDirection: 'row', alignItems: 'center', marginBottom: space(9) },
  arch: {
    width: ARCH_W, height: ARCH_W * 1.33, overflow: 'hidden', backgroundColor: colors.card,
    borderTopLeftRadius: ARCH_W / 2, borderTopRightRadius: ARCH_W / 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.5)',
  },
  spark: { width: 44, alignItems: 'center' },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontFamily: font.display, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', fontFamily: font.body, marginTop: space(2), marginBottom: space(8) },
  composer: { flexDirection: 'row', alignItems: 'center', gap: space(2), alignSelf: 'stretch' },
  input: {
    flex: 1, color: colors.text, fontFamily: font.body, fontSize: 16, height: 50, paddingHorizontal: space(5),
    borderRadius: 25, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  send: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: space(3), marginTop: space(6) },
  link: { color: colors.primary, fontFamily: font.medium, fontSize: 14, letterSpacing: 0.3 },
  dot: { color: colors.textFaint },
});
