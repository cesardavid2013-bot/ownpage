import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const GLOWS = ['#E9BE82', '#E38B6A', '#F5D6A0', '#C8966E'];

/**
 * A portrait you are not allowed to see yet: a silhouette behind frosted glass, lit by warm
 * out-of-focus lights. Used wherever membership unlocks a person (likes, Top Picks).
 */
export function Veiled({ seed = 1, style }: { seed?: number; style?: StyleProp<ViewStyle> }) {
  const glows = useMemo(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    return [0, 1].map((i) => ({
      id: `v${seed}-${i}`,
      cx: 15 + rnd() * 70,
      cy: 10 + rnd() * 60,
      r: 22 + rnd() * 22,
      color: GLOWS[Math.floor(rnd() * GLOWS.length)],
    }));
  }, [seed]);

  return (
    <View style={[styles.arch, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`g${seed}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#201C18" />
            <Stop offset="1" stopColor="#0D0D0F" />
          </LinearGradient>
          <LinearGradient id={`s${seed}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E9D9BE" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#E9D9BE" stopOpacity={0.02} />
          </LinearGradient>
          {glows.map((g) => (
            <RadialGradient key={g.id} id={g.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={g.color} stopOpacity={0.34} />
              <Stop offset="1" stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width="100" height="133" fill={`url(#g${seed})`} />
        {glows.map((g) => <Circle key={g.id} cx={g.cx} cy={g.cy} r={g.r} fill={`url(#${g.id})`} />)}
        <Ellipse cx="50" cy="60" rx="14" ry="16.5" fill={`url(#s${seed})`} />
        <Path d="M16 133C18 101 33 86 50 86C67 86 82 101 84 133Z" fill={`url(#s${seed})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  arch: {
    aspectRatio: 0.75, overflow: 'hidden', backgroundColor: '#141416',
    borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(201,164,106,0.28)',
  },
});
