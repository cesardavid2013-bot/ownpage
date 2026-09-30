import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header, Screen } from '@/components/Screen';
import { Button, ErrorText, Input, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { space } from '@/lib/theme';

export default function Login() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
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
    <Screen scroll>
      <Header />
      <View style={{ gap: space(5), marginTop: space(4) }}>
        <Title>{t('auth.loginTitle')}</Title>
        <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress" testID="email" />
        <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry
          autoComplete="password" textContentType="password" onSubmitEditing={submit} testID="password" />
        <ErrorText message={error} />
        <Button title={t('auth.login')} onPress={submit} loading={busy} disabled={!email || !password} testID="submit" />
        <Button title={t('auth.noAccount')} variant="ghost" onPress={() => router.replace('/register')} />
      </View>
    </Screen>
  );
}
