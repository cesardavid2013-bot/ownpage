import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/lib/theme';

/** Lumi's own line glyphs, drawn on a 24-unit grid with a 1.5 hairline stroke. */
export type GlyphName = 'spark' | 'heart' | 'bubble' | 'arch';

const SPARK = 'M12 2.5C12.7 8.6 15.4 11.3 21.5 12C15.4 12.7 12.7 15.4 12 21.5C11.3 15.4 8.6 12.7 2.5 12C8.6 11.3 11.3 8.6 12 2.5Z';
const HEART = 'M12 20.2C12 20.2 3.5 15 3.5 9C3.5 6.3 5.5 4.3 8 4.3C9.8 4.3 11.2 5.3 12 6.7C12.8 5.3 14.2 4.3 16 4.3C18.5 4.3 20.5 6.3 20.5 9C20.5 15 12 20.2 12 20.2Z';
const BUBBLE = 'M4 11.2C4 7 7.6 3.8 12 3.8C16.4 3.8 20 7 20 11.2C20 15.4 16.4 18.6 12 18.6C11 18.6 10 18.4 9.1 18.1L4.6 20.2L5.7 16.3C4.6 14.9 4 13.1 4 11.2Z';
const ARCH = 'M5.5 21V10.5C5.5 6.9 8.4 4 12 4C15.6 4 18.5 6.9 18.5 10.5V21H5.5Z';
const SITTER = 'M8.6 21C8.6 18 10.1 16.2 12 16.2C13.9 16.2 15.4 18 15.4 21';

export function Glyph({ name, size = 24, color = colors.text, filled = false }: {
  name: GlyphName; size?: number; color?: string; filled?: boolean;
}) {
  const stroke = { stroke: color, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const fill = filled ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'spark' && <Path d={SPARK} fill={fill} {...stroke} />}
      {name === 'heart' && <Path d={HEART} fill={fill} {...stroke} />}
      {name === 'bubble' && <Path d={BUBBLE} fill={fill} {...stroke} />}
      {name === 'arch' && (
        <>
          <Path d={ARCH} fill={fill} {...stroke} />
          <Circle cx={12} cy={12.4} r={2.4} fill={filled ? colors.bg : 'none'} {...stroke} stroke={filled ? colors.bg : color} />
          <Path d={SITTER} fill="none" {...stroke} stroke={filled ? colors.bg : color} />
        </>
      )}
    </Svg>
  );
}

/** Verified seal: a scalloped champagne rosette with a check, used wherever Lumi vouches for someone. */
export function Seal({ size = 22 }: { size?: number }) {
  const points = 12;
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? 9.2 : 11;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${i ? 'L' : 'M'}${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Verified">
      <Path d={d} fill={colors.primary} stroke={colors.primary} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M8 12.3L10.8 15L16.2 9.4" fill="none" stroke={colors.onPrimary} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
