import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { INTEREST_GROUPS, MAX_INTERESTS, type InterestId } from '@/lib/interests';
import { colors, font, space } from '@/lib/theme';

/** Grouped, translated interests with a hard limit, so profiles stay readable and comparable. */
export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  const full = value.length >= MAX_INTERESTS;
  const toggle = (id: InterestId) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (!full) onChange([...value, id]);
  };
  return (
    <View style={{ gap: space(6) }}>
      <Text style={styles.count} accessibilityLiveRegion="polite">{value.length} / {MAX_INTERESTS}</Text>
      {(Object.keys(INTEREST_GROUPS) as (keyof typeof INTEREST_GROUPS)[]).map((group) => (
        <View key={group} style={{ gap: space(3) }}>
          <Text style={styles.group}>{t(`interestGroup.${group}`)}</Text>
          <View style={styles.wrap}>
            {INTEREST_GROUPS[group].map((id) => {
              const on = value.includes(id);
              const disabled = !on && full;
              return (
                <Pressable key={id} onPress={() => toggle(id)} disabled={disabled} testID={`interest-${id}`}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled }}
                  style={[styles.tag, on && styles.tagOn, disabled && { opacity: 0.35 }]}>
                  <Text style={[styles.tagText, on && styles.tagTextOn]}>{t(`interest.${id}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Label for a stored interest: translated when it is from the catalog. */
export function interestLabel(t: TFunction, id: string) {
  return t(`interest.${id}`, { defaultValue: id });
}

const styles = StyleSheet.create({
  count: { color: colors.textMuted, fontFamily: font.medium, fontSize: 13, alignSelf: 'flex-end', fontVariant: ['tabular-nums'], marginBottom: -space(4) },
  group: { color: colors.gold, fontFamily: font.semibold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  tag: { paddingHorizontal: space(3.5), paddingVertical: space(2), borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(233,217,190,0.3)' },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { color: colors.text, fontFamily: font.body, fontSize: 15 },
  tagTextOn: { color: colors.onPrimary, fontFamily: font.medium },
});
