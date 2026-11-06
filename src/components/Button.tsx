import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable, type PressableProps } from 'react-native';

import { useTheme } from '@/theme';
import { radius } from '@/theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'telegram';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Stretch an icon-only button into a perfect circle. */
  compact?: boolean;
}

const HEIGHTS: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
const FONT: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  style,
  disabled,
  compact = false,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(0);
  const height = HEIGHTS[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - scale.value * 0.035 }],
  }));

  const fg = (() => {
    switch (variant) {
      case 'primary':
        return colors.textOnAccent;
      case 'secondary':
        return isDark ? '#04121A' : '#FFFFFF';
      case 'danger':
        return '#FFFFFF';
      case 'telegram':
        return '#FFFFFF';
      case 'outline':
        return colors.text;
      default:
        return colors.text;
    }
  })();

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={fg} strokeWidth={2} /> : null}
          {compact ? null : (
            <Text
              numberOfLines={1}
              style={[styles.label, { color: fg, fontSize: FONT[size] }]}
            >
              {label}
            </Text>
          )}
          {iconRight ? <Icon name={iconRight} size={18} color={fg} strokeWidth={2} /> : null}
        </>
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        animatedStyle,
        fullWidth && styles.fullWidth,
        compact && { width: height, height },
        style,
      ]}
    >
      <Pressable
        {...rest}
        onPress={onPress}
        onPressIn={(e) => {
          scale.value = withSpring(1, { damping: 16, stiffness: 380 });
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(0, { damping: 16, stiffness: 380 });
          rest.onPressOut?.(e);
        }}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
        android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
        style={[
          styles.base,
          {
            height,
            borderRadius: compact ? height / 2 : radius.md,
            paddingHorizontal: compact ? 0 : size === 'sm' ? 14 : 20,
          },
          variant === 'primary' && { backgroundColor: colors.primary },
          variant === 'secondary' && { backgroundColor: colors.secondary },
          variant === 'danger' && { backgroundColor: colors.danger },
          variant === 'outline' && {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
          },
          variant === 'ghost' && { backgroundColor: 'transparent' },
          { opacity: disabled ? 0.45 : 1 },
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {variant === 'telegram' ? (
          <LinearGradient
            colors={['#2AABEE', '#229ED9', '#1E96CF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[styles.row, { gap: icon || iconRight ? 8 : 0 }]}>{inner}</View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '800', letterSpacing: 0.2 },
  fullWidth: { alignSelf: 'stretch', width: '100%' },
});