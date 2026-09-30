import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bokeh } from '@/components/Bokeh';
import { Screen } from '@/components/Screen';
import { Button, Logo } from '@/components/ui';
import { LANGUAGES, currentLanguage } from '@/i18n';
import { colors, font, space } from '@/lib/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const lang = LANGUAGES.find((l) => l.code === currentLanguage())?.name;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Bokeh count={24} seed={5} intensity={1.2} />
      <LinearGradient colors={['rgba(10,10,12,0.25)', 'rgba(10,10,12,0.55)', colors.bg]} locations={[0, 0.5, 0.85]} style={StyleSheet.absoluteFill} />
      <Screen transparent style={{ justifyContent: 'space-between' }}>
        <View style={styles.top}>
          <Logo size={26} />
          <Pressable onPress={() => router.push('/language')} style={styles.lang} accessibilityRole="button">
            <Ionicons name="globe-outline" size={15} color={colors.textMuted} />
            <Text style={styles.langText}>{lang}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.slogan}>{t('slogan')}</Text>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(233,217,190,0.22)',
  },
  langText: { color: colors.textMuted, fontSize: 13 },
  hero: { gap: space(4), marginTop: 'auto', marginBottom: space(10) },
  slogan: { color: colors.gold, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', fontSize: 11 },
  title: { color: colors.text, fontFamily: font.display, fontSize: 52, lineHeight: 56, letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24, maxWidth: 360 },
  terms: { color: colors.textFaint, fontSize: 11.5, textAlign: 'center', lineHeight: 17, marginTop: space(1) },
});
