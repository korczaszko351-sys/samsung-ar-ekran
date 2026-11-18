import { useColorScheme } from 'react-native';

const palette = {
  light: {
    primary: '#3B6FE0',
    onPrimary: '#FFFFFF',
    background: '#F6F7FB',
    card: '#FFFFFF',
    text: '#14171F',
    muted: '#6B7280',
    border: '#E3E6EE',
    danger: '#D93F3F',
    accent: '#0EA5B7',
    overlay: 'rgba(6,10,18,0.62)',
  },
  dark: {
    primary: '#7FA3FF',
    onPrimary: '#0E1016',
    background: '#0E1016',
    card: '#181B24',
    text: '#F2F4F8',
    muted: '#9AA3B2',
    border: '#2A2F3B',
    danger: '#FF6B6B',
    accent: '#22D3EE',
    overlay: 'rgba(6,10,18,0.72)',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

/** Fixed colors of the projection layer — it must look the same in both themes. */
export const projectionColors = {
  cyan: '#22D3EE',
  cyanSoft: 'rgba(34,211,238,0.28)',
  grid: 'rgba(255,255,255,0.16)',
  bezel: 'rgba(34,211,238,0.85)',
  bezelFill: 'rgba(8,14,26,0.10)',
};
