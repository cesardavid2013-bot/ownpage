import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Choice } from '@/components/Choice';
import { InterestPicker } from '@/components/InterestPicker';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PromptsEditor } from '@/components/PromptsEditor';
import { Screen } from '@/components/Screen';
import { Button, ErrorText, Input, Muted, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { shareLocation } from '@/lib/location';
import { colors, font, space } from '@/lib/theme';
import type { LookingFor, Photo, PromptAnswer } from '@/lib/types';

const LOOKING: LookingFor[] = ['long_term', 'short_term', 'friendship', 'casual', 'unsure'];

const STEPS = 5;

/** Profile setup as a short conversation: one idea per screen, nothing asked twice. */
export default function Onboarding() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [step, setStep] = useState(0);
  // Photos are kept locally until the end: the router switches to the app as soon as the stored user has photos.
  const [photos, setPhotos] = useState<Photo[]>(user.photos);
  const [lookingFor, setLookingFor] = useState<LookingFor>(user.lookingFor);
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [bio, setBio] = useState(user.bio);
  const [prompts, setPrompts] = useState<PromptAnswer[]>(user.prompts ?? []);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true);
    setError(null);
    try {
      await api('/me', {
        method: 'PATCH',
        body: {
          bio: bio.trim(),
          lookingFor,
          interests,
          prompts: prompts.filter((p) => p.answer.trim()).map((p) => ({ id: p.id, answer: p.answer.trim() })),
        },
      });
      setStep(4);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function enableLocation() {
    setBusy(true);
    const ok = await shareLocation();
    setBusy(false);
    if (ok) await finish();
    else setLocationMsg(t('onboarding.locationDenied'));
  }

  async function finish() {
    setBusy(true);
    await useAuth.getState().reload();
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        {step > 0 && step < 4 ? (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={12} accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : <View style={{ width: 24 }} />}
        <View style={styles.progress}>
          {Array.from({ length: STEPS }).map((_, i) => <View key={i} style={[styles.dot, i <= step && { backgroundColor: colors.primary }]} />)}
        </View>
      </View>

      {step === 0 && (
        <View style={styles.step}>
          <Title>{t('onboarding.photosTitle')}</Title>
          <Muted>{t('onboarding.photosSubtitle')}</Muted>
          <PhotoGrid photos={photos} onChange={setPhotos} />
          <ErrorText message={error} />
          <Button title={t('common.continue')} disabled={!photos.length} onPress={() => setStep(1)} testID="photos-continue" />
        </View>
      )}

      {step === 1 && (
        <View style={styles.step}>
          <Title>{t('onboarding.intentTitle')}</Title>
          <Muted>{t('onboarding.intentHint')}</Muted>
          <View>
            {LOOKING.map((l) => <Choice key={l} label={t(`lookingFor.${l}`)} selected={lookingFor === l} onPress={() => setLookingFor(l)} testID={`intent-${l}`} />)}
          </View>
          <Button title={t('common.continue')} onPress={() => setStep(2)} testID="intent-continue" />
        </View>
      )}

      {step === 2 && (
        <View style={styles.step}>
          <Title>{t('onboarding.interestsTitle')}</Title>
          <Muted>{t('onboarding.interestsHint')}</Muted>
          <InterestPicker value={interests} onChange={setInterests} />
          <Button title={t('common.continue')} onPress={() => setStep(3)} testID="interests-continue" />
        </View>
      )}

      {step === 3 && (
        <View style={styles.step}>
          <Title>{t('onboarding.promptTitle')}</Title>
          <Muted>{t('onboarding.promptHint')}</Muted>
          <PromptsEditor value={prompts} onChange={setPrompts} />
          <Input label={t('onboarding.aboutTitle')} value={bio} onChangeText={setBio} placeholder={t('onboarding.bioPlaceholder')} multiline maxLength={500}
            style={{ minHeight: 96, textAlignVertical: 'top' }} />
          <ErrorText message={error} />
          <Button title={t('common.continue')} onPress={saveProfile} loading={busy} testID="about-continue" />
        </View>
      )}

      {step === 4 && (
        <View style={[styles.step, { alignItems: 'center' }]}>
          <View style={styles.pin}><Ionicons name="navigate-outline" size={36} color={colors.gold} /></View>
          <Title style={{ textAlign: 'center' }}>{t('onboarding.locationTitle')}</Title>
          <Muted style={{ textAlign: 'center' }}>{t('onboarding.locationSubtitle')}</Muted>
          <ErrorText message={locationMsg} />
          <Button title={t('onboarding.enableLocation')} onPress={enableLocation} loading={busy} style={{ alignSelf: 'stretch' }} testID="enable-location" />
          <Button title={t('common.skip')} variant="ghost" onPress={finish} style={{ alignSelf: 'stretch' }} testID="skip-location" />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space(4), marginTop: space(4), marginBottom: space(6) },
  progress: { flex: 1, flexDirection: 'row', gap: space(2) },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  step: { gap: space(5) },
  label: { color: colors.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.2, lineHeight: 16, marginBottom: -space(2), fontFamily: font.semibold },
  pin: {
    width: 96, height: 128, borderTopLeftRadius: 48, borderTopRightRadius: 48, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.5)', alignItems: 'center', justifyContent: 'center', marginTop: space(6),
  },
});
