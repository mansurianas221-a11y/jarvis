import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type ColorScheme, type ThemeColors } from './colors';
import type { ThemeMode } from '@/lib/types';

export interface Theme {
  /** Resolved scheme actually in use ('dark' | 'light'). */
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
}

interface ThemeProviderProps {
  /** User preference; 'system' follows the OS. */
  mode?: ThemeMode;
  children: React.ReactNode;
}

const ThemeContext = createContext<Theme>({
  scheme: 'dark',
  isDark: true,
  colors: palettes.dark,
});

export function ThemeProvider({ mode = 'system', children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();

  const theme = useMemo<Theme>(() => {
    const scheme: ColorScheme =
      mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;
    return { scheme, isDark: scheme === 'dark', colors: palettes[scheme] };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Helper for building memoised, theme-aware StyleSheets.
 * Usage:
 *   const styles = useThemedStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}

export { type ColorScheme, type ThemeColors };
