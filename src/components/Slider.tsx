import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { clamp } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Called once when the user lifts their finger — useful for TTS previews. */
  onChangeEnd?: (value: number) => void;
  label?: string;
  icon?: IconName;
  /** Formats the current value for display, e.g. "1.2×". */
  format?: (value: number) => string;
  /** Optional 0..1 markers rendered under the track. */
  markers?: number[];
  disabled?: boolean;
}

/**
 * A custom, gesture-driven slider. Used instead of a community package so the
 * app has no extra native dependency and the styling matches the design system
 * exactly (neon gradient track + glowing thumb).
 */
export function Slider({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  onChangeEnd,
  label,
  icon,
  format,
  markers,
  disabled,
}: SliderProps) {
  const { colors, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue((value - min) / (max - min));
  const dragging = useSharedValue(0);
  const [display, setDisplay] = useState(value);

  const safeRange = Math.max(0.0001, max - min);

  const commit = useCallback(
    (raw: number) => {
      const stepped = Math.round(raw / step) * step;
      const next = clamp(Number(stepped.toFixed(4)), min, max);
      setDisplay(next);
      onChange(next);
      return next;
    },
    [max, min, onChange, step],
  );

  const finish = useCallback(
    (raw: number) => {
      const next = commit(raw);
      onChangeEnd?.(next);
    },
    [commit, onChangeEnd],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const updateFromX = useCallback(
    (x: number, isEnd: boolean) => {
      if (trackWidth <= 0) return;
      const ratio = clamp(x / trackWidth, 0, 1);
      const raw = min + ratio * safeRange;
      progress.value = ratio;
      if (isEnd) finish(raw);
      else commit(raw);
    },
    [commit, finish, min, progress, safeRange, trackWidth],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .minDistance(0)
        .onBegin((event) => {
          dragging.value = 1;
          runOnJS(updateFromX)(event.x, false);
        })
        .onUpdate((event) => {
          runOnJS(updateFromX)(event.x, false);
        })
        .onEnd((event) => {
          dragging.value = 0;
          runOnJS(updateFromX)(event.x, true);
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [disabled, dragging, updateFromX],
  );

  // Keep the visual position in sync when `value` changes externally.
  useDerivedValue(() => {
    if (dragging.value === 1) return progress.value;
    const ratio = clamp((value - min) / safeRange, 0, 1);
    progress.value = ratio;
    return ratio;
  }, [value, min, max, dragging]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
    transform: [{ scale: dragging.value ? 1.18 : 1 }],
  }));

  const displayValue = dragging.value === 1 ? display : value;

  return (
    <View style={[styles.wrap, disabled && { opacity: 0.45 }]}>
      {label ? (
        <View style={styles.header}>
          <View style={styles.labelRow}>
            {icon ? <Icon name={icon} size={13} color={colors.textMuted} strokeWidth={2} /> : null}
            <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          </View>
          <Text style={[styles.value, { color: colors.primary }]}>
            {format ? format(displayValue) : displayValue.toFixed(2)}
          </Text>
        </View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <View
          style={styles.gestureArea}
          onLayout={onLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label ?? 'Slider'}
          accessibilityValue={{
            min: Math.round(min * 100),
            max: Math.round(max * 100),
            now: Math.round(displayValue * 100),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
            commit(displayValue + delta);
          }}
        >
          <View
            style={[
              styles.track,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,40,90,0.10)' },
            ]}
          >
            <Animated.View style={[styles.fill, fillStyle]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          {markers?.map((marker) => {
            const ratio = clamp((marker - min) / safeRange, 0, 1);
            return (
              <View
                key={marker}
                pointerEvents="none"
                style={[
                  styles.marker,
                  {
                    left: `${ratio * 100}%`,
                    backgroundColor: colors.textFaint,
                  },
                ]}
              />
            );
          })}

          <Animated.View style={[styles.thumbWrap, thumbStyle]} pointerEvents="none">
            <View
              style={[
                styles.thumb,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  value: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  // Taller hit area than the visual track, for comfortable thumb dragging.
  gestureArea: { height: 32, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  marker: { position: 'absolute', width: 2, height: 8, borderRadius: 1, top: 12 },
  thumbWrap: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});