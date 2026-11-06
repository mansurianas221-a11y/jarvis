import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';
import { radius as radiusTokens } from '@/theme';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 0..1 backdrop blur strength. Default 26. */
  intensity?: number;
  /** Corner radius token or number. Default radius.lg. */
  radius?: number;
  /** Adds a subtle neon border gradient. */
  glow?: boolean;
  /** Tint colour for the top gradient sheen. */
  tint?: 'primary' | 'secondary' | 'neutral' | 'danger';
  padded?: boolean;
  /** Content is not clipped by the rounded corners (for absolutely-positioned glow). */
  noClip?: boolean;
}

/**
 * Glassmorphism surface: blur + translucent tint + hairline border + sheen.
 * On Android, blur requires API 31+; when unsupported we fall back to a
 * stronger translucent fill so contrast remains correct.
 */
export function GlassCard({
  children,
  style,
  intensity = 26,
  radius = radiusTokens.lg,
  glow = false,
  tint = 'neutral',
  padded = true,
  noClip = false,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const tintColor =
    tint === 'primary'
      ? colors.primary
      : tint === 'secondary'
        ? colors.secondary
        : tint === 'danger'
          ? colors.danger
          : isDark
            ? '#9DB8FF'
            : '#3B5BA8';

  return (
    <View
      style={[
        {
          borderRadius: radius,
          overflow: noClip ? 'visible' : 'hidden',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: colors.surfaceBorder,
          backgroundColor: isDark ? 'rgba(18,24,44,0.42)' : 'rgba(255,255,255,0.55)',
          shadowColor: isDark ? colors.primary : colors.shadow,
          shadowOpacity: isDark ? 0.14 : 0.08,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        },
        glow && {
          shadowOpacity: isDark ? 0.3 : 0.16,
          borderColor: `${tintColor}55`,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />

      {/* Tinted sheen, brighter at the top-left like light hitting glass. */}
      <LinearGradient
        colors={
          isDark
            ? [`${tintColor}22`, 'rgba(255,255,255,0.03)', 'transparent']
            : [`${tintColor}16`, 'rgba(255,255,255,0.24)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Inner top highlight line. */}
      <View
        pointerEvents="none"
        style={[
          styles.topLine,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)' },
        ]}
      />

      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16 },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
  },
});