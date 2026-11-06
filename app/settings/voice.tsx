import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Feedback';
import { GlassCard } from '@/components/GlassCard';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Badge, GlowDivider, ScreenHeader, SectionHeader } from '@/components/ScreenHeader';
import { SPEECH_LOCALES } from '@/lib/constants';
import { isTtsSupported } from '@/lib/device';
import { translate } from '@/lib/i18n';
import { tts, type TtsVoice } from '@/lib/tts';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';

const SAMPLE = 'Hello. I am Jarvis. This is how I sound when I read your answers aloud.';

/**
 * Voice picker.
 *
 * Reads the platform's installed voices (`Speech.getAvailableVoicesAsync`),
 * groups them by language, and previews each one with the user's current rate
 * and pitch. Selecting a voice persists it to settings and returns here.
 */
export default function VoiceSettingsRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, update } = useSettings();
  const { colors, isDark } = useTheme();
  const toast = useToast();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const [voices, setVoices] = useState<TtsVoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const preferredLocale = SPEECH_LOCALES[settings.language] ?? 'en-US';
  const preferredPrefix = preferredLocale.split('-')[0] ?? 'en';

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isTtsSupported()) {
        if (mounted) {
          setVoices([]);
          setLoading(false);
        }
        return;
      }
      const list = await tts.loadVoices();
      if (!mounted) return;
      setVoices(list);
      setLoading(false);
    })();
    return () => {
      mounted = false;
      void tts.stop();
    };
  }, []);

  /** Voices matching the current app language first, the rest behind "show all". */
  const groups = useMemo(() => {
    const list = voices ?? [];
    const matching = list.filter((voice) =>
      voice.language.toLowerCase().startsWith(preferredPrefix),
    );
    const others = list.filter((voice) => !voice.language.toLowerCase().startsWith(preferredPrefix));
    return { matching, others };
  }, [voices, preferredPrefix]);

  const preview = useCallback(
    async (voiceId: string | null) => {
      setPreviewing(voiceId ?? 'default');
      await tts.speak({
        text: SAMPLE,
        language: preferredLocale,
        voiceId,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        onDone: () => setPreviewing(null),
        onStopped: () => setPreviewing(null),
        onError: () => {
          setPreviewing(null);
          toast.show({ message: t('settings.speechUnavailable'), variant: 'warning' });
        },
      });
    },
    [preferredLocale, settings.speechPitch, settings.speechRate, t, toast],
  );

  const choose = (voiceId: string | null) => {
    update({ voiceId });
    void preview(voiceId);
  };

  const renderVoice = (voice: TtsVoice) => {
    const selected = settings.voiceId === voice.id;
    const isPreviewing = previewing === voice.id;
    return (
      <PressableScale
        key={voice.id}
        onPress={() => choose(voice.id)}
        accessibilityLabel={voice.name}
        accessibilityHint={voice.language}
        accessibilityState={{ selected }}
        noFeedback
        style={styles.voiceRowWrap}
      >
        <View
          style={[
            styles.voiceRow,
            {
              borderColor: selected ? `${colors.primary}66` : colors.surfaceBorder,
              backgroundColor: selected
                ? isDark
                  ? `${colors.primary}14`
                  : `${colors.primary}0E`
                : 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.radio,
              { borderColor: selected ? colors.primary : colors.surfaceBorder },
            ]}
          >
            {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
          </View>

          <View style={styles.voiceText}>
            <Text numberOfLines={1} style={[styles.voiceName, { color: colors.text }]}>
              {voice.name}
            </Text>
            <View style={styles.voiceMeta}>
              <Text style={[styles.voiceLang, { color: colors.textFaint }]}>{voice.language}</Text>
              {voice.quality && voice.quality !== 'Default' ? (
                <Badge label={voice.quality} tone="secondary" />
              ) : null}
            </View>
          </View>

          <PressableScale
            onPress={() => void preview(voice.id)}
            accessibilityLabel={`${t('settings.testVoice')} — ${voice.name}`}
            style={styles.playBtn}
          >
            <View
              style={[
                styles.playInner,
                { borderColor: colors.surfaceBorder, backgroundColor: `${colors.primary}12` },
              ]}
            >
              {isPreviewing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="play" size={13} color={colors.primary} strokeWidth={2.2} filled />
              )}
            </View>
          </PressableScale>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ScreenHeader
          title={t('settings.voiceSelect')}
          subtitle={t('settings.voiceDefault')}
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current selection */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <GlassCard glow tint="primary">
            <View style={styles.currentHeader}>
              <Icon name="volume" size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.currentLabel, { color: colors.textFaint }]}>
                {t('settings.voiceSelect').toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.currentValue, { color: colors.text }]} numberOfLines={1}>
              {currentVoiceName(voices, settings.voiceId) ?? t('settings.voiceDefault')}
            </Text>
            <View style={styles.currentActions}>
              <Button
                label={t('settings.testVoice')}
                icon={previewing ? 'volumeOff' : 'play'}
                variant="outline"
                size="sm"
                onPress={() => {
                  if (previewing) {
                    setPreviewing(null);
                    void tts.stop();
                    return;
                  }
                  void preview(settings.voiceId);
                }}
              />
              {settings.voiceId ? (
                <Button
                  label={t('settings.resetVoice')}
                  icon="refresh"
                  variant="ghost"
                  size="sm"
                  onPress={() => choose(null)}
                />
              ) : null}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Voice list */}
        <SectionHeader label={t('settings.voice')} icon="user" />

        {loading ? (
          <View style={styles.skeletonHost}>
            <Skeleton height={64} borderRadius={16} />
            <Skeleton height={64} borderRadius={16} />
            <Skeleton height={64} borderRadius={16} />
          </View>
        ) : (voices ?? []).length === 0 ? (
          <EmptyState
            icon="volumeOff"
            title={t('settings.voicesUnavailable')}
            body={t('settings.speechUnavailable')}
            compact
          />
        ) : (
          <GlassCard padded={false}>
            <View style={styles.listInner}>
              {/* System default always available */}
              <PressableScale
                onPress={() => choose(null)}
                accessibilityLabel={t('settings.voiceDefault')}
                accessibilityState={{ selected: settings.voiceId === null }}
                noFeedback
                style={styles.voiceRowWrap}
              >
                <View
                  style={[
                    styles.voiceRow,
                    {
                      borderColor:
                        settings.voiceId === null ? `${colors.primary}66` : colors.surfaceBorder,
                      backgroundColor:
                        settings.voiceId === null
                          ? isDark
                            ? `${colors.primary}14`
                            : `${colors.primary}0E`
                          : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor:
                          settings.voiceId === null ? colors.primary : colors.surfaceBorder,
                      },
                    ]}
                  >
                    {settings.voiceId === null ? (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    ) : null}
                  </View>
                  <View style={styles.voiceText}>
                    <Text style={[styles.voiceName, { color: colors.text }]}>
                      {t('settings.voiceDefault')}
                    </Text>
                    <Text style={[styles.voiceLang, { color: colors.textFaint }]}>
                      {preferredLocale}
                    </Text>
                  </View>
                </View>
              </PressableScale>

              {groups.matching.length > 0 ? <GlowDivider style={styles.divider} /> : null}
              {groups.matching.map((voice, index) => (
                <View key={voice.id}>
                  {index > 0 ? <GlowDivider style={styles.divider} /> : null}
                  {renderVoice(voice)}
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Other languages */}
        {groups.others.length > 0 ? (
          <>
            <PressableScale
              onPress={() => setShowAll((value) => !value)}
              accessibilityLabel={showAll ? t('common.close') : t('about.language')}
              noFeedback
              style={styles.moreRow}
            >
              <Text style={[styles.moreText, { color: colors.primary }]}>
                {showAll ? t('common.close') : `${t('about.language')} · ${groups.others.length}`}
              </Text>
              <Icon
                name={showAll ? 'chevronDown' : 'chevronRight'}
                size={13}
                color={colors.primary}
                strokeWidth={2.4}
              />
            </PressableScale>

            {showAll ? (
              <GlassCard padded={false}>
                <View style={styles.listInner}>
                  {groups.others.slice(0, 60).map((voice, index) => (
                    <View key={voice.id}>
                      {index > 0 ? <GlowDivider style={styles.divider} /> : null}
                      {renderVoice(voice)}
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : null}

        <Text style={[styles.hint, { color: colors.textFaint }]}>{t('settings.voicesHint')}</Text>
      </ScrollView>
    </View>
  );
}

function currentVoiceName(voices: TtsVoice[] | null, voiceId: string | null): string | null {
  if (!voiceId) return null;
  const found = (voices ?? []).find((voice) => voice.id === voiceId);
  if (found) return found.name;
  return voiceId.length > 26 ? `${voiceId.slice(0, 24)}...` : voiceId;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  currentValue: { fontSize: 18, fontWeight: '800', marginTop: 8, letterSpacing: -0.2 },
  currentActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  skeletonHost: { gap: 10, paddingTop: 4 },
  listInner: { paddingHorizontal: 10, paddingVertical: 4 },
  voiceRowWrap: { paddingVertical: 2 },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  voiceText: { flex: 1, gap: 2 },
  voiceName: { fontSize: 14, fontWeight: '700' },
  voiceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voiceLang: { fontSize: 11, fontWeight: '600' },
  playBtn: { width: 34, height: 34 },
  playInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { marginVertical: 0 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
  },
  moreText: { fontSize: 12.5, fontWeight: '800' },
  hint: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8, marginTop: 12 },
});