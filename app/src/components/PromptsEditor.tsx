import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, font, radius, space } from '@/lib/theme';
import { PROMPT_IDS, type PromptAnswer, type PromptId } from '@/lib/types';
import { Sheet } from './Sheet';
import { Title } from './ui';

const MAX = 3;

export function PromptsEditor({ value, onChange }: { value: PromptAnswer[]; onChange: (v: PromptAnswer[]) => void }) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const available = PROMPT_IDS.filter((id) => !value.some((p) => p.id === id));

  const setAnswer = (id: PromptId, answer: string) => onChange(value.map((p) => (p.id === id ? { ...p, answer } : p)));
  const remove = (id: PromptId) => onChange(value.filter((p) => p.id !== id));

  return (
    <View style={{ gap: space(3) }}>
      <Text style={styles.hint}>{t('profile.promptsHint')}</Text>
      {value.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.question}>{t(`prompts.${p.id}`)}</Text>
            <Pressable onPress={() => remove(p.id)} hitSlop={10} accessibilityLabel={t('common.delete')}>
              <Ionicons name="close" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
          <TextInput
            value={p.answer}
            onChangeText={(v) => setAnswer(p.id, v)}
            placeholder={t('profile.answerPlaceholder')}
            placeholderTextColor={colors.textFaint}
            maxLength={160}
            multiline
            style={styles.answer}
          />
          <Text style={styles.count}>{p.answer.length}/160</Text>
        </View>
      ))}
      {value.length < MAX ? (
        <Pressable onPress={() => setPicking(true)} style={styles.add} accessibilityRole="button" testID="add-prompt">
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addText}>{t('profile.addPrompt')}</Text>
        </Pressable>
      ) : null}

      <Sheet visible={picking} onClose={() => setPicking(false)}>
        <Title style={{ fontSize: 26 }}>{t('profile.choosePrompt')}</Title>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space(2) }}>
          {available.map((id) => (
            <Pressable key={id} style={styles.option} onPress={() => {
              onChange([...value, { id, answer: '' }]);
              setPicking(false);
            }}>
              <Text style={styles.optionText}>{t(`prompts.${id}`)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 14 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space(4), gap: space(2) },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) },
  question: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', flex: 1 },
  answer: { color: colors.text, fontFamily: font.display, fontSize: 21, lineHeight: 28, minHeight: 56, textAlignVertical: 'top', padding: 0, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  count: { color: colors.textFaint, fontSize: 11, alignSelf: 'flex-end' },
  add: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2), paddingVertical: space(4),
    borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(233,217,190,0.35)',
  },
  addText: { color: colors.primary, fontWeight: '600' },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(3.5),
    paddingHorizontal: space(4), borderRadius: radius.sm, backgroundColor: colors.card,
  },
  optionText: { color: colors.text, fontSize: 16, flex: 1 },
});
