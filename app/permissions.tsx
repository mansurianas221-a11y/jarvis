import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { GlowDivider, ScreenHeader } from '@/components/ScreenHeader';
import { isRecognitionSupported, isTtsSupported } from '@/lib/device';
import { translate } from '@/lib/i18n';
import { useAssistant, type PermissionStatus } from '@/state/AssistantProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Screen 8 — Permissions & error states.
 *
 * One screen that explains, requests and diagnoses the microphone, the speech
 * recogniser and the text-to-speech engine. Every state has an exit path, so a
 * user with a locked-down device can always fall back to typing.
 */
export default function PermissionsRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const { micPermission, requestMicPermission, openSystemSettings, speak, stopSpeaking, isSpeaking } =
    useAssistant();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const [requesting, setRequesting] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState<boolean | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    setSpeechAvailable(isRecognitionSupported());
    setTtsAvailable(isTtsSupported());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ask = async () => {
    setRequesting(true);
    const status = await requestMicPermission();
    setRequesting(false);
    refresh();
    if (status === 'granted') {
      toast.show({ message: t('onboarding.micGranted'), variant: 'success' });
    } else if (status === 'denied') {
      toast.show({
        message: t('perm.deniedBody'),
        variant: 'warning',
        actionLabel: t('perm.openSettings'),
        onAction: () => void openSystemSettings(),
      });
    } else if (status === 'unavailable') {
      toast.show({ message: t('perm.notAvailable'), variant: 'warning' });
    }
  };

  const testVoice = async () => {
    if (isSpeaking) {
      await stopSpeaking();
      return;
    }
    if (!isTtsSupported()) {
      toast.show({ message: t('settings.speechUnavailable'), variant: 'warning' });
      return;
    }
    await speak(t('about.taglineLine'));
  };

  const micRow = describe(micPermission, t);
  const speechRow = speechAvailable
    ? { label: t('perm.granted'), tone: 'success' as Tone, icon: 'check' as IconName }
    : { label: t('perm.unavailable'), tone: 'danger' as Tone, icon: 'wifiOff' as IconName };
  const ttsRow = ttsAvailable
    ? { label: t('perm.granted'), tone: 'success' as Tone, icon: 'check' as IconName }
    : { label: t('perm.unavailable'), tone: 'danger' as Tone, icon: 'volumeOff' as IconName };

  const allGood = micPermission === 'granted' && speechAvailable && ttsAvailable;

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ScreenHeader
          title={t('settings.permissions')}
          subtitle={allGood ? t('perm.allGoodBody') : t('perm.body')}
          onBack={() => router.back()}
          right={
            <PressableScale onPress={refresh} accessibilityLabel={t('about.refresh')}>
              <View
                style={[
                  styles.refreshBtn,
                  {
                    borderColor: colors.surfaceBorder,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  },
                ]}
              >
                <Icon name="refresh" size={16} color={colors.primary} strokeWidth={2} />
              </View>
            </PressableScale>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero state */}
        <Animated.View entering={FadeInDown.duration(360)} style={styles.hero}>
          <View
            style={[
              styles.heroCircle,
              {
                borderColor: `${allGood ? colors.success : colors.primary}44`,
                backgroundColor: `${allGood ? colors.success : colors.primary}14`,
              },
            ]}
          >
            <LinearGradient
              colors={[
                `${allGood ? colors.success : colors.primary}33`,
                `${colors.secondary}22`,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Icon
              name={allGood ? 'check' : micPermission === 'denied' ? 'micOff' : 'mic'}
              size={36}
              color={allGood ? colors.success : micPermission === 'denied' ? colors.danger : colors.primary}
              strokeWidth={2}
            />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {allGood ? t('perm.allGood') : micRow.title}
          </Text>
          <Text style={[styles.heroBody, { color: colors.textMuted }]}>
            {allGood ? t('perm.allGoodBody') : micRow.body}
          </Text>
        </Animated.View>

        {/* Status list */}
        <Animated.View entering={FadeInDown.delay(80).duration(360)}>
          <GlassCard padded={false}>
            <View style={styles.cardInner}>
              <StatusRow icon="mic" label={t('perm.micLabel')} status={micRow} />
              <GlowDivider style={styles.divider} />
              <StatusRow icon="wave" label={t('perm.speechLabel')} status={speechRow} />
              <GlowDivider style={styles.divider} />
              <StatusRow icon="volume" label={t('perm.ttsLabel')} status={ttsRow} />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(140).duration(360)} style={styles.actions}>
          {micPermission !== 'granted' ? (
            <Button
              label={micPermission === 'denied' ? t('perm.openSettings') : t('perm.grant')}
              icon={micPermission === 'denied' ? 'sliders' : 'mic'}
              size="lg"
              fullWidth
              loading={requesting}
              onPress={
                micPermission === 'denied'
                  ? () => void openSystemSettings()
                  : () => void ask()
              }
            />
          ) : (
            <Button
              label={isSpeaking ? t('home.stopSpeaking') : t('settings.testVoice')}
              icon={isSpeaking ? 'volumeOff' : 'play'}
              size="lg"
              fullWidth
              onPress={() => void testVoice()}
            />
          )}

          <Button
            label={t('perm.openChat')}
            icon="keyboard"
            variant="outline"
            size="md"
            fullWidth
            onPress={() => router.replace('/(tabs)/chat')}
          />
        </Animated.View>

        {/* Explanation */}
        <Animated.View entering={FadeInDown.delay(200).duration(360)}>
          <GlassCard tint="secondary">
            <View style={styles.whyHeader}>
              <Icon name="shield" size={15} color={colors.secondary} strokeWidth={2} />
              <Text style={[styles.whyTitle, { color: colors.text }]}>{t('perm.whyTitle')}</Text>
            </View>
            <Text style={[styles.whyBody, { color: colors.textMuted }]}>{t('perm.whyBody')}</Text>

            <GlowDivider style={styles.divider} />

            {[
              { icon: 'mic' as IconName, text: t('onboarding.permissionTitle') },
              { icon: 'wave' as IconName, text: t('perm.speechLabel') },
              { icon: 'lock' as IconName, text: t('perm.textChatHint') },
            ].map((point) => (
              <View key={point.text} style={styles.point}>
                <Icon name={point.icon} size={12} color={colors.secondary} strokeWidth={2.1} />
                <Text style={[styles.pointText, { color: colors.textFaint }]}>{point.text}</Text>
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        {micPermission === 'unknown' ? (
          <Animated.View entering={FadeIn.duration(240)}>
            <Text style={[styles.footnote, { color: colors.textFaint }]}>
              {t('onboarding.offlineNote')}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatusRow({
  icon,
  label,
  status,
}: {
  icon: IconName;
  label: string;
  status: { label: string; tone: Tone; icon: IconName };
}) {
  const { colors } = useTheme();
  const color =
    status.tone === 'success'
      ? colors.success
      : status.tone === 'warning'
        ? colors.warning
        : status.tone === 'danger'
          ? colors.danger
          : colors.textMuted;

  return (
    <View style={styles.statusRow} accessible accessibilityLabel={`${label}: ${status.label}`}>
      <Icon name={icon} size={16} color={colors.primary} strokeWidth={2} />
      <Text style={[styles.statusLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.statusPill, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
        <Icon name={status.icon} size={10} color={color} strokeWidth={2.6} />
        <Text style={[styles.statusText, { color }]} numberOfLines={1}>
          {status.label}
        </Text>
      </View>
    </View>
  );
}

function describe(
  status: PermissionStatus,
  t: (key: string) => string,
): { title: string; body: string; label: string; tone: Tone; icon: IconName } {
  switch (status) {
    case 'granted':
      return {
        title: t('perm.allGood'),
        body: t('perm.allGoodBody'),
        label: t('perm.granted'),
        tone: 'success',
        icon: 'check',
      };
    case 'denied':
      return {
        title: t('perm.deniedTitle'),
        body: t('perm.deniedBody'),
        label: t('perm.deniedTitle'),
        tone: 'danger',
        icon: 'close',
      };
    case 'unavailable':
      return {
        title: t('perm.speechTitle'),
        body: t('perm.speechBody'),
        label: t('perm.unavailable'),
        tone: 'warning',
        icon: 'alert',
      };
    default:
      return {
        title: t('perm.title'),
        body: t('perm.body'),
        label: t('perm.unknown'),
        tone: 'neutral',
        icon: 'info',
      };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  hero: { alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6 },
  heroCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  heroBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  cardInner: { paddingHorizontal: 14, paddingVertical: 4 },
  divider: { marginVertical: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  statusLabel: { flex: 1, fontSize: 14, fontWeight: '650' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 150,
  },
  statusText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  actions: { gap: 10 },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  whyTitle: { fontSize: 14, fontWeight: '800' },
  whyBody: { fontSize: 12.5, lineHeight: 18 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  pointText: { fontSize: 11.5, fontWeight: '600', flex: 1 },
  footnote: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 10 },
});