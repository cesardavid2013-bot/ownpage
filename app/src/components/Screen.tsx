import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font, space } from '@/lib/theme';
import { webMaxWidth } from './ui';

export function Screen({
  children, scroll, edges = ['top', 'bottom'], style, padded = true, transparent,
}: { children: ReactNode; scroll?: boolean; edges?: Edge[]; style?: ViewStyle; padded?: boolean; transparent?: boolean }) {
  const inner = padded ? { paddingHorizontal: space(5) } : null;
  return (
    <SafeAreaView edges={edges} style={[styles.root, transparent && { backgroundColor: 'transparent' }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[inner, { paddingBottom: space(10) }, webMaxWidth, style]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >{children}</ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner, webMaxWidth, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, gap: space(2) },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -space(2) },
  headerTitle: { flex: 1, color: colors.text, fontSize: 24, fontFamily: font.display },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
