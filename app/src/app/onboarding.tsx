import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PhotoGrid } from '@/components/PhotoGrid';
import { Screen } from '@/components/Screen';
import { Button, Chip, ErrorText, Input, Muted, Row, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { shareLocation } from '@/lib/location';
import { colors, space } from '@/lib/theme';
import type { LookingFor, Photo } from '@/lib/types';

const LOOKING: LookingFor[] = ['long_term', 'short_term', 'friendship', 'casual', 'unsure'];

export default function Onboarding() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user)!;
  const [step, setStep] = useState(0);
  // Photos are kept locally until the end: the router switches to the app as soon as the stored user has photos.
  const [photos, setPhotos] = useState<Photo[]>(user.photos);
  const [bio, setBio] = useState(user.bio);
  const [lookingFor, setLookingFor] = useState<LookingFor>(user.lookingFor);
  const [interests, setInterests] = useState(user.interests.join(', '));
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveAbout() {
    setBusy(true);
    setError(null);
    try {
      await api('/me', {
        method: 'PATCH',
        body: {
          bio: bio.trim(),
          lookingFor,
          interests: interests.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10),
        },
      });
      setStep(2);
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
      <View style={styles.progress}>
        {[0, 1, 2].map((i) => <View key={i} style={[styles.dot, i <= step && { backgroundColor: colors.primary }]} />)}
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
          <Title>{t('onboarding.aboutTitle')}</Title>
          <Input value={bio} onChangeText={setBio} placeholder={t('onboarding.bioPlaceholder')} multiline maxLength={500}
            style={{ minHeight: 120, textAlignVertical: 'top' }} />
          <Muted style={styles.label}>{t('lookingFor.title')}</Muted>
          <Row style={{ flexWrap: 'wrap', gap: space(2) }}>
            {LOOKING.map((l) => <Chip key={l} label={t(`lookingFor.${l}`)} selected={lookingFor === l} onPress={() => setLookingFor(l)} />)}
          </Row>
          <Input label={t('profile.interests')} placeholder={t('profile.interestsHint')} value={interests} onChangeText={setInterests} />
          <ErrorText message={error} />
          <Button title={t('common.continue')} onPress={saveAbout} loading={busy} testID="about-continue" />
        </View>
      )}

      {step === 2 && (
        <View style={[styles.step, { alignItems: 'center' }]}>
          <View style={styles.pin}><Ionicons name="location" size={48} color={colors.primary} /></View>
          <Title style={{ textAlign: 'center' }}>{t('onboarding.locationTitle')}</Title>
          <Muted style={{ textAlign: 'center' }}>{t('onboarding.locationSubtitle')}</Muted>
          <ErrorText message={locationMsg} />
          <Button title={t('onboarding.enableLocation')} icon="navigate" onPress={enableLocation} loading={busy} style={{ alignSelf: 'stretch' }} testID="enable-location" />
          <Button title={t('common.skip')} variant="ghost" onPress={finish} style={{ alignSelf: 'stretch' }} testID="skip-location" />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: space(2), marginTop: space(4), marginBottom: space(6) },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  step: { gap: space(5) },
  label: { color: colors.gold, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 2.2, lineHeight: 16, marginBottom: -space(2) },
  pin: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,79,123,0.12)',
    alignItems: 'center', justifyContent: 'center', marginTop: space(6),
  },
});
