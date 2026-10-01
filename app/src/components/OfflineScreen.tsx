import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Bokeh } from './Bokeh';
import { Button, Logo } from './ui';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/lib/theme';

/** Shown when the app can't reach Lumi at launch. The saved session is kept, so retrying signs you straight back in. */
export function OfflineScreen() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.root}>
      <Bokeh count={14} seed={19} intensity={0.7} />
      <Logo size={26} />
      <Text style={styles.title}>{t('errors.network_error')}</Text>
      <Button title={t('common.retry')} loading={busy} onPress={async () => {
        setBusy(true);
        useAuth.setState({ status: 'loading' });
        await useAuth.getState().bootstrap();
        setBusy(false);
      }} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: space(6), padding: space(8) },
  title: { color: colors.text, fontFamily: font.display, fontSize: 26, lineHeight: 32, textAlign: 'center', maxWidth: 340 },
});
