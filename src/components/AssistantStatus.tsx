import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import type { OrbState } from '@/lib/types';

const MAP: Record<OrbState, { icon: IconName; key: 'primary' | 'secondary' | 'success' | 'danger' | 'textMuted' }> = {
  idle: { icon: 'sparkles', key: 'textMuted' },
  listening: { icon: 'mic', key: 'primary' },
  thinking: { icon: 'refresh', key: 'secondary' },
  speaking: { icon: 'volume', key: 'success' },
  error: { icon: 'alert', key: 'danger' },
};

/**
 * Small status pill that mirrors the orb's state in text, so the state is
 * perceivable without vision and without watching the animation.
 */
export function AssistantStatus({ state, label }: { state: OrbState; label: string }) {
  const { colors, isDark } = useTheme();
  const config = MAP[state] ?? MAP.idle;
  const color = colors[config.key];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.pill,
        {
          backgroundColor: isDark ? `${color}18` : `${color}12`,
          borderColor: `${color}44`,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <Icon name={config.icon} size={12} color={color} strokeWidth={2.2} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  text: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
});