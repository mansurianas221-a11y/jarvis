import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';

/** Shimmering skeleton block for loading states. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  const base = isDark ? 'rgba(140,180,255,0.09)' : 'rgba(60,90,160,0.10)';
  const sheen = isDark ? 'rgba(180,220,255,0.20)' : 'rgba(255,255,255,0.75)';

  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: base, overflow: 'hidden' },
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={['transparent', sheen, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** A chat-shaped skeleton used while history loads. */
export function ChatSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading conversation">
      {Array.from({ length: rows }).map((_, i) => {
        const isUser = i % 2 === 1;
        return (
          <View key={i} style={[styles.skeletonRow, isUser ? styles.skeletonRowUser : null]}>
            <View style={{ width: isUser ? '58%' : '72%', gap: 6 }}>
              <Skeleton height={i === 0 ? 46 : i === 1 ? 62 : 40} borderRadius={18} />
              <Skeleton width={54} height={9} borderRadius={4} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Empty-state card with an orb-like icon, title, body and optional action. */
export function EmptyState({
  icon = 'sparkles',
  title,
  body,
  action,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.empty, compact && { paddingVertical: 24 }]}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: isDark ? 'rgba(34,225,255,0.08)' : 'rgba(14,158,196,0.08)',
            borderColor: `${colors.primary}33`,
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.primary}33`, `${colors.secondary}22`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Icon name={icon} size={26} color={colors.primary} strokeWidth={1.6} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{body}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/** Inline error card with retry. */
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel = 'Retry',
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.errorCard,
        {
          backgroundColor: isDark ? 'rgba(251,113,133,0.10)' : 'rgba(220,47,85,0.07)',
          borderColor: `${colors.danger}44`,
        },
      ]}
    >
      <Icon name="alert" size={18} color={colors.danger} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>{title}</Text>
        {body ? <Text style={[styles.errorBody, { color: colors.textMuted }]}>{body}</Text> : null}
      </View>
      {onRetry ? (
        <Text
          onPress={onRetry}
          accessibilityRole="button"
          style={[styles.retry, { color: colors.danger }]}
        >
          {retryLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: 16, gap: 18 },
  skeletonRow: { alignItems: 'flex-start' },
  skeletonRowUser: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2 },
  emptyBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  emptyAction: { marginTop: 10 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorTitle: { fontSize: 13.5, fontWeight: '700' },
  errorBody: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  retry: { fontSize: 13, fontWeight: '800', paddingTop: 2 },
});