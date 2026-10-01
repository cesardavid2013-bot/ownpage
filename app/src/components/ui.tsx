import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, gradients, radius, space } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';

export function Button({
  title, onPress, variant = 'primary', loading, disabled, icon, style, testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const inactive = disabled || loading;
  const fg = (variant === 'gold' || variant === 'primary') && !disabled ? colors.onPrimary : disabled ? colors.textFaint : colors.text;
  const content = (
    <View style={styles.btnInner}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [styles.btn, { opacity: loading ? 0.8 : pressed ? 0.85 : 1 }, style]}
    >
      {(variant === 'primary' || variant === 'gold') && disabled ? (
        <View style={[styles.btnFill, styles.btnDisabled]}>{content}</View>
      ) : variant === 'primary' || variant === 'gold' ? (
        <LinearGradient
          colors={variant === 'gold' ? gradients.gold : gradients.brand}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.btnFill}
        >{content}</LinearGradient>
      ) : (
        <View style={[styles.btnFill, variant === 'secondary' && styles.btnSecondary,
          variant === 'danger' && { backgroundColor: colors.danger }]}>{content}</View>
      )}
    </Pressable>
  );
}

export const Input = forwardRef<TextInput, TextInputProps & { label?: string; error?: string | null }>(
  function Input({ label, error, style, ...props }, ref) {
    return (
      <View style={{ gap: space(1.5) }}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
          {...props}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  },
);

export function Chip({ label, selected, onPress, icon }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.onPrimary : colors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.errorBoxText}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Row style={{ gap: size * 0.2 }}>
      <Text style={{ color: colors.text, fontFamily: font.display, fontSize: size * 0.82, letterSpacing: size * 0.1 }}>LUMI</Text>
      <Text style={{ color: colors.gold, fontSize: size * 0.34, marginTop: -size * 0.4, fontFamily: font.body }}>✦</Text>
    </Row>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'free') return null;
  const g = plan === 'platinum' ? gradients.platinum : plan === 'gold' ? gradients.gold : gradients.plus;
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
      <Text style={[styles.badgeText, { color: plan === 'plus' ? colors.text : '#1B1406' }]}>{plan.toUpperCase()}</Text>
    </LinearGradient>
  );
}

export const webMaxWidth: ViewStyle = Platform.OS === 'web' ? { width: '100%', maxWidth: 520, alignSelf: 'center' } : {};

const styles = StyleSheet.create({
  btn: { borderRadius: radius.pill, overflow: 'hidden' },
  btnFill: { minHeight: 54, paddingHorizontal: space(6), justifyContent: 'center', borderRadius: radius.pill },
  btnDisabled: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(233,217,190,0.18)' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(233,217,190,0.3)' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2) },
  btnText: { fontSize: 15, letterSpacing: 0.4, fontFamily: font.semibold },
  label: { color: colors.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.2, fontFamily: font.semibold },
  input: {
    backgroundColor: 'transparent', borderBottomWidth: 1, borderColor: 'rgba(233,217,190,0.22)',
    color: colors.text, fontSize: 17, fontFamily: font.body, paddingHorizontal: space(0.5), paddingVertical: space(3), minHeight: 50,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  error: { color: colors.danger, fontSize: 13, fontFamily: font.body },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space(1.5), paddingHorizontal: space(3.5), paddingVertical: space(2),
    borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 14, fontFamily: font.semibold },
  title: { color: colors.text, fontSize: 34, fontFamily: font.display, letterSpacing: -0.3, lineHeight: 40 },
  muted: { color: colors.textMuted, fontSize: 15, lineHeight: 22, fontFamily: font.body },
  errorBox: {
    flexDirection: 'row', gap: space(2), alignItems: 'center', backgroundColor: 'rgba(255,90,95,0.12)',
    padding: space(3), borderRadius: radius.sm,
  },
  errorBoxText: { color: colors.danger, flex: 1, fontSize: 14, fontFamily: font.body },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(5), borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: space(2.5), paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, letterSpacing: 1, fontFamily: font.bold },
});
