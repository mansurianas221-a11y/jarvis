import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, isDark } = useTheme();
  const accent = destructive ? colors.danger : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(2,4,10,0.78)' : 'rgba(10,20,40,0.42)' },
            ]}
          />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(220).springify().damping(18)}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(16,22,42,0.99)' : '#FFFFFF',
              borderColor: `${accent}44`,
            },
          ]}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <Icon name={icon ?? 'alert'} size={22} color={accent} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {body ? <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text> : null}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button
                label={cancelLabel}
                variant="outline"
                size="md"
                onPress={onCancel}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                size="md"
                onPress={onConfirm}
                fullWidth
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  body: { fontSize: 13.5, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});