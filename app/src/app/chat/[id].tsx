import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Screen';
import { Muted, webMaxWidth } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMatches } from '@/lib/matches';
import { confirm, notify } from '@/lib/notify';
import { emitTyping, useRealtime, useSocketEvent } from '@/lib/realtime';
import { colors, font, gradients, space } from '@/lib/theme';
import type { Message } from '@/lib/types';

export default function Chat() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.user)!;
  const { matches } = useMatches();
  const match = matches?.find((m) => m.id === id);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const markRead = useCallback(() => {
    api(`/matches/${id}/read`, { body: {} }).then(() => useRealtime.getState().bump()).catch(() => {});
  }, [id]);

  useEffect(() => {
    api<{ messages: Message[]; hasMore: boolean }>(`/matches/${id}/messages`)
      .then((res) => {
        setMessages(res.messages);
        setHasMore(res.hasMore);
        markRead();
      })
      .catch((e) => {
        notify(errorMessage(e));
        router.back();
      });
  }, [id, markRead]);

  useSocketEvent<Message>('message:new', useCallback((m) => {
    if (m.matchId !== id) return;
    setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
    if (m.senderId !== me.id) {
      setTyping(false);
      markRead();
    }
  }, [id, me.id, markRead]));

  useSocketEvent<{ matchId: string }>('typing', useCallback((p) => {
    if (p.matchId !== id) return;
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 3000);
  }, [id]));

  useSocketEvent<{ matchId: string }>('message:read', useCallback((p) => {
    if (p.matchId !== id) return;
    const now = new Date().toISOString();
    setMessages((list) => list?.map((m) => (m.senderId === me.id && !m.readAt ? { ...m, readAt: now } : m)) ?? list);
  }, [id, me.id]));

  useSocketEvent<{ matchId: string }>('match:removed', useCallback((p) => {
    if (p.matchId === id) router.back();
  }, [id]));

  async function loadOlder() {
    if (!hasMore || !messages?.length) return;
    const res = await api<{ messages: Message[]; hasMore: boolean }>(
      `/matches/${id}/messages?before=${encodeURIComponent(messages[0].createdAt)}`,
    ).catch(() => null);
    if (res) {
      setMessages((list) => [...res.messages, ...(list ?? [])]);
      setHasMore(res.hasMore);
    }
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await api<Message>(`/matches/${id}/messages`, { body: { body } });
      setText('');
      setMessages((list) => (list && !list.some((x) => x.id === msg.id) ? [...list, msg] : list));
      useRealtime.getState().bump();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function onChange(value: string) {
    setText(value);
    if (Date.now() - lastTypingSent.current > 2000) {
      lastTypingSent.current = Date.now();
      emitTyping(id);
    }
  }

  async function unmatch() {
    if (!match) return;
    if (!(await confirm(t('chats.unmatchConfirm', { name: match.user.name }), t('chats.unmatch'), t('common.cancel')))) return;
    try {
      await api(`/matches/${id}`, { method: 'DELETE' });
      useRealtime.getState().bump();
      router.back();
    } catch (e) {
      notify(errorMessage(e));
    }
  }

  const reversed = messages ? [...messages].reverse() : [];
  const lastMineRead = messages?.filter((m) => m.senderId === me.id).at(-1)?.readAt;
  const time = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[{ paddingHorizontal: space(4) }, webMaxWidth]}>
        <Header
          title={match?.user.name ?? ''}
          right={<Pressable onPress={unmatch} hitSlop={10} accessibilityLabel={t('chats.unmatch')}><Ionicons name="ellipsis-horizontal" size={22} color={colors.text} /></Pressable>}
        />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!messages ? <ActivityIndicator color={colors.primary} style={{ flex: 1 }} /> : (
          <FlatList
            inverted
            data={reversed}
            keyExtractor={(m) => m.id}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            contentContainerStyle={[{ padding: space(4), gap: space(1.5) }, webMaxWidth]}
            ListFooterComponent={match ? (
              <Pressable style={styles.intro} onPress={() => router.push({ pathname: '/user/[id]', params: { id: match.user.id, fromChat: '1' } })}>
                <Image source={{ uri: match.user.photos[0]?.url }} style={styles.introPhoto} />
                <Text style={styles.introName}>{match.user.name}</Text>
                <Muted>{t('chats.matchedOn', { date: new Date(match.createdAt).toLocaleDateString(i18n.language) })}</Muted>
                {messages.length === 0 ? <Muted>{t('chats.startConversation', { name: match.user.name })}</Muted> : null}
              </Pressable>
            ) : null}
            ListHeaderComponent={
              <View>
                {typing ? <Text style={styles.typing}>{t('chats.typing')}</Text> : null}
                {lastMineRead && messages.at(-1)?.senderId === me.id ? <Text style={styles.read}>{t('chats.read')}</Text> : null}
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.senderId === me.id;
              const content = (
                <>
                  <Text style={[styles.body, mine && { color: colors.onPrimary }]}>{item.body}</Text>
                  <Text style={[styles.time, mine && { color: 'rgba(22,19,14,0.55)' }]}>{time(item.createdAt)}</Text>
                </>
              );
              return (
                <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {mine ? (
                    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>{content}</LinearGradient>
                  ) : <View style={[styles.bubble, styles.theirs]}>{content}</View>}
                </View>
              );
            }}
          />
        )}
        <View style={[styles.composer, webMaxWidth]}>
          <TextInput
            value={text}
            onChangeText={onChange}
            placeholder={t('chats.placeholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            maxLength={2000}
            onSubmitEditing={Platform.OS === 'web' ? send : undefined}
            blurOnSubmit={false}
            testID="chat-input"
          />
          <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityLabel={t('common.send')} testID="chat-send">
            <LinearGradient colors={gradients.brand} style={[styles.send, { opacity: text.trim() ? 1 : 0.4 }]}>
              <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  intro: { alignItems: 'center', gap: space(2), paddingVertical: space(8) },
  introPhoto: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.card },
  introName: { color: colors.text, fontSize: 30, fontFamily: font.display },
  bubble: { maxWidth: '80%', paddingHorizontal: space(4), paddingVertical: space(2.5), borderRadius: 22 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.cardHigh, borderBottomLeftRadius: 6 },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  typing: { color: colors.textMuted, fontStyle: 'italic', marginTop: space(1) },
  read: { color: colors.textFaint, fontSize: 12, alignSelf: 'flex-end', marginTop: 2 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space(2), padding: space(3),
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  input: {
    flex: 1, color: colors.text, fontSize: 16, backgroundColor: colors.card, borderRadius: 22,
    paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(3), maxHeight: 120, minHeight: 44,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
