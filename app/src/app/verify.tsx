import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bokeh } from '@/components/Bokeh';
import { Header, Screen } from '@/components/Screen';
import { Button, ErrorText } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api, imageFormData } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSocketEvent } from '@/lib/realtime';
import { colors, font, space } from '@/lib/theme';

type Status = 'none' | 'pending' | 'approved' | 'rejected';
const POSE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  peace_sign: 'hand-right-outline', thumbs_up: 'thumbs-up-outline', touch_nose: 'hand-left-outline', hand_on_cheek: 'hand-right-outline', wave: 'hand-left-outline',
};

export default function Verify() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<{ status: Status; pose: string; reason: string | null } | null>(null);
  const [shot, setShot] = useState<{ uri: string; mime: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ status: Status; pose: string; reason: string | null }>('/me/verification').then(setInfo).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  useSocketEvent<{ status: Status }>('verification:updated', useCallback(() => {
    load();
    useAuth.getState().reload();
  }, [load]));

  async function capture() {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, cameraType: ImagePicker.CameraType.front };
    let result: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync(opts);
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError(t('errors.generic'));
      result = await ImagePicker.launchCameraAsync(opts);
    }
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setShot({ uri: a.uri, mime: a.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(a.mimeType) ? a.mimeType : 'image/jpeg' });
    }
  }

  async function submit() {
    if (!shot) return;
    setBusy(true);
    setError(null);
    try {
      await api('/me/verification', { form: await imageFormData(shot.uri, shot.mime) });
      setShot(null);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const status = info?.status ?? 'none';

  return (
    <Screen scroll>
      <Header title={t('verify.title')} />
      {!info ? <ActivityIndicator color={colors.primary} style={{ marginTop: space(16) }} /> : (
        <View style={{ gap: space(6), marginTop: space(4) }}>
          {status === 'approved' || status === 'pending' ? (
            <View style={styles.state}>
              <View style={[styles.seal, status === 'pending' && { borderColor: colors.border }]}>
                <Ionicons name={status === 'approved' ? 'checkmark' : 'time-outline'} size={34} color={status === 'approved' ? colors.onPrimary : colors.gold} />
              </View>
              <Text style={styles.stateTitle}>{t(status === 'approved' ? 'verify.approved' : 'verify.pending')}</Text>
              <Text style={styles.body}>{t(status === 'approved' ? 'verify.approvedBody' : 'verify.pendingBody')}</Text>
              <Button title={t('common.done')} variant="secondary" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
            </View>
          ) : (
            <>
              {status === 'rejected' ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>{t('verify.rejected')}</Text>
                  <Text style={styles.body}>{t('verify.rejectedBody')}</Text>
                </View>
              ) : null}
              <Text style={styles.body}>{t('verify.subtitle')}</Text>
              <View style={styles.arch}>
                {shot ? <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
                  <>
                    <Bokeh count={10} seed={23} intensity={0.8} />
                    <Ionicons name={POSE_ICON[info.pose] ?? 'hand-right-outline'} size={88} color={colors.primary} />
                  </>
                )}
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.label}>{t('verify.pose')}</Text>
                <Text style={styles.poseText}>{t(`poses.${info.pose}`)}</Text>
              </View>
              <ErrorText message={error} />
              {shot ? (
                <View style={{ gap: space(3) }}>
                  <Button title={t('verify.submit')} onPress={submit} loading={busy} testID="verify-submit" />
                  <Button title={t('verify.retake')} variant="ghost" onPress={capture} />
                </View>
              ) : (
                <Button title={t(Platform.OS === 'web' ? 'verify.choose' : 'verify.take')} icon="camera-outline" onPress={capture} testID="verify-capture" />
              )}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textMuted, fontFamily: font.body, fontSize: 15.5, lineHeight: 23 },
  arch: {
    alignSelf: 'center', width: 230, height: 300, borderTopLeftRadius: 115, borderTopRightRadius: 115, borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    overflow: 'hidden', backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(233,217,190,0.25)',
  },
  label: { color: colors.gold, fontFamily: font.semibold, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase' },
  poseText: { color: colors.text, fontFamily: font.display, fontSize: 28, textAlign: 'center' },
  state: { alignItems: 'center', gap: space(4), marginTop: space(10) },
  seal: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: colors.text, fontFamily: font.display, fontSize: 34, textAlign: 'center' },
  notice: { borderLeftWidth: 2, borderLeftColor: colors.danger, paddingLeft: space(4), gap: space(1) },
  noticeTitle: { color: colors.text, fontFamily: font.semibold, fontSize: 16 },
});
