import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Icon } from './Icon';

export interface MicButtonProps {
  /** True while the recorder is active. */
  listening: boolean;
  /** True when the assistant is busy and the control should be locked. */
  disabled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  /** 0..1 live level, drives the outer pulse ring size. */
  level?: number;
  size?: number;
  label?: string;
  hint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Push-to-talk button.
 *
 * Press and hold to speak; release to send. While held, two concentric rings
 * pulse outward and the button core subtly shifts to the "live" gradient.
 */
export function MicButton({
  listening,
  disabled,
  onPressIn,
  onPressOut,
  level = 0,
  size = 86,
  label,
  hint,
  accessibilityLabel,
  style,
}: MicButtonProps) {
  const { colors, isDark } = useTheme();
  const press = useSharedValue(0);
  const pulse = useSharedValue(0);
  const ring = useSharedValue(0);
  const levelSv = useSharedValue(0);

  useEffect(() => {
    levelSv.value = withTiming(Math.min(1, Math.max(0, level)), { duration: 120 });
  }, [level, levelSv]);

  useEffect(() => {
    press.value = withSpring(listening ? 1 : 0, { damping: 15, stiffness: 220 });
  }, [listening, press]);

  useEffect(() => {
    if (!listening) {
      pulse.value = withTiming(0, { duration: 220 });
      ring.value = withTiming(0, { duration: 220 });
      cancelAnimation(pulse);
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    ring.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(ring);
    };
  }, [listening, pulse, ring]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          interpolate(press.value, [0, 1], [1, 1.06]) +
          (listening ? levelSv.value * 0.08 : 0),
      },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.9]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.5, 1], [0.0, 0.4, 0.0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 2.3]) }],
  }));

  const idleColors = isDark
    ? ([colors.primary, colors.secondary] as const)
    : ([colors.primary, colors.secondary] as const);
  const liveColors = ['#FF7A9A', '#FF4D6D'] as const;

  return (
    <View style={[styles.wrap, style]}>
      {/* Expanding pulse rings */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: isDark ? colors.primary : colors.primary,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: colors.secondary,
          },
          ringStyle,
        ]}
      />

      <Animated.View style={[coreStyle, { width: size, height: size }]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? (listening ? 'Stop listening' : 'Hold to speak')}
          accessibilityHint={hint}
          accessibilityState={{ disabled: !!disabled, busy: listening }}
          android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: true, radius: size / 2 }}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.6)',
              opacity: disabled ? 0.45 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[...(listening ? liveColors : idleColors)]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          />
          {/* Top glass highlight */}
          <View
            style={[
              styles.highlight,
              { width: size * 0.44, height: size * 0.24, borderRadius: size * 0.12 },
            ]}
          />

          <Icon
            name={listening ? 'wave' : 'mic'}
            size={size * 0.36}
            color="#FFFFFF"
            strokeWidth={2.1}
          />
        </Pressable>
      </Animated.View>

      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  pulse: { position: 'absolute', borderWidth: 1.6 },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#22E1FF',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  highlight: {
    position: 'absolute',
    top: '16%',
    left: '20%',
    backgroundColor: 'rgba(255,255,255,0.32)',
    transform: [{ rotate: '-16deg' }],
  },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
});