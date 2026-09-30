import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Button, Logo, Muted } from '@/components/ui';
import { LANGUAGES, currentLanguage } from '@/i18n';
import { colors, gradients, space } from '@/lib/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const lang = LANGUAGES.find((l) => l.code === currentLanguage())?.name;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['rgba(255,79,123,0.35)', 'rgba(139,92,246,0.18)', 'transparent']}
        style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.8, y: 0.7 }} />
      <Screen style={{ justifyContent: 'space-between' }}>
        <View style={styles.top}>
          <Logo size={34} />
          <Pressable onPress={() => router.push('/language')} style={styles.lang} accessibilityRole="button">
            <Ionicons name="globe-outline" size={16} color={colors.text} />
            <Text style={styles.langText}>{lang}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.orbWrap}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
              <Ionicons name="heart" size={64} color="#fff" />
            </LinearGradient>
            <View style={[styles.spark, { top: 6, right: 18 }]}><Ionicons name="sparkles" size={22} color={colors.gold} /></View>
            <View style={[styles.spark, { bottom: 16, left: 10 }]}><Ionicons name="star" size={16} color={colors.violet} /></View>
          </View>
          <Text style={styles.slogan}>{t('slogan')}</Text>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Muted style={{ textAlign: 'center' }}>{t('welcome.subtitle')}</Muted>
        </View>

        <View style={{ gap: space(3), paddingBottom: space(2) }}>
          <Button title={t('welcome.createAccount')} onPress={() => router.push('/register')} testID="go-register" />
          <Button title={t('welcome.haveAccount')} variant="secondary" onPress={() => router.push('/login')} testID="go-login" />
          <Text style={styles.terms}>{t('welcome.terms')}</Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space(3) },
  lang: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  langText: { color: colors.text, fontWeight: '600' },
  hero: { alignItems: 'center', gap: space(4) },
  orbWrap: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: space(2) },
  orb: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute' },
  slogan: { color: colors.gold, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 12, textAlign: 'center' },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', textAlign: 'center', letterSpacing: -1, lineHeight: 42 },
  terms: { color: colors.textFaint, fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: space(1) },
});
