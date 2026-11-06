/**
 * Jarvis — color system.
 * A single source of truth for both dark (default) and light themes.
 * Values are chosen for a futuristic neon look with accessible contrast.
 */

export type ColorScheme = 'dark' | 'light';

export interface ThemeColors {
  /** App background gradient stops, top -> bottom. */
  background: readonly [string, string, string];
  /** Elevated/glass surface tint (used with blur + opacity). */
  surface: string;
  surfaceStrong: string;
  surfaceBorder: string;
  /** Primary neon accent (cyan). */
  primary: string;
  primarySoft: string;
  /** Secondary neon accent (violet). */
  secondary: string;
  secondarySoft: string;
  /** Tertiary accent (magenta/pink). */
  tertiary: string;
  accentGradient: readonly [string, string];
  orbGradient: readonly [string, string, string];
  /** Status colours. */
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Text. */
  text: string;
  textMuted: string;
  textFaint: string;
  textOnAccent: string;
  /** Chat bubbles. */
  bubbleUser: string;
  bubbleUserBorder: string;
  bubbleAssistant: string;
  bubbleAssistantBorder: string;
  /** Misc. */
  divider: string;
  overlay: string;
  star: string;
  glow: string;
  shadow: string;
  /** Skeleton loader. */
  skeleton: string;
}

export const darkColors: ThemeColors = {
  background: ['#05060E', '#080B1C', '#04050C'],
  surface: 'rgba(20, 26, 48, 0.55)',
  surfaceStrong: 'rgba(26, 34, 62, 0.82)',
  surfaceBorder: 'rgba(120, 180, 255, 0.16)',
  primary: '#22E1FF',
  primarySoft: 'rgba(34, 225, 255, 0.16)',
  secondary: '#8B5CF6',
  secondarySoft: 'rgba(139, 92, 246, 0.18)',
  tertiary: '#F472B6',
  accentGradient: ['#22E1FF', '#8B5CF6'],
  orbGradient: ['#5FF3FF', '#22E1FF', '#8B5CF6'],
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
  info: '#60A5FA',
  text: '#F2F7FF',
  textMuted: 'rgba(226, 238, 255, 0.66)',
  textFaint: 'rgba(226, 238, 255, 0.38)',
  textOnAccent: '#04121A',
  bubbleUser: 'rgba(34, 225, 255, 0.14)',
  bubbleUserBorder: 'rgba(34, 225, 255, 0.34)',
  bubbleAssistant: 'rgba(139, 92, 246, 0.12)',
  bubbleAssistantBorder: 'rgba(139, 92, 246, 0.30)',
  divider: 'rgba(150, 190, 255, 0.12)',
  overlay: 'rgba(3, 5, 12, 0.72)',
  star: '#BFE9FF',
  glow: 'rgba(34, 225, 255, 0.55)',
  shadow: '#000000',
  skeleton: 'rgba(140, 180, 255, 0.10)',
};

export const lightColors: ThemeColors = {
  background: ['#F4F7FF', '#E9EEFB', '#DFE7F8'],
  surface: 'rgba(255, 255, 255, 0.72)',
  surfaceStrong: 'rgba(255, 255, 255, 0.92)',
  surfaceBorder: 'rgba(60, 90, 160, 0.16)',
  primary: '#0E9EC4',
  primarySoft: 'rgba(14, 158, 196, 0.14)',
  secondary: '#6D4AE0',
  secondarySoft: 'rgba(109, 74, 224, 0.14)',
  tertiary: '#D6478C',
  accentGradient: ['#0E9EC4', '#6D4AE0'],
  orbGradient: ['#7FE6FF', '#0E9EC4', '#6D4AE0'],
  success: '#0E9F6E',
  warning: '#C2790A',
  danger: '#DC2F55',
  info: '#2563EB',
  text: '#0B1020',
  textMuted: 'rgba(11, 16, 32, 0.66)',
  textFaint: 'rgba(11, 16, 32, 0.42)',
  textOnAccent: '#FFFFFF',
  bubbleUser: 'rgba(14, 158, 196, 0.14)',
  bubbleUserBorder: 'rgba(14, 158, 196, 0.32)',
  bubbleAssistant: 'rgba(109, 74, 224, 0.12)',
  bubbleAssistantBorder: 'rgba(109, 74, 224, 0.28)',
  divider: 'rgba(40, 70, 130, 0.12)',
  overlay: 'rgba(240, 244, 255, 0.72)',
  star: '#3E6FC4',
  glow: 'rgba(14, 158, 196, 0.40)',
  shadow: '#25305A',
  skeleton: 'rgba(60, 90, 160, 0.10)',
};

export const palettes = { dark: darkColors, light: lightColors } as const;
