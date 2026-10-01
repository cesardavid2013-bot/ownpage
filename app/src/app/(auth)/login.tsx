import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bokeh } from '@/components/Bokeh';
import { Header, Screen } from '@/components/Screen';
import { Button, ErrorText, Input } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/lib/theme';

export default function Login() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Bokeh count={12} seed={41} intensity={0.55} />
      <LinearGradient colors={['rgba(10,10,12,0.2)', colors.bg]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <Screen scroll transparent>
        <Header />
        <View style={{ gap: space(6), marginTop: space(10) }}>
          <View style={{ gap: space(2) }}>
            <Text style={styles.title}>{t('auth.loginTitle')}</Text>
            <Text style={styles.sub}>{t('auth.loginSubtitle')}</Text>
          </View>
          <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email" textContentType="emailAddress" testID="email" />
          <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry
            autoComplete="password" textContentType="password" onSubmitEditing={submit} testID="password" />
          <ErrorText message={error} />
          <Button title={t('auth.login')} onPress={submit} loading={busy} disabled={!email || !password} testID="submit" />
          <Button title={t('auth.noAccount')} variant="ghost" onPress={() => router.replace('/register')} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: font.display, fontSize: 44, lineHeight: 50 },
  sub: { color: colors.textMuted, fontFamily: font.body, fontSize: 16 },
});
