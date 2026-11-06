import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Final scale when pressed. Default 0.96. */
  scaleTo?: number;
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'switch' | 'none';
  accessibilityState?: { disabled?: boolean; selected?: boolean; checked?: boolean };
  testID?: string;
  /** Disable the visual feedback (e.g. for swipe rows). */
  noFeedback?: boolean;
}

/**
 * Sandboxed pressable with spring scale + opacity feedback.
 * Works on iOS, Android and web.
 */
export function PressableScale({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  children,
  style,
  scaleTo = 0.96,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
  noFeedback,
}: PressableScaleProps) {
  const progress = useSharedValue(0);
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, scaleTo]) }],
    opacity: interpolate(progress.value, [0, 1], [1, 0.85]),
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          if (!noFeedback) progress.value = withSpring(1, { damping: 18, stiffness: 320 });
          onPressIn?.();
        }}
        onPressOut={() => {
          if (!noFeedback) progress.value = withSpring(0, { damping: 18, stiffness: 320 });
          onPressOut?.();
        }}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
        android_ripple={
          noFeedback ? undefined : { color: colors.primarySoft, borderless: false, radius: 18 }
        }
        hitSlop={8}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none">{children}</View>
    </Animated.View>
  );
}

/** Convenience text with the app's typographic defaults. */
export function BodyText({
  children,
  style,
  numberOfLines,
  selectable,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[{ color: colors.text, fontSize: 15, lineHeight: 22 }, style]}
    >
      {children}
    </Text>
  );
}

export { Animated, withTiming };