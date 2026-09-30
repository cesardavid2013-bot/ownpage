import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header, Screen } from '@/components/Screen';
import { Button, Chip, ErrorText, Input, Muted, Row, Title } from '@/components/ui';
import { currentLanguage, errorMessage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';
import type { Gender } from '@/lib/types';

const GENDERS: Gender[] = ['woman', 'man', 'nonbinary'];

function ageOf(y: number, m: number, d: number) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export default function Register() {
  const { t } = useTranslation();
  const register = useAuth((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [showMe, setShowMe] = useState<'men' | 'women' | 'everyone' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const y = Number(year), m = Number(month), d = Number(day);
    const date = new Date(Date.UTC(y, m - 1, d));
    const valid = y > 1900 && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    if (!valid) return setError(t('errors.invalid_birthdate'));
    if (ageOf(y, m, d) < 18) return setError(t('errors.underage'));
    if (password.length < 8) return setError(t('errors.passwords_short'));
    setBusy(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        birthdate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        gender: gender!,
        interestedIn: showMe === 'men' ? ['man'] : showMe === 'women' ? ['woman'] : ['man', 'woman', 'nonbinary'],
        locale: currentLanguage(),
      });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const ready = name.trim() && email.trim() && password && day && month && year && gender && showMe;

  return (
    <Screen scroll>
      <Header />
      <View style={{ gap: space(5), marginTop: space(2) }}>
        <Title>{t('auth.registerTitle')}</Title>
        <Input label={t('auth.name')} value={name} onChangeText={setName} autoComplete="given-name" maxLength={40} testID="name" />
        <View style={{ gap: space(1.5) }}>
          <Muted style={styles.label}>{t('auth.birthdate')}</Muted>
          <Row style={{ gap: space(2) }}>
            <View style={{ flex: 1 }}><Input placeholder="DD" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} testID="day" /></View>
            <View style={{ flex: 1 }}><Input placeholder="MM" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} testID="month" /></View>
            <View style={{ flex: 1.6 }}><Input placeholder="YYYY" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} testID="year" /></View>
          </Row>
        </View>
        <View style={{ gap: space(2) }}>
          <Muted style={styles.label}>{t('auth.iAm')}</Muted>
          <Row style={styles.wrap}>
            {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} selected={gender === g} onPress={() => setGender(g)} />)}
          </Row>
        </View>
        <View style={{ gap: space(2) }}>
          <Muted style={styles.label}>{t('auth.showMe')}</Muted>
          <Row style={styles.wrap}>
            {(['women', 'men', 'everyone'] as const).map((g) => (
              <Chip key={g} label={t(`gender.${g}`)} selected={showMe === g} onPress={() => setShowMe(g)} />
            ))}
          </Row>
        </View>
        <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" testID="email" />
        <Input label={t('auth.password')} placeholder={t('auth.passwordHint')} value={password}
          onChangeText={setPassword} secureTextEntry autoComplete="new-password" testID="password" />
        <ErrorText message={error} />
        <Button title={t('auth.register')} onPress={submit} loading={busy} disabled={!ready} testID="submit" />
        <Button title={t('auth.hasAccount')} variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.gold, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2.2, lineHeight: 16, marginBottom: -space(2) },
  wrap: { flexWrap: 'wrap', gap: space(2) },
});
