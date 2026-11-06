import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { useTheme } from '@/theme';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

const VARIANTS: Record<ToastVariant, { icon: IconName; key: 'primary' | 'success' | 'warning' | 'danger' }> = {
  info: { icon: 'info', key: 'primary' },
  success: { icon: 'check', key: 'success' },
  warning: { icon: 'alert', key: 'warning' },
  error: { icon: 'alert', key: 'danger' },
};

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function Toast({ message, variant = 'info', actionLabel, onAction, onDismiss }: ToastProps) {
  const { colors, isDark } = useTheme();
  const config = VARIANTS[variant] ?? VARIANTS.info;
  const accent = colors[config.key];

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(160)} style={styles.host}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLabel={message}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(16,22,40,0.96)' : 'rgba(255,255,255,0.98)',
            borderColor: `${accent}55`,
            shadowColor: accent,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: `${accent}22` }]}>
          <Icon name={config.icon} size={16} color={accent} strokeWidth={2.2} />
        </View>
        <Text
          numberOfLines={3}
          style={[styles.message, { color: colors.text }]}
        >
          {message}
        </Text>
        {actionLabel && onAction ? (
          <PressableScale
            onPress={() => {
              onDismiss?.();
              onAction();
            }}
            style={styles.action}
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: accent }]}>{actionLabel}</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={onDismiss} style={styles.close} accessibilityLabel="Dismiss">
            <Icon name="close" size={16} color={colors.textMuted} />
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { width: '100%', maxWidth: 520 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  action: { paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontSize: 13, fontWeight: '800' },
  close: { padding: 4 },
});