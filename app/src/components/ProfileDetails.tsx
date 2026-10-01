import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, font, radius, space } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { Chip, Row } from './ui';

/** Full-profile view shared by "view profile" and "preview my profile". */
export function ProfileDetails({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520);
  const [index, setIndex] = useState(0);
  const photos = profile.photos;

  const facts: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (profile.jobTitle) facts.push({ icon: 'briefcase-outline', text: [profile.jobTitle, profile.company].filter(Boolean).join(' · ') });
  if (profile.school) facts.push({ icon: 'school-outline', text: profile.school });
  if (profile.city) facts.push({ icon: 'home-outline', text: profile.city });
  if (profile.distanceKm != null) facts.push({ icon: 'location-outline', text: t('common.km', { count: profile.distanceKm }) });
  if (profile.heightCm) facts.push({ icon: 'resize-outline', text: `${profile.heightCm} cm` });

  return (
    <View>
      <Pressable
        style={{ width: w, height: w * 1.25, alignSelf: 'center' }}
        onPress={(e) => {
          const left = e.nativeEvent.locationX < w / 3;
          setIndex((i) => (left ? Math.max(0, i - 1) : Math.min(photos.length - 1, i + 1)));
        }}
      >
        {photos[index] ? <Image source={{ uri: photos[index].url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
        {photos.length > 1 && (
          <View style={styles.bars}>
            {photos.map((p, i) => <View key={p.id} style={[styles.bar, i === index && { backgroundColor: '#fff' }]} />)}
          </View>
        )}
      </Pressable>
      <View style={styles.body}>
        <Row style={{ gap: space(2), alignItems: 'baseline' }}>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
          {profile.isVerified ? <Ionicons name="checkmark-circle" size={22} color={colors.info} /> : null}
        </Row>
        {facts.map((f) => (
          <Row key={f.icon} style={{ gap: space(2) }}>
            <Ionicons name={f.icon} size={17} color={colors.textMuted} />
            <Text style={styles.fact}>{f.text}</Text>
          </Row>
        ))}
        <View style={styles.pill}>
          <Ionicons name="search" size={15} color={colors.primary} />
          <Text style={styles.pillText}>{t(`lookingFor.${profile.lookingFor}`)}</Text>
        </View>
        {profile.bio ? (
          <View style={styles.section}>
            <Text style={styles.heading}>{t('profile.about')}</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}
        {(profile.prompts ?? []).map((p) => (
          <View key={p.id} style={styles.quote}>
            <Text style={styles.heading}>{t(`prompts.${p.id}`)}</Text>
            <Text style={styles.quoteText}>{p.answer}</Text>
          </View>
        ))}
        {profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{t('profile.interests')}</Text>
            <Row style={{ flexWrap: 'wrap', gap: space(2) }}>{profile.interests.map((i) => <Chip key={i} label={i} />)}</Row>
          </View>
        )}
        {profile.languages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>{t('profile.languages')}</Text>
            <Row style={{ flexWrap: 'wrap', gap: space(2) }}>{profile.languages.map((i) => <Chip key={i} label={i} icon="chatbubble-outline" />)}</Row>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  body: { padding: space(5), gap: space(3) },
  name: { color: colors.text, fontSize: 38, fontFamily: font.display },
  age: { color: colors.text, fontSize: 26, fontFamily: font.body },
  fact: { color: colors.textMuted, fontSize: 16, flex: 1, fontFamily: font.body },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,79,123,0.12)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
  },
  pillText: { color: colors.primary, fontFamily: font.bold },
  section: { gap: space(2), marginTop: space(2) },
  heading: { color: colors.textMuted, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1, fontFamily: font.bold },
  bio: { color: colors.text, fontSize: 16, lineHeight: 24, fontFamily: font.body },
  quote: { gap: space(2), marginTop: space(2), paddingVertical: space(5), borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  quoteText: { color: colors.text, fontFamily: font.display, fontSize: 26, lineHeight: 33 },
});
