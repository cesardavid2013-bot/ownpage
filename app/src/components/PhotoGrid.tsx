import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api, imageFormData } from '@/lib/api';
import { colors, gradients, radius, space, font } from '@/lib/theme';
import type { Me, Photo } from '@/lib/types';
import { errorMessage } from '@/i18n';
import { notify } from '@/lib/notify';
import { LinearGradient } from 'expo-linear-gradient';

const SLOTS = 9;


export function PhotoGrid({ photos, onChange }: { photos: Photo[]; onChange: (photos: Photo[]) => void }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function add() {
    if (photos.length >= SLOTS) return notify(t('profile.maxPhotos'));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const mime = asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      const photo = await api<Photo>('/me/photos', { form: await imageFormData(asset.uri, mime) });
      onChange([...photos, { id: photo.id, url: photo.url }]);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    try {
      const me = await api<Me>(`/me/photos/${id}`, { method: 'DELETE' });
      onChange(me.photos);
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  async function makeMain(id: string) {
    const ids = [id, ...photos.filter((p) => p.id !== id).map((p) => p.id)];
    try {
      const me = await api<Me>('/me/photos/order', { method: 'PUT', body: { ids } });
      onChange(me.photos);
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  return (
    <View style={styles.grid}>
      {Array.from({ length: SLOTS }).map((_, i) => {
        const photo = photos[i];
        if (photo) {
          return (
            <Pressable key={photo.id} style={styles.slot} onPress={() => i > 0 && makeMain(photo.id)} accessibilityLabel={t('profile.photosHint')}>
              <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {i === 0 ? <View style={styles.mainTag}><Ionicons name="star" size={10} color={colors.onPrimary} /></View> : null}
              <Pressable onPress={() => remove(photo.id)} style={styles.remove} hitSlop={8} accessibilityLabel={t('profile.removePhoto')}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </Pressable>
          );
        }
        const isNext = i === photos.length;
        return (
          <Pressable key={`empty-${i}`} style={[styles.slot, styles.empty]} onPress={isNext ? add : undefined}
            accessibilityRole="button" accessibilityLabel={t('onboarding.addPhoto')} testID={isNext ? 'add-photo' : undefined}>
            {isNext && uploading ? <ActivityIndicator color={colors.primary} /> : (
              <LinearGradient colors={isNext ? gradients.brand : [colors.cardHigh, colors.cardHigh]} style={styles.plus}>
                <Ionicons name="add" size={20} color={isNext ? colors.onPrimary : colors.textMuted} />
              </LinearGradient>
            )}
          </Pressable>
        );
      })}
      <Text style={styles.hint}>{t('profile.photosHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2.5) },
  slot: {
    width: '31%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border },
  plus: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  mainTag: {
    position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  hint: { color: colors.textFaint, fontSize: 12, width: '100%', fontFamily: font.body },
});
