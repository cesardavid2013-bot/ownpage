import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space } from '@/lib/theme';

/** A softly breathing placeholder in the shape of the content that is loading. */
export function Skeleton({ width = '100%', height, radius = 12, style }: {
  width?: DimensionValue; height: DimensionValue; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.9, duration: 800, useNativeDriver: false }),
      Animated.timing(v, { toValue: 0.45, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.cardHigh, opacity: v }, style]} />;
}

export function CardSkeleton() {
  return (
    <View style={{ width: '100%', maxWidth: 480, flex: 1, maxHeight: 700, padding: space(1) }}>
      <Skeleton height="100%" radius={30} />
      <View style={{ position: 'absolute', left: space(6), right: space(6), bottom: space(8), gap: space(3) }}>
        <Skeleton width="55%" height={34} radius={8} style={{ backgroundColor: colors.border }} />
        <Skeleton width="35%" height={14} radius={6} style={{ backgroundColor: colors.border }} />
      </View>
    </View>
  );
}

export function RowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ gap: space(5), padding: space(5) }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={62} height={62} radius={31} />
          <View style={{ flex: 1, gap: space(2) }}>
            <Skeleton width="40%" height={16} radius={6} />
            <Skeleton width="75%" height={12} radius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function GridSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="48%" height={220} radius={20} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3.5) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3), justifyContent: 'space-between' },
});
