import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '@/lib/theme';

/** A single-choice answer set as a serif line with a radio, used in the conversational sign-up. */
export function Choice({ label, hint, selected, onPress, testID }: { label: string; hint?: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} testID={testID}
      style={[styles.choice, selected && styles.choiceOn]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.choiceText, selected && { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.dot} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3), paddingVertical: space(4.5),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  choiceOn: { borderBottomColor: colors.primary },
  choiceText: { color: colors.textMuted, fontFamily: font.display, fontSize: 26 },
  hint: { color: colors.textFaint, fontFamily: font.body, fontSize: 13 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
