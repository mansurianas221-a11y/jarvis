import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';
import { APP_NAME } from '@/lib/constants';

/**
 * The Jarvis brand mark: a reactor core — three nested arcs around a bright
 * nucleus, with a spark. Original artwork; deliberately distinct from any
 * existing assistant or film branding.
 */
export function JarvisMark({
  size = 96,
  primary = '#22E1FF',
  secondary = '#8B5CF6',
  accent = '#F472B6',
  glow = true,
}: {
  size?: number;
  primary?: string;
  secondary?: string;
  accent?: string;
  glow?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <SvgLinearGradient id="jarvisMark" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={primary} />
            <Stop offset="0.55" stopColor={secondary} />
            <Stop offset="1" stopColor={accent} />
          </SvgLinearGradient>
        </Defs>

        {/* Outer containment arc (open, phased) */}
        <Path
          d="M50 6 A44 44 0 1 1 12.9 71"
          stroke="url(#jarvisMark)"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
        {/* Middle arc, opposite phase */}
        <Path
          d="M50 17 A33 33 0 1 0 78.4 66.5"
          stroke="url(#jarvisMark)"
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
        {/* Inner ring */}
        <Circle cx="50" cy="50" r="20" stroke={primary} strokeWidth={1.4} fill="none" opacity={0.5} />
        <Circle
          cx="50"
          cy="50"
          r="20"
          stroke="url(#jarvisMark)"
          strokeWidth={2.6}
          fill="none"
          strokeDasharray="34 16"
          strokeLinecap="round"
        />

        {/* Nucleus */}
        <Circle cx="50" cy="50" r="9.5" fill="url(#jarvisMark)" />
        <Circle cx="50" cy="50" r="5" fill="#FFFFFF" opacity={0.92} />
        {/* Refraction spark */}
        <Circle cx="46.4" cy="46.4" r="2.1" fill="#FFFFFF" opacity={0.75} />

        {/* Orbiting nodes */}
        <G>
          <Circle cx="50" cy="6" r="3.4" fill={primary} />
          <Circle cx="12.9" cy="71" r="3" fill={accent} />
          <Circle cx="78.4" cy="66.5" r="2.6" fill={secondary} />
        </G>
      </Svg>
    </View>
  );
}

/** Mark + wordmark, used on the splash and About screens. */
export function BrandLockup({
  size = 92,
  showTagline = false,
  tagline,
}: {
  size?: number;
  showTagline?: boolean;
  tagline?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.lockup}>
      <JarvisMark size={size} primary={colors.primary} secondary={colors.secondary} accent={colors.tertiary} />
      <View style={styles.wordmark}>
        <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">
          {APP_NAME}
        </Text>
        {showTagline && tagline ? (
          <Text style={[styles.tagline, { color: colors.textMuted }]}>{tagline}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', gap: 18 },
  wordmark: { alignItems: 'center', gap: 6 },
  name: { fontSize: 34, fontWeight: '900', letterSpacing: 8, textTransform: 'uppercase' },
  tagline: { fontSize: 12.5, fontWeight: '600', letterSpacing: 0.4, textAlign: 'center', maxWidth: 280 },
});