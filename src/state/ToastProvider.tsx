import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast, type ToastVariant } from '@/components/Toast';
import { useTheme } from '@/theme';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Milliseconds on screen. Default 2600. */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
}

type Entry = ToastOptions & { id: number };

const ToastContext = createContext<ToastContextValue | null>(null);
const MAX_VISIBLE = 2;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<Entry[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-14);

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const hide = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setEntries([]);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (!options?.message) return;
      counter.current += 1;
      const id = counter.current;
      const duration = options.duration ?? 2600;

      setEntries((current) => [...current, { ...options, id }].slice(-MAX_VISIBLE));

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      AccessibilityInfo.announceForAccessibility?.(options.message).catch?.(() => {});
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const visible = entries.length > 0;
  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 180 });
    translateY.value = withTiming(visible ? 0 : -14, { duration: 240 });
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const current = entries[entries.length - 1];
  const value = useMemo<ToastContextValue>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible && current ? (
        <Animated.View
          pointerEvents="box-none"
          accessibilityLiveRegion="polite"
          style={[styles.host, { top: insets.top + 8 }, animatedStyle]}
        >
          <Toast
            message={current.message}
            variant={current.variant ?? 'info'}
            actionLabel={current.actionLabel}
            onAction={current.onAction}
            onDismiss={() => dismiss(current.id)}
          />
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});

export type { ToastVariant };