import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNotices } from '@/lib/notify';
import { colors, font, radius, shadow, space } from '@/lib/theme';

/** Branded replacements for system alerts: one dialog at a time, plus a passing toast. */
export function Notices() {
  return (
    <>
      <DialogLayer />
      <ToastLayer />
    </>
  );
}

function DialogLayer() {
  const { t } = useTranslation();
  const dialog = useNotices((s) => s.dialogs[0]);
  const close = useNotices((s) => s.close);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!dialog) return;
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  }, [dialog, rise]);

  if (!dialog) return null;
  const choice = Boolean(dialog.confirmLabel);
  const dismiss = () => close(dialog.id, false);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel={t('common.close')}>
        <Animated.View
          accessibilityRole="alert"
          style={[styles.card, {
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }]}
        >
          <Pressable onPress={() => {}} style={styles.body}>
            <Text style={styles.mark}>✦</Text>
            {dialog.title ? <Text style={styles.title}>{dialog.title}</Text> : null}
            <Text style={[styles.message, !dialog.title && styles.messageLead]}>{dialog.message}</Text>
          </Pressable>
          <View style={styles.actions}>
            {choice ? (
              <>
                <Pressable testID="dialog-cancel" onPress={dismiss} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <Text style={styles.actionText}>{dialog.cancelLabel}</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable testID="dialog-confirm" onPress={() => close(dialog.id, true)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <Text style={[styles.actionText, styles.actionStrong, dialog.destructive && { color: colors.danger }]}>{dialog.confirmLabel}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable testID="dialog-ok" onPress={() => close(dialog.id, true)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                <Text style={[styles.actionText, styles.actionStrong]}>{t('common.done')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ToastLayer() {
  const insets = useSafeAreaInsets();
  const toast = useNotices((s) => s.toast);
  const dismiss = useNotices((s) => s.dismissToast);
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    shown.setValue(0);
    Animated.spring(shown, { toValue: 1, friction: 8, tension: 70, useNativeDriver: false }).start();
  }, [toast, shown]);

  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + space(2) }]}>
      <Animated.View style={{
        opacity: shown,
        transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
      }}>
        <Pressable testID="toast" accessibilityRole="alert" onPress={() => dismiss(toast.id)} style={styles.toast}>
          <Text style={styles.toastMark}>✦</Text>
          <Text style={styles.toastText}>{toast.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: space(8) },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: colors.bgElevated, borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.35)', overflow: 'hidden', ...shadow,
  },
  body: { alignItems: 'center', paddingHorizontal: space(6), paddingTop: space(6), paddingBottom: space(5), gap: space(2.5) },
  mark: { color: colors.gold, fontSize: 14, fontFamily: font.body },
  title: { color: colors.text, fontFamily: font.display, fontSize: 24, textAlign: 'center', lineHeight: 30 },
  message: { color: colors.textMuted, fontFamily: font.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  messageLead: { color: colors.text, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  action: { flex: 1, paddingVertical: space(4), alignItems: 'center' },
  pressed: { backgroundColor: colors.card },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  actionText: { color: colors.textMuted, fontFamily: font.medium, fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase' },
  actionStrong: { color: colors.primary },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space(5), zIndex: 1000 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: space(2.5), maxWidth: 420,
    backgroundColor: 'rgba(23,23,27,0.96)', borderRadius: radius.pill, paddingVertical: space(3), paddingHorizontal: space(5),
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.35)', ...shadow,
  },
  toastMark: { color: colors.gold, fontSize: 12, fontFamily: font.body },
  toastText: { color: colors.text, fontFamily: font.body, fontSize: 14, lineHeight: 20, flexShrink: 1 },
});
