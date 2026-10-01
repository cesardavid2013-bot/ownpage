import { Platform } from 'react-native';

/** Lumi — "city lights after dark": ink backgrounds, champagne accents, warm bokeh. */
export const colors = {
  bg: '#0A0A0C',
  bgElevated: '#111114',
  card: '#17171B',
  cardHigh: '#212126',
  border: '#2A2A30',
  text: '#F3EFE8',
  textMuted: '#A8A296',
  textFaint: '#6F6A61',
  primary: '#E9D9BE',
  primaryDark: '#C9A46A',
  onPrimary: '#16130E',
  violet: '#B9A3E3',
  gold: '#C9A46A',
  goldDark: '#A47C3F',
  platinum: '#D9DCE2',
  success: '#86CFA8',
  danger: '#E5746A',
  info: '#93BCE3',
  overlay: 'rgba(6, 6, 8, 0.78)',
};

export const gradients = {
  brand: ['#F4E8D2', '#E9D9BE', '#C9A46A'] as const,
  gold: ['#F1DCAA', '#C9A46A', '#A47C3F'] as const,
  platinum: ['#F7F7F5', '#CFD2D6', '#A4A9B1'] as const,
  plus: ['#4A4950', '#26262B'] as const,
  cardShade: ['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.9)'] as const,
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };
export const space = (n: number) => n * 4;

/** Bodoni for display, Jost (a Futura-style geometric) for everything else. Custom fonts carry their own weight. */
export const font = {
  display: 'BodoniModa_500Medium',
  displayItalic: 'BodoniModa_500Medium_Italic',
  body: 'Jost_400Regular',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
  bold: 'Jost_700Bold',
};

export const shadow = Platform.select({
  web: { boxShadow: '0 10px 28px rgba(0,0,0,0.35)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
});

/**
 * KeyboardAvoidingView behaviour. Android runs edge-to-edge (SDK 57), where the window is no longer
 * resized for the keyboard, so both native platforms pad; the browser handles it itself.
 */
export const keyboardBehavior = Platform.OS === 'web' ? undefined : ('padding' as const);
