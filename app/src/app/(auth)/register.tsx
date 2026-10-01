import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Choice } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { Button, Chip, ErrorText, Input, Row } from '@/components/ui';
import { currentLanguage, errorMessage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { colors, font, space } from '@/lib/theme';
import type { Gender } from '@/lib/types';

const GENDERS: Gender[] = ['woman', 'man', 'nonbinary'];
const STEPS = 5;

function ageOf(y: number, m: number, d: number) {
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

function validDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return y > 1900 && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && date.getTime() < Date.now();
}

/** Sign-up as a short conversation: one question per screen. */
export default function Register() {
  const { t } = useTranslation();
  const register = useAuth((s) => s.register);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [showMe, setShowMe] = useState<'men' | 'women' | 'everyone' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const y = Number(year), m = Number(month), d = Number(day);
  const dateOk = year.length === 4 && validDate(y, m, d);
  const age = dateOk ? ageOf(y, m, d) : null;

  function go(next: number) {
    setError(null);
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: false }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start();
    setTimeout(() => setStep(next), 120);
  }

  function next() {
    if (step === 1) {
      if (!dateOk) return setError(t('errors.invalid_birthdate'));
      if ((age ?? 0) < 18) return setError(t('errors.underage'));
    }
    if (step < STEPS - 1) go(step + 1);
    else submit();
  }

  async function submit() {
    if (password.length < 8) return setError(t('errors.passwords_short'));
    setBusy(true);
    setError(null);
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
      const msg = errorMessage(e);
      setError(msg);
      setBusy(false);
    }
  }

  const ready = [
    name.trim().length > 0,
    dateOk && (age ?? 0) >= 18,
    !!gender,
    !!showMe,
    email.trim().length > 3 && password.length > 0,
  ][step];

  const question = [
    t('register.stepName'), t('register.stepBirthday'), t('register.stepGender'), t('register.stepShowMe'), t('register.stepAccount'),
  ][step];

  return (
    <Screen scroll>
      <View style={styles.top}>
        <Pressable onPress={() => (step === 0 ? router.back() : go(step - 1))} hitSlop={12} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }).map((_, i) => <View key={i} style={[styles.seg, i <= step && styles.segOn]} />)}
        </View>
      </View>

      <Animated.View style={{ opacity: fade, gap: space(6), marginTop: space(8) }}>
        <Text style={styles.question}>{question}</Text>

        {step === 0 && (
          <Input value={name} onChangeText={setName} autoFocus autoComplete="given-name" maxLength={40}
            placeholder={t('auth.name')} style={styles.big} onSubmitEditing={() => ready && next()} testID="name" />
        )}

        {step === 1 && (
          <View style={{ gap: space(4) }}>
            <Row style={{ gap: space(3) }}>
              <View style={{ flex: 1 }}><Input placeholder="DD" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} style={styles.big} testID="day" /></View>
              <View style={{ flex: 1 }}><Input placeholder="MM" value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} style={styles.big} testID="month" /></View>
              <View style={{ flex: 1.6 }}><Input placeholder="YYYY" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} style={styles.big} testID="year" /></View>
            </Row>
            {age != null && age >= 18 ? <Text style={styles.age}>{t('register.youAre', { age })}</Text> : null}
            {age != null && age < 18 ? <Text style={styles.minor} testID="underage">{t('errors.underage')}</Text> : null}
            <Text style={styles.hint}>{t('register.stepBirthdayHint')}</Text>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: space(3) }}>
            {GENDERS.map((g) => <Choice key={g} label={t(`gender.${g}`)} selected={gender === g} onPress={() => setGender(g)} />)}
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: space(3) }}>
            {(['women', 'men', 'everyone'] as const).map((g) => <Choice key={g} label={t(`gender.${g}`)} selected={showMe === g} onPress={() => setShowMe(g)} />)}
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: space(5) }}>
            <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" testID="email" />
            <Input label={t('auth.password')} placeholder={t('auth.passwordHint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" testID="password" onSubmitEditing={next} />
          </View>
        )}

        <ErrorText message={error} />
        <Button title={step === STEPS - 1 ? t('auth.register') : t('common.continue')} onPress={next} loading={busy} disabled={!ready}
          testID={step === STEPS - 1 ? 'submit' : 'next'} />
        {step === 0 ? <Button title={t('auth.hasAccount')} variant="ghost" onPress={() => router.replace('/login')} /> : null}
      </Animated.View>
    </Screen>
  );
}


const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(3) },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.primary },
  question: { color: colors.text, fontFamily: font.display, fontSize: 40, lineHeight: 46, letterSpacing: -0.3 },
  big: { fontSize: 24, fontFamily: font.body, minHeight: 60 },
  age: { color: colors.primary, fontFamily: font.displayItalic, fontSize: 24 },
  minor: { color: colors.text, fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  hint: { color: colors.textMuted, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
});
