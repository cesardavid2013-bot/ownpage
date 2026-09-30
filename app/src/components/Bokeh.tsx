import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const PALETTE = ['#E9BE82', '#E38B6A', '#F5D6A0', '#C8966E', '#FFECC8', '#AA7896'];

/** The brand texture: soft, out-of-focus warm city lights. Deterministic so it never flickers between renders. */
export function Bokeh({ count = 22, seed = 7, intensity = 1 }: { count?: number; seed?: number; intensity?: number }) {
  const { width, height } = useWindowDimensions();
  const lights = useMemo(() => {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: count }, (_, i) => ({
      id: `b${seed}-${i}`,
      cx: rnd() * width,
      cy: (0.02 + rnd() * 0.9) * height,
      r: (0.04 + Math.pow(rnd(), 2.2) * 0.2) * Math.max(width, height),
      color: PALETTE[Math.floor(rnd() * PALETTE.length)],
      opacity: Math.min(1, (0.18 + rnd() * 0.4) * intensity),
    }));
  }, [count, seed, width, height, intensity]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          {lights.map((l) => (
            <RadialGradient key={l.id} id={l.id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={l.color} stopOpacity={l.opacity * 0.55} />
              <Stop offset="0.7" stopColor={l.color} stopOpacity={l.opacity * 0.4} />
              <Stop offset="0.9" stopColor={l.color} stopOpacity={l.opacity * 0.7} />
              <Stop offset="1" stopColor={l.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {lights.map((l) => <Circle key={l.id} cx={l.cx} cy={l.cy} r={l.r} fill={`url(#${l.id})`} />)}
      </Svg>
    </View>
  );
}
