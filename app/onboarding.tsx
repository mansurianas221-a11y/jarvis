import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Icon, type IconName } from '@/components/Icon';
import { JarvisMark } from '@/components/JarvisMark';
import { JarvisOrb } from '@/components/JarvisOrb';
import { PressableScale } from '@/components/PressableScale';
import { Waveform } from '@/components/Waveform';
import { useToast } from '@/state';
import { useSettings } from '@/state';
import { useTheme } from '@/theme';
import { translate } from '@/lib/i18n';
import { useAssistant } from '@/state/AssistantProvider';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  key: string;
  titleKey: string;
  bodyKey: string;
  icon: IconName;
  art: 'orb' | 'wave' | 'privacy' | 'settings';
}

const SLIDES: Slide[] = [
  { key: 'meet', titleKey: 'onboarding.title1', bodyKey: 'onboarding.body1', icon: 'sparkles', art: 'orb' },
  { key: 'talk', titleKey: 'onboarding.title2', bodyKey: 'onboarding.body2', icon: 'mic', art: 'wave' },
  { key: 'private', titleKey: 'onboarding.title3', bodyKey: 'onboarding.body3', icon: 'shield', art: 'privacy' },
  { key: 'yours', titleKey: 'onboarding.title4', bodyKey: 'onboarding.body4', icon: 'sliders', art: 'settings' },
];

/**
 * Screen 2 — Onboarding.
 *
 * Four swipeable value-prop slides followed by an explicit microphone
 * permission step. Nothing is requested until the user taps "Allow", and
 * skipping is always available.
 */
export default function OnboardingRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { micPermission, requestMicPermission, openSystemSettings } = useAssistant();
  const toast = useToast();
  const { colors, isDark } = useTheme();

  const t = useCallback(
    (key: string) => translate(settings.language, key),
    [settings.language],
  );

  const [index, setIndex] = useState(0);
  const [showPermission, setShowPermission] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const progress = useSharedValue(0);

  const total = SLIDES.length + 1; // slides + permission step
  const step = showPermission ? SLIDES.length : index;

  useEffect(() => {
    progress.value = withSpring(step, { damping: 20, stiffness: 180 });
  }, [step, progress]);

  const finish = useCallback(() => {
    update({ onboarded: true });
    router.replace('/(tabs)');
  }, [router, update]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    if (page !== index) setIndex(page);
  };

  const goNext = () => {
    if (index >= SLIDES.length - 1) {
      setShowPermission(true);
      return;
    }
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
  };

  const goBack = () => {
    if (showPermission) {
      setShowPermission(false);
      return;
    }
    if (index === 0) return;
    const prev = index - 1;
    setIndex(prev);
    scrollRef.current?.scrollTo({ x: prev * SCREEN_W, animated: true });
  };

  const askForMic = async () => {
    setRequesting(true);
    const status = await requestMicPermission();
    setRequesting(false);

    if (status === 'granted') {
      toast.show({ message: t('onboarding.micGranted'), variant: 'success' });
      // Small beat so the success state is visible before navigating.
      setTimeout(finish, 420);
    } else if (status === 'denied') {
      toast.show({
        message: t('perm.deniedBody'),
        variant: 'warning',
        actionLabel: t('perm.openSettings'),
        onAction: () => void openSystemSettings(),
      });
    } else {
      toast.show({ message: t('perm.notAvailable'), variant: 'info' });
      setTimeout(finish, 500);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${((progress.value + 1) / total) * 100}%`,
  }));

  const alreadyGranted = micPermission === 'granted';

  if (showPermission) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topBar}>
          <PressableScale onPress={goBack} accessibilityLabel={t('common.back')} style={styles.backBtn}>
            <View style={[styles.backInner, { borderColor: colors.surfaceBorder }]}>
              <Icon name="chevronLeft" size={19} color={colors.text} />
            </View>
          </PressableScale>
          <View style={[styles.track, { backgroundColor: colors.divider }]}>
            <Animated.View style={[styles.fill, progressStyle]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={[styles.stepText, { color: colors.textFaint }]}>
            {SLIDES.length + 1}/{total}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.permissionScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(360)} style={styles.permissionArt}>
            <View style={styles.micHalo}>
              <View
                style={[
                  styles.micCircle,
                  { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}44` },
                ]}
              >
                <Icon name="mic" size={38} color={colors.primary} strokeWidth={1.9} />
              </View>
              <View style={[styles.micOrbit, { borderColor: `${colors.secondary}44` }]} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.permissionText}>
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              {t('onboarding.permissionTitle')}
            </Text>
            <Text style={[styles.permissionBody, { color: colors.textMuted }]}>
              {t('onboarding.permissionBody')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.permissionPoints}>
            {[
              { icon: 'mic' as IconName, text: 'Microphone — only while you hold the button' },
              { icon: 'wave' as IconName, text: 'Speech recognition — turns your voice into text' },
              { icon: 'lock' as IconName, text: 'Audio is never stored or uploaded by the app' },
            ].map((point) => (
              <View key={point.text} style={styles.point}>
                <View
                  style={[
                    styles.pointIcon,
                    { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` },
                  ]}
                >
                  <Icon name={point.icon} size={13} color={colors.primary} strokeWidth={2.1} />
                </View>
                <Text style={[styles.pointText, { color: colors.textMuted }]}>{point.text}</Text>
              </View>
            ))}
          </Animated.View>

          {alreadyGranted ? (
            <View
              style={[
                styles.grantedBanner,
                { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}44` },
              ]}
            >
              <Icon name="check" size={16} color={colors.success} strokeWidth={2.6} />
              <Text style={[styles.grantedText, { color: colors.success }]}>
                {t('onboarding.micGranted')}
              </Text>
            </View>
          ) : null}

          <GlassCard style={styles.languageCard} padded={false}>
            <View style={styles.languageInner}>
                <Text style={[styles.languageLabel, { color: colors.textFaint }]}>
                  {t('settings.language').toUpperCase()}
                </Text>
                <View style={styles.languageRow}>
                  {(['en', 'hi', 'hinglish'] as const).map((code) => {
                    const selected = settings.language === code;
                    return (
                      <PressableScale
                        key={code}
                        onPress={() => update({ language: code })}
                        style={styles.languageOption}
                        accessibilityLabel={code}
                        accessibilityState={{ selected }}
                        noFeedback
                      >
                        <View
                          style={[
                            styles.languagePill,
                            {
                              borderColor: selected ? colors.primary : colors.surfaceBorder,
                              backgroundColor: selected
                                ? `${colors.primary}18`
                                : isDark
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'rgba(255,255,255,0.6)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.languageText,
                              { color: selected ? colors.primary : colors.textMuted },
                            ]}
                          >
                            {code === 'en' ? 'English' : code === 'hi' ? 'हिन्दी' : 'Hinglish'}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </GlassCard>
        </ScrollView>

        <View style={styles.permissionActions}>
          <Button
            label={alreadyGranted ? t('common.continue') : t('onboarding.allowMic')}
            icon={alreadyGranted ? 'check' : 'mic'}
            onPress={alreadyGranted ? finish : askForMic}
            loading={requesting}
            fullWidth
            size="lg"
          />
          <Button
            label={t('onboarding.allowLater')}
            variant="ghost"
            onPress={finish}
            fullWidth
            size="md"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        {index > 0 ? (
          <PressableScale onPress={goBack} accessibilityLabel={t('common.back')} style={styles.backBtn}>
            <View style={[styles.backInner, { borderColor: colors.surfaceBorder }]}>
              <Icon name="chevronLeft" size={19} color={colors.text} />
            </View>
          </PressableScale>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={[styles.track, { backgroundColor: colors.divider }]}>
          <Animated.View style={[styles.fill, progressStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <PressableScale onPress={finish} accessibilityLabel={t('common.skip')} style={styles.skip}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('common.skip')}</Text>
        </PressableScale>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((slide, slideIndex) => (
          <View key={slide.key} style={[styles.slide, { width: SCREEN_W }]}>
            <SlideArt art={slide.art} />
            <View style={styles.slideText}>
              <View
                style={[
                  styles.slideBadge,
                  { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` },
                ]}
              >
                <Icon name={slide.icon} size={12} color={colors.primary} strokeWidth={2.2} />
                <Text style={[styles.slideBadgeText, { color: colors.primary }]}>
                  {String(slideIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
                </Text>
              </View>
              <Text style={[styles.slideTitle, { color: colors.text }]}>{t(slide.titleKey)}</Text>
              <Text style={[styles.slideBody, { color: colors.textMuted }]}>{t(slide.bodyKey)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityElementsHidden>
        {SLIDES.map((slide, dotIndex) => (
          <View
            key={slide.key}
            style={[
              styles.dot,
              {
                backgroundColor: dotIndex === index ? colors.primary : colors.divider,
                width: dotIndex === index ? 22 : 7,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={index === SLIDES.length - 1 ? t('common.continue') : t('common.next')}
          iconRight="arrowRight"
          onPress={goNext}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

function SlideArt({ art }: { art: Slide['art'] }) {
  const { colors, isDark } = useTheme();

  if (art === 'orb') {
    return (
      <View style={styles.art}>
        <JarvisOrb state="idle" size={190} reducedMotion={false} />
      </View>
    );
  }

  if (art === 'wave') {
    return (
      <View style={styles.art}>
        <View
          style={[
            styles.artCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Waveform active size={210} level={0.55} mode="listening" color={colors.primary} accent={colors.secondary} />
          <View style={styles.waveCaption}>
            <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.waveCaptionText, { color: colors.textMuted }]}>Listening</Text>
          </View>
        </View>
      </View>
    );
  }

  if (art === 'privacy') {
    return (
      <View style={styles.art}>
        <View
          style={[
            styles.artCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
              borderColor: colors.surfaceBorder,
              gap: 14,
            },
          ]}
        >
          {[
            { icon: 'shield' as IconName, label: 'On-device storage', value: 'No cloud sync' },
            { icon: 'mic' as IconName, label: 'Microphone', value: 'Foreground only' },
            { icon: 'lock' as IconName, label: 'API keys', value: 'Never in the app' },
          ].map((row) => (
            <View key={row.label} style={styles.privacyRow}>
              <View
                style={[
                  styles.privacyIcon,
                  { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` },
                ]}
              >
                <Icon name={row.icon} size={15} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.privacyLabel, { color: colors.text }]}>{row.label}</Text>
                <Text style={[styles.privacyValue, { color: colors.textMuted }]}>{row.value}</Text>
              </View>
              <Icon name="check" size={15} color={colors.success} strokeWidth={2.4} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.art}>
      <JarvisMark size={168} primary={colors.primary} secondary={colors.secondary} accent={colors.tertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: { width: 38, height: 38 },
  backInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  stepText: { fontSize: 11, fontWeight: '700', minWidth: 30, textAlign: 'right' },
  skip: { paddingHorizontal: 6, paddingVertical: 6 },
  skipText: { fontSize: 13, fontWeight: '700' },

  scrollContent: { alignItems: 'center' },
  slide: { paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', gap: 8 },
  art: { height: 300, alignItems: 'center', justifyContent: 'center', width: '100%' },
  artCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 18,
  },
  waveCaption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  waveCaptionText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 11, width: '100%' },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyLabel: { fontSize: 13.5, fontWeight: '700' },
  privacyValue: { fontSize: 11.5, marginTop: 1 },

  slideText: { gap: 12, alignItems: 'center', paddingTop: 4 },
  slideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  slideBadgeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  slideTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  slideBody: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 330 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 18 },
  dot: { height: 7, borderRadius: 4 },
  actions: { paddingHorizontal: 24, gap: 8 },
  hint: { fontSize: 10, textAlign: 'center' },

  permissionScroll: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24, gap: 22 },
  permissionArt: { alignItems: 'center' },
  micHalo: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  micCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOrbit: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  permissionText: { gap: 8, alignItems: 'center' },
  permissionTitle: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  permissionBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  permissionPoints: { gap: 10 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { fontSize: 12.5, lineHeight: 17, flex: 1 },
  grantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  grantedText: { fontSize: 13.5, fontWeight: '800' },
  languageCard: { marginTop: 2 },
  languageInner: { padding: 14, gap: 10 },
  languageLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.4 },
  languageRow: { flexDirection: 'row', gap: 8 },
  languageOption: { flex: 1 },
  languagePill: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  languageText: { fontSize: 12.5, fontWeight: '700' },
  permissionActions: { paddingHorizontal: 24, gap: 4 },
});