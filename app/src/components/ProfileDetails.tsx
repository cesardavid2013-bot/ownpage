import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Seal } from './Glyphs';
import { colors, font, gradients, space } from '@/lib/theme';
import type { Profile } from '@/lib/types';
import { Chip, Row } from './ui';

/** A profile read like a magazine spread: photos interleaved with the person's own words. */
export function ProfileDetails({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - space(8);
  const photos = profile.photos;
  const prompts = profile.prompts ?? [];

  const facts: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (profile.jobTitle) facts.push({ icon: 'briefcase-outline', text: [profile.jobTitle, profile.company].filter(Boolean).join(' · ') });
  if (profile.school) facts.push({ icon: 'school-outline', text: profile.school });
  if (profile.city) facts.push({ icon: 'home-outline', text: profile.city });
  if (profile.distanceKm != null) facts.push({ icon: 'location-outline', text: t('common.km', { count: profile.distanceKm }) });
  if (profile.heightCm) facts.push({ icon: 'resize-outline', text: `${profile.heightCm} cm` });

  const photo = (i: number, children?: ReactNode) => photos[i] ? (
    <View style={[styles.photo, { width: w, height: w * 1.25 }]}>
      <Image source={{ uri: photos[i].url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      {children}
    </View>
  ) : null;

  const prompt = (i: number) => prompts[i] ? (
    <View style={styles.quote}>
      <Text style={styles.label}>{t(`prompts.${prompts[i].id}`)}</Text>
      <Text style={styles.quoteText}>{prompts[i].answer}</Text>
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      {photo(0, (
        <>
          <LinearGradient colors={gradients.cardShade} locations={[0.5, 0.7, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.nameBlock}>
            <Row style={{ gap: space(2), alignItems: 'baseline' }}>
              <Text style={styles.name}>{profile.name}</Text>
              {profile.age != null ? <Text style={styles.age}>{profile.age}</Text> : null}
              {profile.isVerified ? <View style={styles.seal}><Seal size={26} /></View> : null}
            </Row>
            <Text style={styles.looking}>{t(`lookingFor.${profile.lookingFor}`)}</Text>
          </View>
        </>
      )) ?? (
        <View style={styles.nameBlockPlain}><Text style={styles.name}>{profile.name}</Text></View>
      )}

      {facts.length ? (
        <View style={styles.facts}>
          {facts.map((f) => (
            <Row key={f.icon} style={{ gap: space(3) }}>
              <Ionicons name={f.icon} size={17} color={colors.gold} />
              <Text style={styles.fact}>{f.text}</Text>
            </Row>
          ))}
        </View>
      ) : null}

      {prompt(0)}
      {photo(1)}
      {profile.bio ? (
        <View style={styles.quote}>
          <Text style={styles.label}>{t('profile.about')}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      ) : null}
      {prompt(1)}
      {photo(2)}
      {profile.interests.length > 0 || profile.languages.length > 0 ? (
        <View style={styles.quote}>
          {profile.interests.length > 0 ? (
            <View style={{ gap: space(3) }}>
              <Text style={styles.label}>{t('profile.interests')}</Text>
              <Row style={{ flexWrap: 'wrap', gap: space(2) }}>{profile.interests.map((i) => <Chip key={i} label={i} />)}</Row>
            </View>
          ) : null}
          {profile.languages.length > 0 ? (
            <View style={{ gap: space(3), marginTop: space(5) }}>
              <Text style={styles.label}>{t('profile.languages')}</Text>
              <Row style={{ flexWrap: 'wrap', gap: space(2) }}>{profile.languages.map((i) => <Chip key={i} label={i} icon="chatbubble-outline" />)}</Row>
            </View>
          ) : null}
        </View>
      ) : null}
      {prompt(2)}
      {photos.slice(3).map((_, i) => <Fragment key={i}>{photo(i + 3)}</Fragment>)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: space(4), paddingTop: space(4), gap: space(4) },
  photo: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.card, alignSelf: 'center', justifyContent: 'flex-end' },
  nameBlock: { padding: space(5), gap: space(1) },
  nameBlockPlain: { paddingVertical: space(6) },
  name: { color: '#fff', fontFamily: font.display, fontSize: 44, lineHeight: 50 },
  age: { color: 'rgba(255,255,255,0.9)', fontFamily: font.body, fontSize: 24 },
  seal: { alignSelf: 'center' },
  looking: { color: colors.primary, fontFamily: font.medium, fontSize: 13, letterSpacing: 1.6, textTransform: 'uppercase' },
  facts: { gap: space(3), paddingVertical: space(4), paddingHorizontal: space(1) },
  fact: { color: colors.text, fontFamily: font.body, fontSize: 16, flex: 1 },
  quote: { paddingVertical: space(7), paddingHorizontal: space(1), gap: space(3), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { color: colors.gold, fontFamily: font.semibold, fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase' },
  quoteText: { color: colors.text, fontFamily: font.display, fontSize: 30, lineHeight: 38 },
  bio: { color: colors.text, fontFamily: font.body, fontSize: 17, lineHeight: 26 },
});
