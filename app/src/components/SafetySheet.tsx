import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { confirm, notify } from '@/lib/notify';
import { useRealtime } from '@/lib/realtime';
import { colors, font, space } from '@/lib/theme';
import { Sheet } from './Sheet';
import { Button } from './ui';

/** Same list as the API (server/src/moderation.ts). */
export const REPORT_REASONS = [
  'harassment', 'unwanted_sexual', 'scam', 'fake', 'impersonation', 'threats', 'inappropriate', 'spam', 'underage', 'other',
] as const;
type Reason = (typeof REPORT_REASONS)[number];
type Step = 'menu' | 'reasons' | 'details' | 'done';
type Outcome = 'blocked' | 'reported' | 'unmatched';

/**
 * One place for every safety action on a person: report (with a reason and optional details),
 * block, and unmatch when you share a conversation. Kept quiet and plain on purpose.
 */
export function SafetySheet({ visible, onClose, person, matchId, onViewProfile, onDone }: {
  visible: boolean;
  onClose: () => void;
  person: { id: string; name: string };
  matchId?: string;
  onViewProfile?: () => void;
  onDone: (outcome: Outcome) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) { setStep('menu'); setReason(null); setDetails(''); }
  }, [visible]);

  const close = () => { if (!busy) onClose(); };

  async function block() {
    onClose();
    if (!(await confirm(t('profile.blockConfirm', { name: person.name }), t('profile.block'), t('common.cancel')))) return;
    try {
      await api(`/users/${person.id}/block`, { body: {} });
      useRealtime.getState().bump();
      onDone('blocked');
    } catch (e) { notify(errorMessage(e)); }
  }

  async function unmatch() {
    if (!matchId) return;
    onClose();
    if (!(await confirm(t('chats.unmatchConfirm', { name: person.name }), t('chats.unmatch'), t('common.cancel')))) return;
    try {
      await api(`/matches/${matchId}`, { method: 'DELETE' });
      useRealtime.getState().bump();
      onDone('unmatched');
    } catch (e) { notify(errorMessage(e)); }
  }

  async function sendReport() {
    if (!reason) return;
    setBusy(true);
    try {
      await api(`/users/${person.id}/report`, { body: { reason, details: details.trim() } });
      useRealtime.getState().bump();
      setStep('done');
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={step === 'done' ? () => { onClose(); onDone('reported'); } : close}>
      {step === 'menu' ? (
        <View>
          <Text style={styles.name}>{person.name}</Text>
          {onViewProfile ? <Row icon="person-outline" label={t('safetyMenu.viewProfile')} onPress={() => { onClose(); onViewProfile(); }} /> : null}
          <Row icon="flag-outline" label={t('safetyMenu.report', { name: person.name })} hint={t('safetyMenu.reportHint')} onPress={() => setStep('reasons')} testID="safety-report" />
          <Row icon="remove-circle-outline" label={t('safetyMenu.block', { name: person.name })} hint={t('safetyMenu.blockHint')} onPress={block} testID="safety-block" />
          {matchId ? <Row icon="close-circle-outline" label={t('safetyMenu.unmatch')} hint={t('safetyMenu.unmatchHint')} onPress={unmatch} danger testID="safety-unmatch" /> : null}
          <Button title={t('common.cancel')} variant="ghost" onPress={close} style={{ marginTop: space(2) }} />
        </View>
      ) : step === 'reasons' ? (
        <View style={{ gap: space(1) }}>
          <Text style={styles.title}>{t('profile.reportTitle', { name: person.name })}</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {REPORT_REASONS.map((r) => (
              <Pressable key={r} testID={`reason-${r}`} onPress={() => { setReason(r); setStep('details'); }}
                style={({ pressed }) => [styles.reason, pressed && styles.pressed]}>
                <Text style={styles.reasonText}>{t(`report.${r}`)}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </ScrollView>
          <Button title={t('common.back')} variant="ghost" onPress={() => setStep('menu')} />
        </View>
      ) : step === 'details' ? (
        <View style={{ gap: space(4) }}>
          <Text style={styles.title}>{reason ? t(`report.${reason}`) : ''}</Text>
          <View style={{ gap: space(2) }}>
            <Text style={styles.label}>{t('report.detailsLabel')}</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={t('report.detailsPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.details}
              multiline
              maxLength={1000}
              testID="report-details"
            />
          </View>
          <Text style={styles.note}>{t('report.confidential', { name: person.name })}</Text>
          <Button title={t('report.send')} onPress={sendReport} loading={busy} testID="report-send" />
          <Button title={t('common.back')} variant="ghost" onPress={() => setStep('reasons')} />
        </View>
      ) : (
        <View style={{ gap: space(3), alignItems: 'center', paddingVertical: space(2) }}>
          <Ionicons name="checkmark-circle-outline" size={34} color={colors.primary} />
          <Text style={[styles.title, { textAlign: 'center' }]}>{t('report.doneTitle')}</Text>
          <Text style={[styles.note, { textAlign: 'center' }]}>{t('report.doneBody')}</Text>
          <Button title={t('common.done')} onPress={() => { onClose(); onDone('reported'); }} style={{ alignSelf: 'stretch' }} testID="report-done" />
        </View>
      )}
    </Sheet>
  );
}

function Row({ icon, label, hint, onPress, danger, testID }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; onPress: () => void; danger?: boolean; testID?: string;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.textMuted, fontFamily: font.semibold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: space(2) },
  title: { color: colors.text, fontFamily: font.display, fontSize: 24, lineHeight: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingVertical: space(4), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 },
  rowLabel: { fontFamily: font.medium, fontSize: 16 },
  rowHint: { color: colors.textMuted, fontFamily: font.body, fontSize: 13 },
  reason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(3.5), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reasonText: { color: colors.text, fontFamily: font.body, fontSize: 16 },
  label: { color: colors.gold, fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase' },
  details: {
    color: colors.text, fontFamily: font.body, fontSize: 15, minHeight: 96, textAlignVertical: 'top', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space(2),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  note: { color: colors.textMuted, fontFamily: font.body, fontSize: 13, lineHeight: 19 },
});
