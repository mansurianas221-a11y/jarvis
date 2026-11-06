import React from 'react';
import { StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

/* --------------------------------- Switch -------------------------------- */

export function SettingSwitch({
  label,
  hint,
  value,
  onValueChange,
  icon,
  disabled,
  accent = 'primary',
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
  disabled?: boolean;
  accent?: 'primary' | 'secondary' | 'danger';
}) {
  const { colors } = useTheme();
  const trackColor =
    accent === 'secondary' ? colors.secondary : accent === 'danger' ? colors.danger : colors.primary;

  return (
    <View
      style={[styles.row, disabled && { opacity: 0.45 }]}
      accessible={false}
    >
      {icon ? <RowIcon name={icon} /> : null}
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        trackColor={{ false: colors.divider, true: `${trackColor}99` }}
        thumbColor={value ? trackColor : colors.textFaint}
        ios_backgroundColor={colors.divider}
      />
    </View>
  );
}

/* -------------------------------- Nav row -------------------------------- */

export function SettingRow({
  label,
  hint,
  icon,
  onPress,
  value,
  destructive,
  right,
  style,
  accessibilityHint,
}: {
  label: string;
  hint?: string;
  icon?: IconName;
  onPress?: () => void;
  value?: string;
  destructive?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const color = destructive ? colors.danger : colors.text;
  const content = (
    <>
      {icon ? <RowIcon name={icon} destructive={destructive} /> : null}
      <View style={styles.textCol}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={[styles.value, { color: colors.textMuted }]}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <Icon name="chevronRight" size={17} color={colors.textFaint} /> : null)}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;

  return (
    <PressableScale
      onPress={onPress}
      style={style}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint ?? hint}
      noFeedback
    >
      <View style={styles.row}>{content}</View>
    </PressableScale>
  );
}

function RowIcon({ name, destructive }: { name: IconName; destructive?: boolean }) {
  const { colors, isDark } = useTheme();
  const color = destructive ? colors.danger : colors.primary;
  return (
    <View
      style={[
        styles.iconWrap,
        {
          backgroundColor: isDark ? `${color}18` : `${color}14`,
          borderColor: `${color}33`,
        },
      ]}
    >
      <Icon name={name} size={16} color={color} strokeWidth={2} />
    </View>
  );
}

/* -------------------------------- Segmented ------------------------------- */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = 'primary',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: 'primary' | 'secondary';
}) {
  const { colors, isDark } = useTheme();
  const activeColor = accent === 'secondary' ? colors.secondary : colors.primary;

  return (
    <View
      style={[
        styles.segmented,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(20,40,90,0.06)',
          borderColor: colors.surfaceBorder,
        },
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            style={styles.segmentPress}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            noFeedback
          >
            <View
              style={[
                styles.segment,
                selected && {
                  backgroundColor: isDark ? `${activeColor}22` : `${activeColor}18`,
                  borderColor: `${activeColor}55`,
                },
              ]}
            >
              {option.icon ? (
                <Icon
                  name={option.icon}
                  size={14}
                  color={selected ? activeColor : colors.textFaint}
                  strokeWidth={2.1}
                />
              ) : null}
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? activeColor : colors.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  textCol: { flex: 1 },
  label: { fontSize: 14.5, fontWeight: '650', letterSpacing: 0.1 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  value: { fontSize: 13, fontWeight: '600', maxWidth: 130 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  segmentPress: { flex: 1 },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentLabel: { fontSize: 12.5, fontWeight: '700' },
});