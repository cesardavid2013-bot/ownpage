import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SafetySheet } from '@/components/SafetySheet';
import { webMaxWidth } from '@/components/ui';
import { errorMessage } from '@/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMatches } from '@/lib/matches';
import { notify } from '@/lib/notify';
import { emitTyping, useRealtime, useSocketEvent } from '@/lib/realtime';
import { colors, font, space, keyboardBehavior } from '@/lib/theme';
import type { Message } from '@/lib/types';

type Row = { kind: 'msg'; m: Message; first: boolean; last: boolean } | { kind: 'day'; key: string; label: string };

const dayKey = (iso: string) => new Date(iso).toDateString();

export default function Chat() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.user)!;
  const { matches } = useMatches();
  const match = matches?.find((m) => m.id === id);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [receipts, setReceipts] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);
  const connected = useRealtime((s) => s.connected);
  const [offline, setOffline] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const input = useRef<TextInput>(null);

  const markRead = useCallback(() => {
    api(`/matches/${id}/read`, { body: {} }).then(() => useRealtime.getState().bump()).catch(() => {});
  }, [id]);

  /** Inserts or updates by server id, or replaces the optimistic copy with the same client id. */
  const upsert = useCallback((m: Message) => {
    setMessages((list) => {
      if (!list) return list;
      let i = list.findIndex((x) => x.id === m.id);
      if (i === -1 && m.clientId) i = list.findIndex((x) => x.clientId === m.clientId);
      if (i === -1) return [...list, m].sort((a, b) => (a.status ? 1 : 0) - (b.status ? 1 : 0) || a.createdAt.localeCompare(b.createdAt));
      const next = list.slice();
      next[i] = { ...next[i], ...m, status: m.status };
      return next;
    });
  }, []);

  const loadLatest = useCallback(async (initial: boolean) => {
    try {
      const res = await api<{ messages: Message[]; hasMore: boolean; readReceipts?: boolean }>(`/matches/${id}/messages`);
      setReceipts(!!res.readReceipts);
      if (initial) {
        setMessages(res.messages);
        setHasMore(res.hasMore);
      } else {
        res.messages.forEach(upsert);
      }
      markRead();
    } catch (e) {
      if (initial) {
        notify(errorMessage(e));
        router.back();
      }
    }
  }, [id, markRead, upsert]);

  useEffect(() => { loadLatest(true); }, [loadLatest]);

  // After a dropped connection, fetch what arrived meanwhile; upsert keeps it free of duplicates.
  const wasConnected = useRef(connected);
  useEffect(() => {
    if (connected && !wasConnected.current && messages) loadLatest(false);
    wasConnected.current = connected;
    // Only claim "reconnecting" if the connection stays down for a moment.
    if (connected) { setOffline(false); return; }
    const timer = setTimeout(() => setOffline(true), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useSocketEvent<Message>('message:new', useCallback((m) => {
    if (m.matchId !== id) return;
    upsert(m);
    if (m.senderId !== me.id) {
      setTyping(false);
      markRead();
    }
  }, [id, me.id, markRead, upsert]));

  useSocketEvent<Message>('message:liked', useCallback((m) => {
    if (m.matchId === id) upsert(m);
  }, [id, upsert]));

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

  async function deliver(draft: Message) {
    upsert({ ...draft, status: 'sending' });
    try {
      const msg = await api<Message>(`/matches/${id}/messages`, { body: { body: draft.body, clientId: draft.clientId } });
      upsert({ ...msg, status: undefined });
      useRealtime.getState().bump();
    } catch (e) {
      upsert({ ...draft, status: 'failed' });
      const code = (e as { code?: string }).code;
      if (code && code !== 'network_error') notify(errorMessage(e));
    }
  }

  function send(body = text.trim()) {
    if (!body) return;
    setText('');
    const clientId = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    deliver({
      id: `local-${clientId}`, clientId, matchId: id, senderId: me.id, body,
      createdAt: new Date().toISOString(), readAt: null, status: 'sending',
    });
  }

  async function toggleHeart(m: Message) {
    if (m.senderId === me.id || m.status) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    upsert({ ...m, likedAt: m.likedAt ? null : new Date().toISOString() });
    try {
      upsert(await api<Message>(`/matches/${id}/messages/${m.id}/like`, { body: {} }));
    } catch {
      upsert(m);
    }
  }

  function onBubblePress(m: Message) {
    if (m.status === 'failed') { deliver(m); return; }
    const now = Date.now();
    if (lastTap.current && lastTap.current.id === m.id && now - lastTap.current.at < 320) {
      lastTap.current = null;
      toggleHeart(m);
    } else {
      lastTap.current = { id: m.id, at: now };
    }
  }

  function onChange(value: string) {
    setText(value);
    if (Date.now() - lastTypingSent.current > 2000) {
      lastTypingSent.current = Date.now();
      emitTyping(id);
    }
  }

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/chats'));

  const time = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const dayLabel = useCallback((iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) return t('chats.today');
    if (d.toDateString() === yest.toDateString()) return t('chats.yesterday');
    return d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  }, [t, i18n.language]);

  // Rows for an inverted list: newest first, with a day separator after each day's oldest message.
  const rows = useMemo<Row[]>(() => {
    if (!messages) return [];
    const out: Row[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const newer = messages[i + 1];
      const older = messages[i - 1];
      const sameAsNewer = newer && newer.senderId === m.senderId && dayKey(newer.createdAt) === dayKey(m.createdAt);
      const sameAsOlder = older && older.senderId === m.senderId && dayKey(older.createdAt) === dayKey(m.createdAt);
      out.push({ kind: 'msg', m, first: !sameAsOlder, last: !sameAsNewer });
      if (!older || dayKey(older.createdAt) !== dayKey(m.createdAt)) {
        out.push({ kind: 'day', key: `day-${dayKey(m.createdAt)}`, label: dayLabel(m.createdAt) });
      }
    }
    return out;
  }, [messages, dayLabel]);

  const lastMine = messages?.filter((m) => m.senderId === me.id).at(-1);
  const iSaidSomething = !!messages?.some((m) => m.senderId === me.id);
  const icebreakers = useMemo(() => {
    const fromPrompts = (match?.user.prompts ?? []).slice(0, 2).map((p) => t('chats.iceAbout', { prompt: t(`prompts.${p.id}`) }));
    return [...fromPrompts, t('chats.ice1'), t('chats.ice2'), t('chats.ice3')].slice(0, 4);
  }, [match, t]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.header, webMaxWidth]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/chats'))} hitSlop={12} accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Pressable style={styles.who} onPress={() => match && router.push({ pathname: '/user/[id]', params: { id: match.user.id, fromChat: '1' } })}>
          <View style={styles.avatar}>{match?.user.photos[0] ? <Image source={{ uri: match.user.photos[0].thumb }} style={StyleSheet.absoluteFill} /> : null}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{match?.user.name ?? ''}</Text>
            <Text style={[styles.status, offline && { color: colors.textMuted }]} numberOfLines={1}>
              {offline ? t('chatState.reconnecting') : typing ? t('chats.typing') : match?.user.recentlyActive ? t('discover.recentlyActive') : ' '}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={10} accessibilityLabel={t('safetyMenu.unmatch')} testID="chat-menu">
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={keyboardBehavior}>
        {!messages ? <ActivityIndicator color={colors.primary} style={{ flex: 1 }} /> : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => (r.kind === 'msg' ? r.m.id : r.key)}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            contentContainerStyle={[{ paddingHorizontal: space(4), paddingVertical: space(3) }, webMaxWidth]}
            ListHeaderComponent={
              receipts && lastMine?.readAt && messages.at(-1)?.senderId === me.id
                ? <Text style={styles.read}>{t('chats.read')} · {time(lastMine.readAt)}</Text> : null
            }
            ListFooterComponent={match ? (
              <View style={styles.intro}>
                <View style={styles.introArch}>{match.user.photos[0] ? <Image source={{ uri: match.user.photos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                <Text style={styles.introName}>{match.user.name}</Text>
                <Text style={styles.introSub}>{t('chats.matchedOn', { date: new Date(match.createdAt).toLocaleDateString(i18n.language) })}</Text>
              </View>
            ) : null}
            renderItem={({ item }) => {
              if (item.kind === 'day') return <Text style={styles.day}>{item.label}</Text>;
              const { m, first, last } = item;
              const mine = m.senderId === me.id;
              return (
                <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginTop: first ? space(3) : 3 }}>
                  <Pressable
                    onPress={() => onBubblePress(m)}
                    onLongPress={() => toggleHeart(m)}
                    accessibilityHint={m.status === 'failed' ? t('chatState.failed') : undefined}
                    style={[styles.bubble, mine ? styles.mine : styles.theirs, m.status === 'sending' && { opacity: 0.6 },
                      m.status === 'failed' && styles.failed,
                      mine ? { borderBottomRightRadius: last ? 6 : 22, borderTopRightRadius: first ? 22 : 6 }
                        : { borderBottomLeftRadius: last ? 6 : 22, borderTopLeftRadius: first ? 22 : 6 }]}
                  >
                    <Text style={[styles.body, mine && m.status !== 'failed' && { color: colors.onPrimary }]}>{m.body}</Text>
                    {m.likedAt ? (
                      <View style={[styles.heart, mine ? { left: -8 } : { right: -8 }]}>
                        <Ionicons name="heart" size={11} color={colors.onPrimary} />
                      </View>
                    ) : null}
                  </Pressable>
                  {m.status === 'failed' ? <Text style={[styles.time, { color: colors.danger }]} testID="msg-failed">{t('chatState.failed')}</Text>
                    : m.status === 'sending' ? (last ? <Text style={styles.time}>{t('chatState.sending')}</Text> : null)
                    : last ? <Text style={styles.time}>{time(m.createdAt)}</Text> : null}
                </View>
              );
            }}
          />
        )}

        {messages && !iSaidSomething ? (
          <View style={[styles.ice, webMaxWidth]}>
            <Text style={styles.iceTitle}>{t('chats.icebreakers')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingRight: space(4) }}>
              {icebreakers.map((s) => (
                <Pressable key={s} style={styles.iceChip} onPress={() => { setText(s); input.current?.focus(); }}>
                  <Text style={styles.iceText} numberOfLines={2}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.composer, webMaxWidth]}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={onChange}
            placeholder={t('chats.placeholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            maxLength={2000}
            onSubmitEditing={Platform.OS === 'web' ? () => send() : undefined}
            blurOnSubmit={false}
            testID="chat-input"
          />
          <Pressable onPress={() => send()} disabled={!text.trim()} accessibilityLabel={t('common.send')} testID="chat-send"
            style={[styles.send, { opacity: text.trim() ? 1 : 0.35 }]}>
            <Ionicons name="arrow-up" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {match ? (
        <SafetySheet
          visible={menu}
          onClose={() => setMenu(false)}
          person={{ id: match.user.id, name: match.user.name }}
          matchId={match.id}
          onViewProfile={() => router.push({ pathname: '/user/[id]', params: { id: match.user.id, fromChat: '1' } })}
          onDone={leave}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space(3), paddingHorizontal: space(4), paddingVertical: space(2.5),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(3) },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card },
  name: { color: colors.text, fontFamily: font.display, fontSize: 21, lineHeight: 24 },
  status: { color: colors.gold, fontFamily: font.body, fontSize: 12 },
  intro: { alignItems: 'center', gap: space(2), paddingTop: space(10), paddingBottom: space(6) },
  introArch: { width: 120, height: 156, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, overflow: 'hidden', backgroundColor: colors.card, marginBottom: space(2) },
  introName: { color: colors.text, fontFamily: font.display, fontSize: 32 },
  introSub: { color: colors.textMuted, fontFamily: font.body, fontSize: 13 },
  day: { alignSelf: 'center', color: colors.gold, fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', marginTop: space(6), marginBottom: space(2) },
  bubble: { maxWidth: '80%', paddingHorizontal: space(4), paddingVertical: space(2.5), borderRadius: 22 },
  mine: { backgroundColor: colors.primary },
  failed: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  theirs: { backgroundColor: colors.cardHigh },
  body: { color: colors.text, fontFamily: font.body, fontSize: 16, lineHeight: 22, ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null) },
  heart: {
    position: 'absolute', bottom: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg,
  },
  time: { color: colors.textFaint, fontFamily: font.body, fontSize: 10.5, marginTop: 4, marginHorizontal: 6 },
  read: { color: colors.textFaint, fontFamily: font.body, fontSize: 11, alignSelf: 'flex-end', marginTop: 4, marginRight: 6 },
  ice: { paddingLeft: space(4), paddingBottom: space(2), gap: space(2) },
  iceTitle: { color: colors.gold, fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' },
  iceChip: { maxWidth: 240, paddingHorizontal: space(4), paddingVertical: space(3), borderRadius: 18, borderWidth: 1, borderColor: 'rgba(233,217,190,0.22)' },
  iceText: { color: colors.text, fontFamily: font.body, fontSize: 14, lineHeight: 19 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space(2), paddingHorizontal: space(3), paddingVertical: space(2.5) },
  input: {
    flex: 1, color: colors.text, fontFamily: font.body, fontSize: 16, backgroundColor: colors.card, borderRadius: 24,
    paddingHorizontal: space(4), paddingTop: space(3), paddingBottom: space(3), maxHeight: 120, minHeight: 46,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
