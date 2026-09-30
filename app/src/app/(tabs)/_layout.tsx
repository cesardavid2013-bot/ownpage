import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { TabBar } from '@/components/TabBar';
import { useMatches } from '@/lib/matches';
import { useRealtime } from '@/lib/realtime';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { matches } = useMatches();
  const newLikes = useRealtime((s) => s.newLikes);
  const unread = matches?.reduce((n, m) => n + (m.unread > 0 || !m.lastMessage ? 1 : 0), 0) ?? 0;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as Parameters<typeof TabBar>[0])} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'fade' }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.discover') }} />
      <Tabs.Screen name="likes" options={{ title: t('tabs.likes'), tabBarBadge: newLikes > 0 ? newLikes : undefined }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
