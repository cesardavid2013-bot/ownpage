import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header, Screen } from '@/components/Screen';
import { LANGUAGES, currentLanguage, setLanguage, type LanguageCode } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, space, font } from '@/lib/theme';

export default function Language() {
  const { t } = useTranslation();
  const current = currentLanguage();
  const signedIn = useAuth((s) => s.status === 'signedIn');

  async function pick(code: LanguageCode) {
    await setLanguage(code);
    if (signedIn) api('/me', { method: 'PATCH', body: { locale: code } }).catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen scroll>
      <Header title={t('settings.language')} />
      <View style={styles.list}>
        {LANGUAGES.map((l, i) => (
          <Pressable key={l.code} onPress={() => pick(l.code)} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button">
            <Text style={styles.name}>{l.name}</Text>
            {current === l.code ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space(5), paddingVertical: space(4) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { color: colors.text, fontSize: 17, fontFamily: font.body },
});
