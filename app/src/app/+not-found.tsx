import { StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Glyph } from '@/components/Glyphs';
import { Button } from '@/components/ui';
import { colors, font, space } from '@/lib/theme';

/** Stale links (an old match, a deleted profile, a mistyped URL) land here instead of a framework page. */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.arch}><Glyph name="spark" size={26} color={colors.gold} /></View>
      <Text style={styles.title}>{t('notFound.title')}</Text>
      <Text style={styles.body}>{t('notFound.body')}</Text>
      <Button title={t('notFound.back')} onPress={() => router.replace('/')} style={{ alignSelf: 'stretch' }} testID="not-found-home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(8), gap: space(4) },
  arch: {
    width: 88, height: 116, borderTopLeftRadius: 44, borderTopRightRadius: 44, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.45)', alignItems: 'center', justifyContent: 'center', marginBottom: space(2),
  },
  title: { color: colors.text, fontFamily: font.display, fontSize: 28, textAlign: 'center' },
  body: { color: colors.textMuted, fontFamily: font.body, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320, marginBottom: space(4) },
});
