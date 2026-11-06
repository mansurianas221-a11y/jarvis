import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptics helper. Every call is a no-op on web and swallows errors so that
 * haptics can never break an interaction.
 */
let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

function canRun(): boolean {
  return enabled && Platform.OS !== 'web';
}

export const haptics = {
  light() {
    if (canRun()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (canRun()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy() {
    if (canRun()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  select() {
    if (canRun()) Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (canRun())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (canRun())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error() {
    if (canRun())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
