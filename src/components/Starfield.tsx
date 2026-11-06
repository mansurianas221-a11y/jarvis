import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  drift: number;
  duration: number;
  delay: number;
  tint: 'primary' | 'secondary' | 'white';
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Animated deep-space background: gradient wash, nebula blooms (drifting
 * radial-ish gradients), and a parallax starfield of twinkling dots.
 * Rendered once at the root; pointer events are disabled throughout.
 */
export function Starfield({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const stars = useMemo<Star[]>(() => {
    const rand = seededRandom(20261106);
    const count = width > 700 ? 90 : 60;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: 0.8 + rand() * 2.4,
      opacity: 0.18 + rand() * 0.62,
      drift: 0.4 + rand() * 1.6,
      duration: 2200 + rand() * 3800,
      delay: rand() * 2600,
      tint: (['white', 'primary', 'white', 'secondary'] as const)[Math.floor(rand() * 4)] ?? 'white',
    }));
  }, [width]);

  const glow = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      glow.value = 0.5;
      drift.value = 0;
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withTiming(1, { duration: 26000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(glow);
      cancelAnimation(drift);
    };
  }, [glow, drift, reducedMotion]);

  const nebulaA = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.30, 0.55]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [-18, 26]) },
      { scale: interpolate(glow.value, [0, 1], [1, 1.12]) },
    ],
  }));

  const nebulaB = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.22, 0.44]),
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [20, -30]) },
      { scale: interpolate(glow.value, [0, 1], [1.1, 0.98]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[...colors.background]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Nebula blooms */}
      <Animated.View
        style={[
          styles.nebula,
          {
            width: width * 0.95,
            height: width * 0.95,
            top: -width * 0.32,
            left: -width * 0.28,
            borderRadius: width * 0.48,
          },
          nebulaA,
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? [`${colors.primary}38`, `${colors.secondary}14`, 'transparent']
              : [`${colors.primary}22`, `${colors.secondary}10`, 'transparent']
          }
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.nebula,
          {
            width: width * 0.85,
            height: width * 0.85,
            bottom: -width * 0.34,
            right: -width * 0.26,
            borderRadius: width * 0.44,
          },
          nebulaB,
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? [`${colors.tertiary}26`, `${colors.secondary}18`, 'transparent']
              : [`${colors.tertiary}18`, `${colors.secondary}10`, 'transparent']
          }
          start={{ x: 0.9, y: 0.9 }}
          end={{ x: 0.1, y: 0.1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Starfield */}
      {stars.map((star) => (
        <StarDot
          key={star.id}
          star={star}
          color={
            star.tint === 'primary'
              ? colors.primary
              : star.tint === 'secondary'
                ? colors.secondary
                : colors.star
          }
          width={width}
          height={height}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}

function StarDot({
  star,
  color,
  width,
  height,
  reducedMotion,
}: {
  star: Star;
  color: string;
  width: number;
  height: number;
  reducedMotion: boolean;
}) {
  const twinkle = useSharedValue(star.opacity);
  const float = useSharedValue(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (reducedMotion) return;
    twinkle.value = withDelay(
      star.delay,
      withRepeat(
        withTiming(star.opacity * 0.25, { duration: star.duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    float.value = withDelay(
      star.delay,
      withRepeat(
        withTiming(1, { duration: star.duration * 2.2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => {
      mounted.current = false;
      cancelAnimation(twinkle);
      cancelAnimation(float);
    };
  }, [star.delay, star.duration, star.opacity, twinkle, float, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -star.drift * 6]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  nebula: {
    position: 'absolute',
    overflow: 'hidden',
  },
});