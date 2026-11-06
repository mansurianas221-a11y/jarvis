import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AssistantStatus } from '@/components/AssistantStatus';
import { Badge } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Icon } from '@/components/Icon';
import { JarvisMark } from '@/components/JarvisMark';
import { JarvisOrb } from '@/components/JarvisOrb';
import { MicButton } from '@/components/MicButton';
import { PressableScale } from '@/components/PressableScale';
import { QuickCommandChips } from '@/components/QuickCommandChips';
import { Waveform } from '@/components/Waveform';
import { translate } from '@/lib/i18n';
import { DEVELOPER } from '@/lib/constants';
import { useAssistant } from '@/state/AssistantProvider';
import { useConversations } from '@/state/ConversationsProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useTheme } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Screen 3 — Home.
 *
 * The command centre: reactive orb, push-to-talk mic, live transcript,
 * last reply preview and quick command chips.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const {
    orbState,
    transcript,
    volume,
    isListening,
    isSpeaking,
    isMuted,
    busy,
    demoMode,
    speechAvailable,
    error,
    startListening,
    stopListening,
    cancelListening,
    stopResponse,
    stopSpeaking,
    sendPrompt,
    toggleMute,
  } = useAssistant();
  const { active, conversations } = useConversations();

  const t = useCallback(
    (key: string) => translate(settings.language, key),
    [settings.language],
  );

  const orbSize = Math.min(SCREEN_W * 0.56, 236);
  const holdRef = useRef<{ startedAt: number; active: boolean }>({ startedAt: 0, active: false });
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('home.greeting.night');
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 17) return t('home.greeting.afternoon');
    if (hour < 21) return t('home.greeting.evening');
    return t('home.greeting.night');
  }, [t]);

  const statusLabel = useMemo(() => {
    switch (orbState) {
      case 'listening':
        return t('home.listening');
      case 'thinking':
        return t('home.thinking');
      case 'speaking':
        return t('home.speaking');
      case 'error':
        return t('common.somethingWrong');
      default:
        return t('home.tapToTalk');
    }
  }, [orbState, t]);

  const lastAssistant = useMemo(
    () => [...(active?.messages ?? [])].reverse().find((m) => m.role === 'assistant' && m.content),
    [active?.messages],
  );

  // Tap-to-toggle: press in starts listening; press out sends.
  const handlePressIn = useCallback(() => {
    if (busy || isSpeaking) {
      // Interrupt speech instead of starting a new capture.
      void stopSpeaking();
      return;
    }
    holdRef.current = { startedAt: Date.now(), active: true };
    setScrollEnabled(false);
    void startListening();
  }, [busy, isSpeaking, startListening, stopSpeaking]);

  const handlePressOut = useCallback(() => {
    setScrollEnabled(true);
    const held = Date.now() - holdRef.current.startedAt;
    holdRef.current.active = false;

    if (isListening) {
      if (held < 320) {
        // Very short tap: keep listening so the user can speak a sentence.
        return;
      }
      stopListening();
    }
  }, [isListening, stopListening]);

  const orbPress = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (isSpeaking) {
      void stopSpeaking();
    } else if (busy) {
      stopResponse();
    } else {
      void startListening();
    }
  }, [busy, isListening, isSpeaking, startListening, stopListening, stopSpeaking, stopResponse]);

  // A gentle indeterminate sweep under the orb while thinking.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (orbState === 'thinking') {
      sweep.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      );
    } else {
      sweep.value = 0;
    }
  }, [orbState, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sweep.value * 220 },
      { rotate: '-14deg' },
    ],
    opacity: orbState === 'thinking' ? 0.55 : 0,
  }));

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <JarvisMark size={34} primary={colors.primary} secondary={colors.secondary} accent={colors.tertiary} />
          <View>
            <Text style={[styles.brand, { color: colors.text }]}>JARVIS</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      orbState === 'error'
                        ? colors.danger
                        : orbState === 'idle'
                          ? colors.success
                          : colors.primary,
                  },
                ]}
              />
              <Text style={[styles.brandStatus, { color: colors.textFaint }]}>
                {orbState === 'idle' ? 'ONLINE' : orbState.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {demoMode ? <Badge label={t('home.demoMode')} tone="warning" icon="info" /> : null}
          <PressableScale
            onPress={toggleMute}
            accessibilityLabel={isMuted ? 'Unmute replies' : 'Mute replies'}
            accessibilityState={{ checked: isMuted }}
            style={styles.iconBtn}
          >
            <View
              style={[
                styles.iconBtnInner,
                { borderColor: colors.surfaceBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)' },
              ]}
            >
              <Icon
                name={isMuted ? 'volumeOff' : 'volume'}
                size={17}
                color={isMuted ? colors.danger : colors.textMuted}
                strokeWidth={2}
              />
            </View>
          </PressableScale>
        </View>
      </View>

      <Animated.ScrollView
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 108 + Math.max(insets.bottom, 10) },
        ]}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.duration(420)} style={styles.greetingBlock}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('home.subtitle')}</Text>
        </Animated.View>

        {/* Orb */}
        <View style={styles.orbArea}>
          <JarvisOrb
            state={orbState}
            volume={volume}
            size={orbSize}
            reducedMotion={settings.reduceMotion}
          />

          {orbState === 'thinking' ? (
            <View style={styles.sweepHost} pointerEvents="none">
              <Animated.View style={[styles.sweep, sweepStyle]}>
                <LinearGradient
                  colors={['transparent', `${colors.primary}55`, 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>
          ) : null}
        </View>

        <AssistantStatus state={orbState} label={statusLabel} />

        {/* Live transcript / last reply */}
        <View style={styles.captionArea}>
          {isListening ? (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={styles.transcriptBlock}>
              <Text numberOfLines={3} style={[styles.transcript, { color: colors.text }]}>
                {transcript || t('home.listening')}
              </Text>
              <Waveform
                active
                size={Math.min(SCREEN_W - 96, 260)}
                level={volume}
                mode="listening"
                color={colors.primary}
                accent={colors.secondary}
                bars={23}
                reducedMotion={settings.reduceMotion}
              />
            </Animated.View>
          ) : lastAssistant ? (
            <Animated.View
              entering={FadeInDown.duration(260)}
              style={[
                styles.lastReply,
                {
                  backgroundColor: isDark ? 'rgba(139,92,246,0.10)' : 'rgba(109,74,224,0.07)',
                  borderColor: colors.bubbleAssistantBorder,
                },
              ]}
            >
              <View style={styles.lastReplyHeader}>
                <Icon name="bot" size={12} color={colors.secondary} strokeWidth={2} />
                <Text style={[styles.lastReplyLabel, { color: colors.textFaint }]}>
                  {t('tab.chat').toUpperCase()}
                </Text>
                {lastAssistant.demo ? (
                  <Text style={[styles.demoTag, { color: colors.warning }]}>DEMO</Text>
                ) : null}
              </View>
              <Text numberOfLines={3} style={[styles.lastReplyText, { color: colors.textMuted }]}>
                {lastAssistant.content}
              </Text>
              <PressableScale
                onPress={() => router.push('/(tabs)/chat')}
                accessibilityLabel={t('chat.title')}
                style={styles.openChat}
                noFeedback
              >
                <Text style={[styles.openChatText, { color: colors.primary }]}>
                  {t('chat.title')}
                </Text>
                <Icon name="chevronRight" size={12} color={colors.primary} strokeWidth={2.4} />
              </PressableScale>
            </Animated.View>
          ) : (
            <Text style={[styles.hint, { color: colors.textFaint }]}>
              {speechAvailable ? t('home.holdToTalk') : t('perm.speechBody')}
            </Text>
          )}
        </View>

        {/* Mic control */}
        <View style={styles.micArea}>
          <MicButton
            listening={isListening}
            disabled={busy && !isListening}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            level={volume}
            size={82}
            accessibilityLabel={isListening ? t('home.releaseToSend') : t('home.holdToTalk')}
            hint={t('home.holdToTalk')}
          />

          <View style={styles.secondaryRow}>
            {isListening ? (
              <Button
                label={t('common.cancel')}
                variant="ghost"
                size="sm"
                icon="close"
                onPress={cancelListening}
              />
            ) : busy ? (
              <Button label={t('chat.stop')} variant="ghost" size="sm" icon="stop" onPress={stopResponse} />
            ) : isSpeaking ? (
              <Button
                label={t('home.stopSpeaking')}
                variant="ghost"
                size="sm"
                icon="volumeOff"
                onPress={() => void stopSpeaking()}
              />
            ) : (
              <PressableScale
                onPress={orbPress}
                accessibilityLabel={t('home.tapToTalk')}
                noFeedback
              >
                <Text style={[styles.orbHint, { color: colors.textFaint }]}>{t('home.tapToTalk')}</Text>
              </PressableScale>
            )}
          </View>
        </View>

        {/* Error banner */}
        {error ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.errorBanner,
              { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}44` },
            ]}
            accessibilityRole="alert"
          >
            <Icon name="alert" size={15} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.errorText, { color: colors.text }]}>{error.message}</Text>
          </Animated.View>
        ) : null}

        {/* Quick commands */}
        <View style={styles.quickArea}>
          <QuickCommandChips
            language={settings.language}
            onSelect={(prompt) => void sendPrompt(prompt)}
            disabled={busy || isListening}
          />
        </View>

        {/* Recent conversations */}
        {conversations.length > 0 ? (
          <View style={styles.recentArea}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentLabel, { color: colors.textFaint }]}>
                {t('history.title').toUpperCase()}
              </Text>
              <PressableScale onPress={() => router.push('/(tabs)/history')} noFeedback>
                <Text style={[styles.recentAll, { color: colors.primary }]}>
                  {t('history.clearAll') === 'Clear all' ? 'View all' : t('common.continue')}
                </Text>
              </PressableScale>
            </View>

            <GlassCard padded={false}>
              {conversations.slice(0, 3).map((conversation, index) => (
                <PressableScale
                  key={conversation.id}
                  onPress={() => router.push('/(tabs)/history')}
                  noFeedback
                  style={styles.recentRow}
                  accessibilityLabel={conversation.title}
                >
                  <View
                    style={[
                      styles.recentIcon,
                      { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}2E` },
                    ]}
                  >
                    <Icon name="chat" size={14} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>
                      {conversation.title}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.textFaint }]}>
                      {conversation.messages.length} {t('history.messages')}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={15} color={colors.textFaint} />
                  {index < Math.min(conversations.length, 3) - 1 ? (
                    <View style={[styles.recentDivider, { backgroundColor: colors.divider }]} />
                  ) : null}
                </PressableScale>
              ))}
            </GlassCard>
          </View>
        ) : null}

        {/* Developer credit */}
        <View style={styles.creditArea}>
          <Text style={[styles.credit, { color: colors.textFaint }]}>
            {t('about.role')} <Text style={{ color: colors.textMuted, fontWeight: '800' }}>{DEVELOPER.name}</Text>
          </Text>
          <Text style={[styles.creditSub, { color: colors.textFaint }]}>
            Telegram {DEVELOPER.telegramHandle}
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 15, fontWeight: '900', letterSpacing: 3.4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  brandStatus: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36 },
  iconBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingTop: 8 },
  greetingBlock: { paddingHorizontal: 24, gap: 2, marginTop: 4 },
  greeting: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 13.5, fontWeight: '500' },
  orbArea: { alignItems: 'center', justifyContent: 'center', height: 300, marginTop: 2 },
  sweepHost: {
    position: 'absolute',
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    bottom: 54,
  },
  sweep: { width: 90, height: 4 },
  captionArea: {
    minHeight: 96,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  transcriptBlock: { alignItems: 'center', gap: 12, width: '100%' },
  transcript: { fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 23 },
  lastReply: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    width: '100%',
    gap: 5,
  },
  lastReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lastReplyLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2, flex: 1 },
  demoTag: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },
  lastReplyText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  openChat: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  openChatText: { fontSize: 11.5, fontWeight: '800' },
  hint: { fontSize: 11.5, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  micArea: { alignItems: 'center', marginTop: 18, gap: 6 },
  secondaryRow: { height: 34, justifyContent: 'center' },
  orbHint: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '600' },
  quickArea: { marginTop: 22 },
  recentArea: { marginTop: 22, paddingHorizontal: 16, gap: 8 },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  recentLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  recentAll: { fontSize: 11.5, fontWeight: '800' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  recentIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: { fontSize: 13, fontWeight: '700' },
  recentMeta: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  recentDivider: {
    position: 'absolute',
    bottom: 0,
    left: 52,
    right: 12,
    height: StyleSheet.hairlineWidth * 2,
  },
  creditArea: { alignItems: 'center', marginTop: 26, gap: 2 },
  credit: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4 },
  creditSub: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.4 },
});