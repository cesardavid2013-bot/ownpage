import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ProfileDetails } from '@/components/ProfileDetails';
import { SafetySheet } from '@/components/SafetySheet';
import { webMaxWidth } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, font, space } from '@/lib/theme';
import type { Match, Profile } from '@/lib/types';

export default function UserProfile() {
  const { t } = useTranslation();
  const { id, fromLikes } = useLocalSearchParams<{ id: string; fromLikes?: string }>();
  const myId = useAuth((s) => s.user?.id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menu, setMenu] = useState(false);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {!profile ? <ActivityIndicator color={colors.primary} style={{ flex: 1 }} /> : (
        <ScrollView contentContainerStyle={[{ paddingBottom: space(30) }, webMaxWidth]}>
          <ProfileDetails profile={profile} />
          {id !== myId && (
            <Pressable onPress={() => setMenu(true)} style={styles.safety} testID="profile-safety" accessibilityRole="button">
              <Ionicons name="shield-outline" size={16} color={colors.textMuted} />
              <Text style={styles.safetyText}>{t('profile.report')} · {t('profile.block')}</Text>
            </Pressable>
          )}
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
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => swipe('like')} disabled={busy} style={[styles.action, styles.like]} accessibilityLabel={t('discover.like')}>
            <Ionicons name="heart" size={28} color={colors.onPrimary} />
          </Pressable>
        </View>
      ) : null}
      {profile ? (
        <SafetySheet visible={menu} onClose={() => setMenu(false)} person={{ id: profile.id, name: profile.name }}
          onDone={() => { useRealtime.getState().bump(); router.dismissAll(); }} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safety: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2), paddingVertical: space(5), marginHorizontal: space(5), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  safetyText: { color: colors.textMuted, fontFamily: font.medium, fontSize: 14 },
  close: { position: 'absolute', top: 0, right: 0, padding: space(4) },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', bottom: space(8), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: space(8) },
  action: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  like: { backgroundColor: colors.primary, borderColor: colors.primary },
});
