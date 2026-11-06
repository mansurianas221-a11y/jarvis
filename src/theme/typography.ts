import type { TextStyle } from 'react-native';

/** Jarvis — typographic scale. Uses platform system fonts with graceful fallbacks. */
export const fontFamily = {
  regular: undefined as string | undefined,
  medium: undefined as string | undefined,
  semiBold: undefined as string | undefined,
  bold: undefined as string | undefined,
  mono: undefined as string | undefined,
};

type Variant = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'>;

export const typography: Record<
  'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'caption' | 'overline' | 'mono',
  Variant
> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0.1 },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: 0.1 },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '500', letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.6 },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.4 },
};
