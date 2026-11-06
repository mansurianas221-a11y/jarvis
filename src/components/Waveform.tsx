import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface WaveformProps {
  active: boolean;
  /** Width of the waveform box; height is 40% of the value. */
  size?: number;
  /** 0..1 live input level. */
  level?: number;
  mode?: 'listening' | 'speaking';
  color?: string;
  accent?: string;
  /** Number of bars. */
  bars?: number;
  reducedMotion?: boolean;
}

/**
 * A premium, mirrored bar waveform. Bars respond to the live microphone level
 * and animate on their own using staggered sine phases, which reads as
 * "audio" even when the mic reports no volume (some devices don't support it).
 */
export function Waveform({
  active,
  size = 180,
  level = 0,
  mode = 'listening',
  color = '#22E1FF',
  accent = '#8B5CF6',
  bars = 27,
  reducedMotion = false,
}: WaveformProps) {
  const height = size * 0.4;
  const width = size;
  const gap = width / bars;
  const barWidth = Math.max(2, gap * 0.42);
  const mid = height / 2;

  const energy = useSharedValue(0.2);
  const progress = useSharedValue(0);

  useEffect(() => {
    energy.value = withTiming(active ? Math.min(1, 0.3 + level * 0.9) : 0.18, {
      duration: 140,
      easing: Easing.out(Easing.quad),
    });
  }, [level, active, energy]);

  useEffect(() => {
    if (!active || reducedMotion) {
      progress.value = 0.5;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [active, progress, reducedMotion]);

  const barData = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const fromCenter = Math.abs(i - (bars - 1) / 2) / Math.max(1, (bars - 1) / 2);
        // Centre bars are taller — a classic voice-visualiser silhouette.
        const silhouette = 1 - Math.pow(fromCenter, 1.7) * 0.7;
        return {
          index: i,
          x: i * gap + (gap - barWidth) / 2,
          phase: (i / bars) * Math.PI * 4 + (i % 3) * 0.7,
          silhouette,
        };
      }),
    [bars, gap, barWidth],
  );

  return (
    <View
      style={[styles.wrap, { width, height }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        {barData.map((bar) => (
          <Bar
            key={bar.index}
            x={bar.x}
            barWidth={barWidth}
            mid={mid}
            phase={bar.phase}
            silhouette={bar.silhouette}
            index={bar.index}
            total={bars}
            energy={energy}
            progress={progress}
            active={active}
            reducedMotion={reducedMotion}
            color={color}
            accent={accent}
            mode={mode}
          />
        ))}
      </Svg>
    </View>
  );
}

function Bar({
  x,
  barWidth,
  mid,
  phase,
  silhouette,
  index,
  total,
  energy,
  progress,
  active,
  reducedMotion,
  color,
  accent,
  mode,
}: {
  x: number;
  barWidth: number;
  mid: number;
  phase: number;
  silhouette: number;
  index: number;
  total: number;
  energy: SharedValue<number>;
  progress: SharedValue<number>;
  active: boolean;
  reducedMotion: boolean;
  color: string;
  accent: string;
  mode: 'listening' | 'speaking';
}) {
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (!active || reducedMotion) return;
    wobble.value = withRepeat(
      withTiming(1, { duration: 880 + (index % 5) * 140, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(wobble);
  }, [active, wobble, index, reducedMotion]);

  const mix = index / Math.max(1, total - 1);
  const r = barWidth / 2;

  const animatedProps = useAnimatedProps(() => {
    const base = reducedMotion ? 0.55 : 0.5 + 0.5 * Math.sin(wobble.value * Math.PI * 2 + phase);
    const reactive = energy.value * silhouette;
    const amplitude = Math.max(0.05, Math.min(1, (0.18 + base * 0.55) * reactive * 1.9));
    const halfHeight = Math.max(r, (mid - 2) * amplitude);
    const top = mid - halfHeight;
    const bottom = mid + halfHeight;

    const d = `M ${x} ${top + r}
      A ${r} ${r} 0 0 1 ${x + barWidth} ${top + r}
      L ${x + barWidth} ${bottom - r}
      A ${r} ${r} 0 0 1 ${x} ${bottom - r}
      Z`;

    return {
      d,
      fill: mode === 'listening' ? color : mix > 0.5 ? accent : color,
      fillOpacity: 0.5 + amplitude * 0.5,
    };
  });

  const initialD = `M ${x} ${mid - r - 1} A ${r} ${r} 0 0 1 ${x + barWidth} ${mid - r - 1} L ${x + barWidth} ${mid + r + 1} A ${r} ${r} 0 0 1 ${x} ${mid + r + 1} Z`;

  return <AnimatedPath animatedProps={animatedProps} d={initialD} />;
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});

export { AnimatedPath };