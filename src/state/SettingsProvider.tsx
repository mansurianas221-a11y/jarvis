import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { STORAGE_KEYS } from '@/lib/constants';
import { haptics, setHapticsEnabled } from '@/lib/haptics';
import { storage } from '@/lib/storage';
import type { Settings } from '@/lib/types';

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  theme: 'dark',
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceId: null,
  autoSpeak: true,
  continuousMode: false,
  wakeWord: false,
  hapticsEnabled: true,
  shareAnalytics: false,
  onboarded: false,
  defaultTab: 'home',
  reduceMotion: false,
};

type UpdateSettings = Partial<Settings> | ((current: Settings) => Partial<Settings>);

interface SettingsContextValue {
  settings: Settings;
  /** True until persisted settings have been read from disk. */
  loading: boolean;
  update: (patch: UpdateSettings) => void;
  reset: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function mergeSettings(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object') return DEFAULT_SETTINGS;
  const s = stored as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    // Guard against corrupted values that would break the UI.
    speechRate: clampSetting(s.speechRate, 0.5, 2, DEFAULT_SETTINGS.speechRate),
    speechPitch: clampSetting(s.speechPitch, 0.5, 2, DEFAULT_SETTINGS.speechPitch),
    language: s.language === 'hi' || s.language === 'hinglish' ? s.language : 'en',
    theme: s.theme === 'light' || s.theme === 'system' ? s.theme : 'dark',
    defaultTab: s.defaultTab === 'chat' ? 'chat' : 'home',
  };
}

function clampSetting(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await storage.get<Partial<Settings>>(STORAGE_KEYS.settings);
      if (!mounted) return;
      const merged = mergeSettings(stored);
      setSettings(merged);
      setHapticsEnabled(merged.hapticsEnabled);
      setLoading(false);
      hydrated.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((patch: UpdateSettings) => {
    setSettings((current) => {
      const delta = typeof patch === 'function' ? patch(current) : patch;
      const next = { ...current, ...delta };
      if (typeof delta.hapticsEnabled === 'boolean') setHapticsEnabled(delta.hapticsEnabled);
      void storage.set(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    setHapticsEnabled(DEFAULT_SETTINGS.hapticsEnabled);
    await storage.remove(STORAGE_KEYS.settings);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, update, reset }),
    [settings, loading, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

/** Light haptic helper bound to the user preference. */
export function useHaptic() {
  const { settings } = useSettings();
  return useMemo(
    () => ({
      tap: () => (settings.hapticsEnabled ? haptics.light() : undefined),
      select: () => (settings.hapticsEnabled ? haptics.select() : undefined),
      success: () => (settings.hapticsEnabled ? haptics.success() : undefined),
      warning: () => (settings.hapticsEnabled ? haptics.warning() : undefined),
      error: () => (settings.hapticsEnabled ? haptics.error() : undefined),
      medium: () => (settings.hapticsEnabled ? haptics.medium() : undefined),
    }),
    [settings.hapticsEnabled],
  );
}