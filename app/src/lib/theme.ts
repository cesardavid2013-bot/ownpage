import { Platform } from 'react-native';

export const colors = {
  bg: '#0B0A12',
  bgElevated: '#15131F',
  card: '#1C1929',
  cardHigh: '#262236',
  border: '#2E2A40',
  text: '#F7F5FF',
  textMuted: '#A9A3C2',
  textFaint: '#6E6888',
  primary: '#FF4F7B',
  primaryDark: '#E03A66',
  violet: '#8B5CF6',
  gold: '#F5C66B',
  goldDark: '#C8973A',
  platinum: '#D9DEE8',
  success: '#3DDC97',
  danger: '#FF5A5F',
  info: '#4CC9F0',
  overlay: 'rgba(8, 6, 16, 0.72)',
};

export const gradients = {
  brand: ['#FF7A59', '#FF4F7B', '#B24BF3'] as const,
  gold: ['#FBE3A1', '#F5C66B', '#C8973A'] as const,
  platinum: ['#F4F6FA', '#C9CFDC', '#8E96A8'] as const,
  plus: ['#FF8A80', '#FF4F7B'] as const,
  cardShade: ['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.88)'] as const,
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  display: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'Inter, system-ui, sans-serif' }),
};

export const shadow = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(0,0,0,0.35)' } as object,
  default: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
});
