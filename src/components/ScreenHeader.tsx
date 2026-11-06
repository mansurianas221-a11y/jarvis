import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Small text above the title. */
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, subtitle, eyebrow, onBack, right, style }: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      {onBack ? (
        <PressableScale onPress={onBack} style={styles.back} accessibilityLabel="Go back">
          <View style={[styles.backInner, { borderColor: colors.surfaceBorder }]}>
            <Icon name="chevronLeft" size={20} color={colors.text} />
          </View>
        </PressableScale>
      ) : null}

      <View style={styles.textCol}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.textFaint }]}>{eyebrow.toUpperCase()}</Text>
        ) : null}
        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Section label used to group settings rows. */
export function SectionHeader({
  label,
  icon,
  right,
}: {
  label: string;
  icon?: IconName;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        {icon ? <Icon name={icon} size={14} color={colors.primary} strokeWidth={2.2} /> : null}
        <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
      </View>
      {right}
    </View>
  );
}

/** Small pill badge, e.g. "Demo Mode". */
export function Badge({
  label,
  tone = 'primary',
  icon,
}: {
  label: string;
  tone?: 'primary' | 'secondary' | 'warning' | 'success' | 'danger' | 'neutral';
  icon?: IconName;
}) {
  const { colors, isDark } = useTheme();
  const color =
    tone === 'secondary'
      ? colors.secondary
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : tone === 'danger'
            ? colors.danger
            : tone === 'neutral'
              ? colors.textMuted
              : colors.primary;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isDark ? `${color}1F` : `${color}18`,
          borderColor: `${color}44`,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={11} color={color} strokeWidth={2.4} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Hairline divider that fades at the edges for a premium feel. */
export function GlowDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={['transparent', colors.divider, 'transparent']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.divider, style]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  back: { alignSelf: 'flex-start' },
  backInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 3, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },

  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: 4 },
});