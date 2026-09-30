import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radius, space } from '@/lib/theme';

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
  const fg = variant === 'gold' ? '#2A1D05' : variant === 'secondary' || variant === 'ghost' ? colors.text : '#fff';
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
      style={({ pressed }) => [styles.btn, { opacity: inactive ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {variant === 'primary' || variant === 'gold' ? (
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
      {icon ? <Ionicons name={icon} size={14} color={selected ? '#fff' : colors.textMuted} /> : null}
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
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
      <Image source={require('@/assets/images/favicon.png')} style={{ width: size, height: size, borderRadius: size * 0.26 }} />
      <Text style={{ color: colors.text, fontSize: size * 0.8, fontWeight: '800', letterSpacing: -0.5 }}>Lumi</Text>
    </Row>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'free') return null;
  const g = plan === 'platinum' ? gradients.platinum : plan === 'gold' ? gradients.gold : gradients.plus;
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
      <Text style={[styles.badgeText, { color: plan === 'plus' ? '#fff' : '#1B1406' }]}>{plan.toUpperCase()}</Text>
    </LinearGradient>
  );
}

export const webMaxWidth: ViewStyle = Platform.OS === 'web' ? { width: '100%', maxWidth: 520, alignSelf: 'center' } : {};

const styles = StyleSheet.create({
  btn: { borderRadius: radius.pill, overflow: 'hidden' },
  btnFill: { minHeight: 54, paddingHorizontal: space(6), justifyContent: 'center', borderRadius: radius.pill },
  btnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2) },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 16, paddingHorizontal: space(4), paddingVertical: space(3.5), minHeight: 52,
  },
  error: { color: colors.danger, fontSize: 13 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space(1.5), paddingHorizontal: space(3.5), paddingVertical: space(2),
    borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  muted: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  errorBox: {
    flexDirection: 'row', gap: space(2), alignItems: 'center', backgroundColor: 'rgba(255,90,95,0.12)',
    padding: space(3), borderRadius: radius.sm,
  },
  errorBoxText: { color: colors.danger, flex: 1, fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(5), borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: space(2.5), paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
