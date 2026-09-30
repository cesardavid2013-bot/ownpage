import { Platform, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { useMatches } from '@/lib/matches';
import { useRealtime } from '@/lib/realtime';
import { colors } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName, focused: IconName) => ({ color, focused: f }: { color: ColorValue; focused: boolean }) =>
  <Ionicons name={f ? focused : name} size={26} color={color as string} />;

export default function TabsLayout() {
  const { t } = useTranslation();
  const { matches } = useMatches();
  const newLikes = useRealtime((s) => s.newLikes);
  const unread = matches?.reduce((n, m) => n + (m.unread > 0 || !m.lastMessage ? 1 : 0), 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 64 : undefined,
        },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary, fontSize: 10 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.discover'), tabBarIcon: icon('flame-outline', 'flame') }} />
      <Tabs.Screen name="likes" options={{
        title: t('tabs.likes'), tabBarIcon: icon('heart-outline', 'heart'), tabBarBadge: newLikes > 0 ? newLikes : undefined,
      }} />
      <Tabs.Screen name="chats" options={{
        title: t('tabs.chats'), tabBarIcon: icon('chatbubbles-outline', 'chatbubbles'), tabBarBadge: unread > 0 ? unread : undefined,
      }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
