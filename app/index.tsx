import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { JarvisMark } from '@/components/JarvisMark';
import { DEVELOPER, APP_VERSION } from '@/lib/constants';
import { LANGUAGES, translate } from '@/lib/i18n';
import { useSettings } from '@/state';
import { useTheme } from '@/theme';

const MIN_SPLASH_MS = 1750;

/**
 * Screen 1 — Splash.
 *
 * Brand reveal: the reactor mark scales in, the wordmark tracks out, a status
 * line types underneath, then the app routes to onboarding or Home.
 */
export default function SplashRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();

  const [done, setDone] = useState(false);

  const markScale = useSharedValue(0.6);
  const markOpacity = useSharedValue(0);
  const ringRotate = useSharedValue(0);
  const barProgress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 520 });
    markScale.value = withSequence(
      withTiming(1.06, { duration: 620, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
    );
    ringRotate.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    barProgress.value = withDelay(
      420,
      withTiming(1, { duration: MIN_SPLASH_MS - 380, easing: Easing.inOut(Easing.cubic) }),
    );
    const timer = setTimeout(() => setDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [markOpacity, markScale, ringRotate, barProgress, pulse]);

  useEffect(() => {
    if (!done) return;
    router.replace(settings.onboarded ? '/(tabs)' : '/onboarding');
  }, [done, router, settings.onboarded]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));

  const haloSyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ scale: 0.92 + pulse.value * 0.14 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotate.value * 360}deg` }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(barProgress.value * 100)}%`,
  }));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.center}>
        <View style={styles.markWrap}>
          <Animated.View
            style={[
              styles.halo,
              { backgroundColor: `${colors.primary}33`, shadowColor: colors.primary },
              haloSyle,
            ]}
          />
          <Animated.View style={[styles.ringWrap, ringStyle]}>
            <View
              style={[
                styles.ring,
                { borderColor: `${colors.secondary}55`, borderTopColor: colors.primary },
              ]}
            />
          </Animated.View>
          <Animated.View style={markStyle}>
            <JarvisMark size={124} primary={colors.primary} secondary={colors.secondary} accent={colors.tertiary} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.delay(380).duration(600)} style={styles.wordmark}>
          <Text style={[styles.title, { color: colors.text }]}>JARVIS</Text>
          <View style={styles.taglineRow}>
            <View style={[styles.dash, { backgroundColor: colors.primary }]} />
            <Text style={[styles.tagline, { color: colors.textMuted }]}>
              {translate(settings.language, 'brand.tagline')}
            </Text>
            <View style={[styles.dash, { backgroundColor: colors.secondary }]} />
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        <Animated.View entering={FadeInDown.delay(720).duration(520)} style={styles.progressBlock}>
          <View style={[styles.track, { backgroundColor: colors.divider }]}>
            <Animated.View style={[styles.fill, barStyle]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={[styles.status, { color: colors.textFaint }]}>
            {translate(settings.language, 'splash.initializing')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(980).duration(600)} style={styles.credits}>
          <Text style={[styles.devLabel, { color: colors.textFaint }]}>
            {translate(settings.language, 'about.role').toUpperCase()}
          </Text>
          <Text style={[styles.devName, { color: colors.text }]}>{DEVELOPER.name}</Text>
          <View style={[styles.telegramPill, { borderColor: `${colors.primary}44`, backgroundColor: isDark ? `${colors.primary}12` : `${colors.primary}0E` }]}>
            <Text style={[styles.telegramText, { color: colors.primary }]}>
              Telegram {DEVELOPER.telegramHandle}
            </Text>
          </View>
          <Text style={[styles.version, { color: colors.textFaint }]}>
            v{APP_VERSION} · {LANGUAGES.length} languages
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40 },
  markWrap: { alignItems: 'center', justifyContent: 'center', width: 220, height: 220 },
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowOpacity: 0.8,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  ringWrap: { position: 'absolute', width: 190, height: 190 },
  ring: {
    flex: 1,
    borderRadius: 95,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  wordmark: { alignItems: 'center', gap: 12 },
  title: { fontSize: 42, fontWeight: '900', letterSpacing: 14, marginLeft: 14 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash: { width: 18, height: 1.5, borderRadius: 1 },
  tagline: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  bottom: { gap: 28 },
  progressBlock: { alignItems: 'center', gap: 12 },
  track: { width: '100%', height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  status: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' },
  credits: { alignItems: 'center', gap: 5 },
  devLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  devName: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  telegramPill: {
    marginTop: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  telegramText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  version: { fontSize: 10, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
});