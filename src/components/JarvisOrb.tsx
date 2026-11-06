import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import type { OrbState } from '@/lib/types';
import { Waveform } from './Waveform';

export interface JarvisOrbProps {
  state: OrbState;
  /** 0..1 microphone level while listening. */
  volume?: number;
  /** Diameter of the core orb. Default 220. */
  size?: number;
  reducedMotion?: boolean;
}

const STATE_COLORS: Record<OrbState, { core: string; mid: string; edge: string; glow: string }> = {
  idle: { core: '#7DF4FF', mid: '#22E1FF', edge: '#8B5CF6', glow: 'rgba(34,225,255,0.55)' },
  listening: { core: '#B9FFE9', mid: '#22E1FF', edge: '#38BDF8', glow: 'rgba(56,189,248,0.68)' },
  thinking: { core: '#E9D5FF', mid: '#A78BFA', edge: '#8B5CF6', glow: 'rgba(139,92,246,0.62)' },
  speaking: { core: '#C4F7FF', mid: '#5EEAD4', edge: '#22D3EE', glow: 'rgba(94,234,212,0.66)' },
  error: { core: '#FFD3DC', mid: '#FB7185', edge: '#E11D48', glow: 'rgba(251,113,133,0.55)' },
};

/**
 * The Jarvis orb.
 *
 * Layers (back to front):
 *  1. soft outer bloom          — pulsing, state-tinted
 *  2. counter-rotating halo rings — constant slow motion while idle/thinking
 *  3. reactive waveform ring     — only while listening or speaking
 *  4. glass sphere with gradient — refraction highlight + rim light
 *  5. inner core                 — breathes with state and volume
 */
export function JarvisOrb({ state, volume = 0, size = 220, reducedMotion = false }: JarvisOrbProps) {
  const { colors, isDark } = useTheme();
  const palette = STATE_COLORS[state] ?? STATE_COLORS.idle;

  const breathe = useSharedValue(0);
  const spinA = useSharedValue(0);
  const spinB = useSharedValue(0);
  const press = useSharedValue(0);
  const level = useSharedValue(0);

  // Smooth the incoming mic level so the orb never jitters.
  useEffect(() => {
    const target = Math.min(1, Math.max(0, volume));
    level.value = withTiming(target, { duration: 120, easing: Easing.out(Easing.quad) });
  }, [volume, level]);

  useEffect(() => {
    if (reducedMotion) {
      breathe.value = 0.5;
      return;
    }
    if (state === 'thinking') {
      breathe.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'listening') {
      breathe.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'speaking') {
      breathe.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'error') {
      // A quick double pulse, then settle.
      breathe.value = 0.35;
      breathe.value = withSequence(
        withTiming(0.9, { duration: 160 }),
        withTiming(0.2, { duration: 200 }),
        withTiming(0.7, { duration: 160 }),
        withTiming(0.1, { duration: 300 }),
      );
    } else {
      breathe.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    return () => cancelAnimation(breathe);
  }, [state, breathe, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const speedA = state === 'thinking' ? 3800 : state === 'listening' ? 6000 : 12000;
    const speedB = state === 'thinking' ? 2600 : state === 'listening' ? 4400 : 9000;
    spinA.value = withRepeat(withTiming(1, { duration: speedA, easing: Easing.linear }), -1, false);
    spinB.value = withRepeat(withTiming(1, { duration: speedB, easing: Easing.linear }), -1, true);
    return () => {
      cancelAnimation(spinA);
      cancelAnimation(spinB);
    };
  }, [state, spinA, spinB, reducedMotion]);

  useEffect(() => {
    press.value = withSpring(state === 'idle' ? 0 : 1, { damping: 16, stiffness: 160 });
  }, [state, press]);

  const bloomStyle = useAnimatedStyle(() => {
    const lift = state === 'listening' ? level.value * 0.18 : 0;
    return {
      opacity: interpolate(breathe.value, [0, 1], [0.42, 0.82]) + lift,
      transform: [{ scale: interpolate(breathe.value, [0, 1], [0.94, 1.06]) + lift }],
    };
  });

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${spinA.value * 360}deg` },
      { scale: interpolate(breathe.value, [0, 1], [0.99, 1.02]) },
    ],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-spinB.value * 360}deg` }],
  }));

  const coreStyle = useAnimatedStyle(() => {
    const reactive = state === 'listening' || state === 'speaking' ? level.value * 0.22 : 0;
    return {
      transform: [
        { scale: interpolate(breathe.value, [0, 1], [0.97, 1.04]) + reactive },
      ],
      opacity: interpolate(press.value, [0, 1], [0.85, 1]),
    };
  });

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 1.03]) }],
  }));

  const core = size * 0.52;
  const ringSize = size * 0.98;
  const waveSize = size * 0.78;

  const showWave = state === 'listening' || state === 'speaking';

  const gradient = useMemo(() => {
    if (!isDark) return [palette.mid, palette.edge] as const;
    return [palette.core, palette.mid, palette.edge] as const;
  }, [isDark, palette]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* 1. Outer bloom */}
      <Animated.View
        style={[
          styles.bloom,
          {
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: size * 0.7,
            backgroundColor: palette.glow,
            shadowColor: palette.glow,
            shadowRadius: size * 0.3,
          },
          bloomStyle,
        ]}
      />

      {/* 2. Halo rings */}
      <Animated.View
        style={[styles.halo, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }, ringAStyle]}
      >
        <Svg width={ringSize} height={ringSize}>
          <Defs>
            <RadialGradient id="haloA" cx="50%" cy="50%" r="50%">
              <Stop offset="0.72" stopColor={palette.mid} stopOpacity="0" />
              <Stop offset="0.94" stopColor={palette.mid} stopOpacity="0.45" />
              <Stop offset="1" stopColor={palette.edge} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringSize / 2 - 1} fill="url(#haloA)" />
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringSize / 2 - 6}
            stroke={palette.mid}
            strokeOpacity={0.22}
            strokeWidth={1}
            fill="none"
            strokeDasharray="3 9"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.halo,
          { width: size * 0.86, height: size * 0.86, borderRadius: size * 0.43 },
          ringBStyle,
        ]}
      >
        <Svg width={size * 0.86} height={size * 0.86}>
          <Circle
            cx={size * 0.43}
            cy={size * 0.43}
            r={size * 0.38}
            stroke={palette.edge}
            strokeOpacity={0.30}
            strokeWidth={1.4}
            fill="none"
            strokeDasharray="26 14"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* 3. Reactive waveform */}
      {showWave ? (
        <View style={[styles.halo, { width: waveSize, height: waveSize }]}>
          <Waveform
            active
            size={waveSize * 0.86}
            level={volume}
            mode={state === 'listening' ? 'listening' : 'speaking'}
            color={palette.core}
            accent={palette.edge}
            reducedMotion={reducedMotion}
          />
        </View>
      ) : null}

      {/* 4 + 5. Glass core */}
      <Animated.View style={[styles.coreWrap, { width: core, height: core }, wrapperStyle]}>
        <Animated.View
          style={[
            styles.core,
            {
              width: core,
              height: core,
              borderRadius: core / 2,
              shadowColor: palette.glow,
              shadowRadius: core * 0.32,
            },
            coreStyle,
          ]}
        >
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0.22, y: 0.1 }}
            end={{ x: 0.85, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: core / 2 }]}
          />

          {/* Glass refraction highlight */}
          <View
            style={[
              styles.highlight,
              {
                width: core * 0.46,
                height: core * 0.3,
                borderRadius: core * 0.24,
                top: core * 0.1,
                left: core * 0.14,
              },
            ]}
          />
          {/* Rim light */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: core / 2,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          />
          {/* Dark vignette at the bottom for depth */}
          <LinearGradient
            colors={['transparent', 'rgba(4,6,18,0.28)']}
            start={{ x: 0.5, y: 0.45 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: core / 2 }]}
          />
        </Animated.View>
      </Animated.View>

      {/* Outer containment ring */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.surfaceBorder,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 } },
  halo: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  coreWrap: { alignItems: 'center', justifyContent: 'center' },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.85,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.30)',
    transform: [{ rotate: '-18deg' }],
  },
});