import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { font, shadow } from '@/lib/theme';
import type { Plan } from '@/lib/types';

const FINISH: Record<Exclude<Plan, 'free'>, { colors: readonly [string, string, ...string[]]; ink: string; no: string }> = {
  plus: { colors: ['#3B3A3F', '#1B1B1F', '#2C2B31'], ink: '#ECE8E1', no: '•••• 2026 0999' },
  gold: { colors: ['#F1DCAA', '#C9A46A', '#A47C3F', '#E2C68D'], ink: '#2A1F0C', no: '•••• 2026 1999' },
  platinum: { colors: ['#F7F7F5', '#CFD2D6', '#A4A9B1', '#E9EAEC'], ink: '#1C1E22', no: '•••• 2026 2999' },
};

/** A membership rendered as a metal card — the same object members see on the website. */
export function MembershipCard({ tier, holder }: { tier: Exclude<Plan, 'free'>; holder?: string }) {
  const f = FINISH[tier];
  return (
    <LinearGradient colors={f.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, shadow]}>
      <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Text style={[styles.brand, { color: f.ink }]}>LUMI</Text>
        <LinearGradient colors={['#E8D3A4', '#B58F4E']} style={styles.chip} />
      </View>
      <View>
        <Text style={[styles.no, { color: f.ink }]}>{f.no}</Text>
        <View style={styles.bottom}>
          <Text style={[styles.tier, { color: f.ink }]}>{tier.toUpperCase()}</Text>
          {holder ? <Text style={[styles.holder, { color: f.ink }]} numberOfLines={1}>{holder.toUpperCase()}</Text> : null}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', aspectRatio: 1.586, borderRadius: 18, padding: 22, justifyContent: 'space-between', overflow: 'hidden' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontFamily: font.display, fontSize: 26, letterSpacing: 4 },
  chip: { width: 42, height: 30, borderRadius: 6 },
  no: { fontSize: 14, letterSpacing: 3, opacity: 0.7, marginBottom: 6, fontVariant: ['tabular-nums'], fontFamily: font.body },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  tier: { fontSize: 12, letterSpacing: 4, fontFamily: font.bold },
  holder: { fontSize: 11, letterSpacing: 2, opacity: 0.75, flexShrink: 1, fontFamily: font.body },
});
