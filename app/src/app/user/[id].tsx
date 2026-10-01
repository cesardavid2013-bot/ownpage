import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ProfileDetails } from '@/components/ProfileDetails';
import { Sheet } from '@/components/Sheet';
import { Button, Title, webMaxWidth } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm, notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, space, font } from '@/lib/theme';
import type { Match, Profile } from '@/lib/types';

const REASONS = ['fake', 'inappropriate', 'harassment', 'spam', 'underage', 'other'] as const;

export default function UserProfile() {
  const { t } = useTranslation();
  const { id, fromLikes } = useLocalSearchParams<{ id: string; fromLikes?: string }>();
  const myId = useAuth((s) => s.user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Profile>(`/users/${id}`).then(setProfile).catch((e) => {
      notify(errorMessage(e));
      router.back();
    });
  }, [id]);

  async function swipe(action: 'like' | 'pass') {
    setBusy(true);
    try {
      const res = await api<{ matched: boolean; match: Match | null }>('/swipes', { body: { targetId: id, action } });
      if (res.matched && res.match) useRealtime.getState().setCelebrate(res.match);
      useRealtime.getState().bump();
      useAuth.getState().reload();
      router.back();
    } catch (e) {
      notify(errorMessage(e));
      setBusy(false);
    }
  }

  async function block() {
    if (!profile) return;
    if (!(await confirm(t('profile.blockConfirm', { name: profile.name }), t('profile.block'), t('common.cancel')))) return;
    await api(`/users/${id}/block`, { body: {} }).catch(() => {});
    useRealtime.getState().bump();
    router.dismissAll();
  }

  async function report(reason: (typeof REASONS)[number]) {
    setReporting(false);
    try {
      await api(`/users/${id}/report`, { body: { reason } });
      useRealtime.getState().bump();
      notify(t('profile.reported'));
      router.dismissAll();
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {!profile ? <ActivityIndicator color={colors.primary} style={{ flex: 1 }} /> : (
        <ScrollView contentContainerStyle={[{ paddingBottom: space(30) }, webMaxWidth]}>
          <ProfileDetails profile={profile} />
          {id !== myId && <View style={{ paddingHorizontal: space(5), gap: space(3) }}>
            <Button title={t('profile.report')} variant="secondary" icon="flag-outline" onPress={() => setReporting(true)} />
            <Button title={t('profile.block')} variant="ghost" icon="ban-outline" onPress={block} />
          </View>}
        </ScrollView>
      )}
      <SafeAreaView edges={['top']} style={styles.close} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel={t('common.close')}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </Pressable>
      </SafeAreaView>
      {profile && fromLikes ? (
        <View style={styles.actions}>
          <Pressable onPress={() => swipe('pass')} disabled={busy} style={styles.action} accessibilityLabel={t('discover.nope')}>
            <Ionicons name="close" size={30} color={colors.danger} />
          </Pressable>
          <Pressable onPress={() => swipe('like')} disabled={busy} style={styles.action} accessibilityLabel={t('discover.like')}>
            <Ionicons name="heart" size={30} color={colors.success} />
          </Pressable>
        </View>
      ) : null}
      <Sheet visible={reporting} onClose={() => setReporting(false)}>
        <Title style={{ fontSize: 20, fontFamily: font.body }}>{t('profile.reportTitle', { name: profile?.name ?? '' })}</Title>
        {REASONS.map((r) => <Button key={r} title={t(`report.${r}`)} variant="secondary" onPress={() => report(r)} />)}
        <Button title={t('common.cancel')} variant="ghost" onPress={() => setReporting(false)} />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', top: 0, right: 0, padding: space(4) },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', bottom: space(8), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: space(8) },
  action: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
});
