/** Jarvis — spacing, radius, sizing, elevation tokens. */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const sizes = {
  orb: 220,
  orbSmall: 96,
  micButton: 86,
  tabBar: 64,
  headerHeight: 56,
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;

export const duration = {
  instant: 90,
  fast: 160,
  normal: 260,
  slow: 420,
  splash: 2200,
} as const;

export const zIndex = {
  background: 0,
  content: 1,
  overlay: 5,
  toast: 100,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
