import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import { Icon, type IconName } from './Icon';

export interface SheetAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
  destructive?: boolean;
  subtitle?: string;
}

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
  cancelLabel?: string;
}

/** Bottom sheet with blurred backdrop, drag-free but fully accessible. */
export function ActionSheet({
  visible,
  onClose,
  title,
  subtitle,
  actions,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      haptics.light();
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    }
  }, [visible, scale]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      navigationBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(160)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            {isDark ? (
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(2,4,10,0.68)' : 'rgba(10,20,40,0.35)' },
              ]}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(280).dampingRatio(0.9)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? 'rgba(14,19,36,0.98)' : 'rgba(255,255,255,0.99)',
              borderColor: colors.surfaceBorder,
              paddingBottom: Math.max(insets.bottom, 14) + 8,
            },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          {title ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? (
                <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textMuted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            {actions.map((action, index) => {
              const color = action.destructive ? colors.danger : colors.text;
              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={() => {
                    onClose();
                    // Let the sheet close before running the action's own UI.
                    setTimeout(action.onPress, 120);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: pressed
                        ? isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(20,40,90,0.05)'
                        : 'transparent',
                    },
                  ]}
                >
                  {action.icon ? (
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: action.destructive ? `${colors.danger}18` : `${colors.primary}16` },
                      ]}
                    >
                      <Icon
                        name={action.icon}
                        size={16}
                        color={action.destructive ? colors.danger : colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                  ) : null}
                  <View style={styles.actionText}>
                    <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
                    {action.subtitle ? (
                      <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
                        {action.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={[
              styles.cancel,
              { borderColor: colors.surfaceBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,40,90,0.04)' },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  header: { paddingHorizontal: 8, paddingBottom: 12, gap: 3 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, lineHeight: 18 },
  actions: { gap: 2 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    minHeight: 54,
  },
  actionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '650' },
  actionSubtitle: { fontSize: 11.5, marginTop: 1 },
  cancel: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14.5, fontWeight: '700' },
});