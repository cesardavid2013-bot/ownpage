import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, space, font } from '@/lib/theme';

import { Glyph, type GlyphName } from './Glyphs';

export const TAB_ICONS: Record<string, GlyphName> = {
  index: 'spark',
  likes: 'heart',
  chats: 'bubble',
  profile: 'arch',
};

interface Props {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string; tabBarBadge?: number | string } }>;
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  insets: { bottom: number };
}

/** Icon-only tab bar with a champagne dot under the active tab; labels stay available to screen readers. */
export function TabBar({ state, descriptors, navigation, insets }: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space(3)) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const { options } = descriptors[route.key];
        const glyph = TAB_ICONS[route.name] ?? 'spark';
        const badge = options.tabBarBadge;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.title}
            testID={`tab-${route.name}`}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
          >
            <View>
              <Glyph name={glyph} size={25} filled={focused} color={focused ? colors.primary : colors.textFaint} />
              {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
            </View>
            <View style={[styles.dot, { opacity: focused ? 1 : 0 }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.bg, paddingTop: space(3),
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(233,217,190,0.14)',
  },
  item: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  badge: {
    position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 10, fontFamily: font.bold },
});
