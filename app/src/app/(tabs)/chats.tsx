import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Glyph } from '@/components/Glyphs';
import { Screen } from '@/components/Screen';
import { RowsSkeleton } from '@/components/Skeleton';
import { Button, Muted, Title } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useMatches } from '@/lib/matches';
import { colors, font, gradients, space } from '@/lib/theme';
import type { Match } from '@/lib/types';

const open = (m: Match) => router.push({ pathname: '/chat/[id]', params: { id: m.id } });

export default function Chats() {
  const { t } = useTranslation();
  const me = useAuth((s) => s.user)!;
  const { matches, error, reload } = useMatches();

  if (!matches) {
    return (
      <Screen edges={['top']} padded={false} style={{ justifyContent: error ? 'center' : 'flex-start', gap: space(4) }}>
        {error ? (
          <>
            <Muted style={{ textAlign: 'center' }}>{errorMessage(error)}</Muted>
            <Button title={t('common.retry')} variant="secondary" onPress={reload} />
          </>
        ) : <RowsSkeleton />}
      </Screen>
    );
  }

  const fresh = matches.filter((m) => !m.lastMessage);
  const conversations = matches.filter((m) => m.lastMessage);

  return (
    <Screen edges={['top']} padded={false}>
      <FlatList
        data={conversations}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingBottom: space(8) }}
        ListHeaderComponent={
          <View>
            <Title style={{ paddingHorizontal: space(5), paddingVertical: space(3) }}>{t('chats.title')}</Title>
            {matches.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyArch}><Glyph name="bubble" size={30} color={colors.gold} /></View>
                <Text style={styles.emptyText}>{t('chats.empty')}</Text>
                <Button title={t('tabs.discover')} variant="secondary" onPress={() => router.navigate('/')} style={{ alignSelf: 'stretch' }} />
              </View>
            ) : null}
            {fresh.length > 0 && (
              <>
                <Text style={styles.section}>{t('chats.newMatches')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freshRow}>
                  {fresh.map((m) => (
                    <Pressable key={m.id} onPress={() => open(m)} style={styles.fresh}>
                      <LinearGradient colors={gradients.brand} style={styles.freshRing}>
                        <Image source={{ uri: m.user.photos[0]?.url }} style={styles.freshPhoto} />
                      </LinearGradient>
                      <Text style={styles.freshName} numberOfLines={1}>{m.user.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            {conversations.length > 0 && <Text style={styles.section}>{t('chats.messages')}</Text>}
            {conversations.length === 0 && fresh.length > 0 ? (
              <Pressable onPress={() => open(fresh[0])} style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.85 }]} testID="chats-nudge">
                <Glyph name="spark" size={16} color={colors.gold} filled />
                <Text style={styles.nudgeText}>{t('chats.startConversation', { name: fresh[0].user.name })}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.lastMessage?.senderId === me.id;
          return (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgElevated }]}>
              <Image source={{ uri: item.user.photos[0]?.url }} style={styles.avatar} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
                <Text style={[styles.preview, item.unread > 0 && styles.previewUnread]} numberOfLines={1}>
                  {mine ? t('chats.you') : ''}{item.lastMessage?.body}
                </Text>
              </View>
              {item.unread > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{item.unread}</Text></View> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.gold, fontSize: 11, fontFamily: font.semibold, textTransform: 'uppercase', letterSpacing: 2.2,
    paddingHorizontal: space(5), marginTop: space(3), marginBottom: space(3) },
  freshRow: { paddingHorizontal: space(5), gap: space(4) },
  fresh: { alignItems: 'center', width: 84, gap: 6 },
  freshRing: { width: 80, height: 80, borderRadius: 40, padding: 3, alignItems: 'center', justifyContent: 'center' },
  freshPhoto: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: colors.bg, backgroundColor: colors.card },
  freshName: { color: colors.text, fontSize: 13, fontFamily: font.semibold },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3.5), paddingHorizontal: space(5), paddingVertical: space(3) },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.card },
  name: { color: colors.text, fontFamily: font.display, fontSize: 21 },
  preview: { color: colors.textMuted, fontSize: 15, fontFamily: font.body },
  previewUnread: { color: colors.text, fontFamily: font.semibold },
  empty: { alignItems: 'center', gap: space(5), paddingHorizontal: space(8), paddingTop: space(16) },
  emptyArch: {
    width: 96, height: 128, borderTopLeftRadius: 48, borderTopRightRadius: 48, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { color: colors.text, fontFamily: font.display, fontSize: 22, lineHeight: 30, textAlign: 'center' },
  nudge: {
    flexDirection: 'row', alignItems: 'center', gap: space(3), marginHorizontal: space(5), marginTop: space(8),
    paddingVertical: space(4), borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  nudgeText: { flex: 1, color: colors.text, fontFamily: font.display, fontSize: 20 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: colors.onPrimary, fontSize: 12, fontFamily: font.bold },
});
