import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PromptsEditor } from '@/components/PromptsEditor';
import { Header, Screen } from '@/components/Screen';
import { Button, Chip, ErrorText, Input, Muted, Row } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space, font } from '@/lib/theme';
import type { Gender, LookingFor, Me, Photo, PromptAnswer } from '@/lib/types';

const LOOKING: LookingFor[] = ['long_term', 'short_term', 'friendship', 'casual', 'unsure'];
const GENDERS: Gender[] = ['woman', 'man', 'nonbinary'];
const list = (s: string) => [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))].slice(0, 10);

export default function EditProfile() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [photos, setPhotos] = useState<Photo[]>(user.photos);
  const [form, setForm] = useState({
    name: user.name, bio: user.bio, jobTitle: user.jobTitle, company: user.company, school: user.school, city: user.city,
    heightCm: user.heightCm ? String(user.heightCm) : '', interests: user.interests.join(', '), languages: user.languages.join(', '),
  });
  const [lookingFor, setLookingFor] = useState(user.lookingFor);
  const [prompts, setPrompts] = useState<PromptAnswer[]>(user.prompts ?? []);
  const [gender, setGender] = useState(user.gender);
  const [interestedIn, setInterestedIn] = useState<Gender[]>(user.interestedIn);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onPhotos(next: Photo[]) {
    setPhotos(next);
    useAuth.getState().setUser({ ...useAuth.getState().user!, photos: next });
  }

  async function save() {
    if (!photos.length) return setError(t('errors.photo_required'));
    const height = form.heightCm ? Number(form.heightCm) : null;
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>('/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(), bio: form.bio, jobTitle: form.jobTitle, company: form.company, school: form.school,
          city: form.city, heightCm: height && height >= 100 && height <= 250 ? Math.round(height) : null,
          interests: list(form.interests), languages: list(form.languages), lookingFor, gender, interestedIn,
          prompts: prompts.map((p) => ({ id: p.id, answer: p.answer.trim() })).filter((p) => p.answer),
        },
      });
      useAuth.getState().setUser(me);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title={t('profile.edit')} />
      <View style={{ gap: space(5) }}>
        <Muted style={styles.label}>{t('profile.photos')}</Muted>
        <PhotoGrid photos={photos} onChange={onPhotos} />
        <Input label={t('auth.name')} value={form.name} onChangeText={set('name')} maxLength={40} />
        <Input label={t('profile.about')} value={form.bio} onChangeText={set('bio')} multiline maxLength={500}
          placeholder={t('onboarding.bioPlaceholder')} style={{ minHeight: 110, textAlignVertical: 'top' }} />
        <Muted style={styles.label}>{t('profile.prompts')}</Muted>
        <PromptsEditor value={prompts} onChange={setPrompts} />
        <Muted style={styles.label}>{t('lookingFor.title')}</Muted>
        <Row style={styles.wrap}>
          {LOOKING.map((l) => <Chip key={l} label={t(`lookingFor.${l}`)} selected={lookingFor === l} onPress={() => setLookingFor(l)} />)}
        </Row>
        <Input label={t('profile.interests')} value={form.interests} onChangeText={set('interests')} placeholder={t('profile.interestsHint')} />
        <Input label={t('profile.languages')} value={form.languages} onChangeText={set('languages')} placeholder="English, Español" />
        <Input label={t('profile.job')} value={form.jobTitle} onChangeText={set('jobTitle')} maxLength={60} />
        <Input label={t('profile.company')} value={form.company} onChangeText={set('company')} maxLength={60} />
        <Input label={t('profile.school')} value={form.school} onChangeText={set('school')} maxLength={80} />
        <Input label={t('profile.city')} value={form.city} onChangeText={set('city')} maxLength={60} />
        <Input label={t('profile.height')} value={form.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" maxLength={3} />
        <Muted style={styles.label}>{t('auth.iAm')}</Muted>
        <Row style={styles.wrap}>
          {GENDERS.map((g) => <Chip key={g} label={t(`gender.${g}`)} selected={gender === g} onPress={() => setGender(g)} />)}
        </Row>
        <Muted style={styles.label}>{t('auth.showMe')}</Muted>
        <Row style={styles.wrap}>
          {GENDERS.map((g) => (
            <Chip key={g} label={t(`gender.${g}`)} selected={interestedIn.includes(g)} onPress={() =>
              setInterestedIn((cur) => (cur.includes(g) ? (cur.length > 1 ? cur.filter((x) => x !== g) : cur) : [...cur, g]))} />
          ))}
        </Row>
        <ErrorText message={error} />
        <Button title={t('common.save')} onPress={save} loading={busy} disabled={!form.name.trim()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.2, lineHeight: 16, marginBottom: -space(2), fontFamily: font.semibold },
  wrap: { flexWrap: 'wrap', gap: space(2) },
});
