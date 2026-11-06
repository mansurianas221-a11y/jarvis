import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GlowDivider, SectionHeader } from '@/components/ScreenHeader';
import { GlassCard } from '@/components/GlassCard';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Segmented, SettingRow, SettingSwitch } from '@/components/SettingControls';
import { Slider } from '@/components/Slider';
import { DEVELOPER, APP_VERSION } from '@/lib/constants';
import { isTtsSupported } from '@/lib/device';
import { LANGUAGES, translate } from '@/lib/i18n';
import { shareText } from '@/lib/clipboard';
import { storage } from '@/lib/storage';
import { tts } from '@/lib/tts';
import { useAssistant } from '@/state/AssistantProvider';
import { useConversations } from '@/state/ConversationsProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';
import type { LanguageCode, ThemeMode } from '@/lib/types';

/** Screen 6 — Settings. */
export default function SettingsRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, update, reset } = useSettings();
  const { colors } = useTheme();
  const toast = useToast();
  const { clearAll } = useConversations();
  const { micPermission, requestMicPermission, openSystemSettings } = useAssistant();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const [confirmClear, setConfirmClear] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    return () => {
      void tts.stop();
    };
  }, []);

  const testVoice = async () => {
    if (!isTtsSupported()) {
      toast.show({ message: t('settings.speechUnavailable'), variant: 'warning' });
      return;
    }
    setTesting(true);
    await tts.speak({
      text: SAMPLE[settings.language],
      language: settings.language === 'hi' ? 'hi-IN' : settings.language === 'hinglish' ? 'en-IN' : 'en-US',
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      voiceId: settings.voiceId,
      onDone: () => setTesting(false),
      onStopped: () => setTesting(false),
      onError: () => {
        setTesting(false);
        toast.show({ message: t('settings.speechUnavailable'), variant: 'warning' });
      },
    });
  };

  const clearEverything = async () => {
    await reset();
    clearAll();
    await storage.clearAll();
    setConfirmClear(false);
    toast.show({ message: t('settings.dataCleared'), variant: 'success' });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <PressableScale onPress={() => router.push('/about')} accessibilityLabel={t('settings.about')}>
          <View style={[styles.infoBtn, { borderColor: colors.surfaceBorder }]}>
            <Icon name="info" size={17} color={colors.primary} strokeWidth={2} />
          </View>
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + Math.max(insets.bottom, 10) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SectionHeader label={t('settings.appearance')} icon="sun" />
        <GlassCard padded={false}>
          <View style={styles.cardInner}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('settings.theme')}</Text>
            <Segmented<ThemeMode>
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: 'system', label: t('settings.themeSystem'), icon: 'auto' },
                { value: 'dark', label: t('settings.themeDark'), icon: 'moon' },
                { value: 'light', label: t('settings.themeLight'), icon: 'sun' },
              ]}
            />
            <GlowDivider style={styles.divider} />
            <SettingSwitch
              label={t('settings.reduceMotion')}
              hint={t('settings.reduceMotionHint')}
              icon="wave"
              value={settings.reduceMotion}
              onValueChange={(reduceMotion) => update({ reduceMotion })}
            />
          </View>
        </GlassCard>

        {/* Language */}
        <SectionHeader label={t('settings.language')} icon="globe" />
        <GlassCard padded={false}>
          <View style={styles.cardInner}>
            <View style={styles.languageRow}>
              {LANGUAGES.map((language) => {
                const selected = settings.language === language.code;
                return (
                  <PressableScale
                    key={language.code}
                    onPress={() => update({ language: language.code as LanguageCode })}
                    style={styles.languageOption}
                    accessibilityLabel={language.label}
                    accessibilityState={{ selected }}
                    noFeedback
                  >
                    <View
                      style={[
                        styles.languagePill,
                        {
                          borderColor: selected ? colors.primary : colors.surfaceBorder,
                          backgroundColor: selected ? `${colors.primary}18` : 'transparent',
                        },
                      ]}
                    >
                      <Text style={styles.languageFlag}>{language.flag}</Text>
                      <Text
                        style={[
                          styles.languageText,
                          { color: selected ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {language.nativeLabel}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[styles.helper, { color: colors.textFaint }]}>
              {settings.language === 'hi'
                ? 'जार्विस हिन्दी में सुनता और बोलता है।'
                : settings.language === 'hinglish'
                  ? 'Jarvis listens in en-IN and replies in Hinglish.'
                  : 'Jarvis listens and replies in English (en-US).'}
            </Text>
          </View>
        </GlassCard>

        {/* Voice & speech */}
        <SectionHeader label={t('settings.voice')} icon="volume" />
        <GlassCard padded={false}>
          <View style={styles.cardInner}>
            <SettingRow
              label={t('settings.voiceSelect')}
              icon="user"
              value={voiceLabel(settings.language, settings.voiceId)}
              onPress={() => router.push('/settings/voice')}
              hint={t('settings.voiceDefault')}
            />
            <GlowDivider style={styles.divider} />
            <Slider
              label={t('settings.speed')}
              icon="speed"
              value={settings.speechRate}
              min={0.5}
              max={2}
              step={0.05}
              markers={[1, 1.5]}
              format={(value) => `${value.toFixed(2)}×`}
              onChange={(speechRate) => update({ speechRate })}
            />
            <View style={styles.sliderGap} />
            <Slider
              label={t('settings.pitch')}
              icon="wave"
              value={settings.speechPitch}
              min={0.5}
              max={2}
              step={0.05}
              markers={[1]}
              format={(value) => `${value.toFixed(2)}×`}
              onChange={(speechPitch) => update({ speechPitch })}
            />
            <GlowDivider style={styles.divider} />
            <SettingSwitch
              label={t('settings.autoSpeak')}
              hint={t('settings.autoSpeakHint')}
              icon="volume"
              value={settings.autoSpeak}
              onValueChange={(autoSpeak) => update({ autoSpeak })}
            />
            <Button
              label={t('settings.testVoice')}
              variant="outline"
              size="sm"
              icon="play"
              onPress={testVoice}
              loading={testing}
              style={styles.testBtn}
            />
          </View>
        </GlassCard>

        {/* Conversation */}
        <SectionHeader label={t('settings.conversation')} icon="chat" />
        <GlassCard padded={false}>
          <View style={styles.cardInner}>
            <SettingSwitch
              label={t('settings.continuous')}
              hint={t('settings.continuousHint')}
              icon="refresh"
              value={settings.continuousMode}
              onValueChange={(continuousMode) => update({ continuousMode })}
            />
            <GlowDivider style={styles.divider} />
            <SettingSwitch
              label={t('settings.wakeWord')}
              hint={t('settings.wakeWordHint')}
              icon="sparkles"
              value={settings.wakeWord}
              onValueChange={(wakeWord) => update({ wakeWord })}
            />
            <GlowDivider style={styles.divider} />
            <SettingSwitch
              label={t('settings.haptics')}
              hint={t('settings.hapticsHint')}
              icon="wave"
              value={settings.hapticsEnabled}
              onValueChange={(hapticsEnabled) => update({ hapticsEnabled })}
            />
          </View>
        </GlassCard>

        {/* Privacy */}
        <SectionHeader label={t('settings.privacy')} icon="shield" />
        <GlassCard padded={false}>
          <View style={styles.cardInner}>
            <SettingRow
              label={t('settings.permissions')}
              icon="mic"
              value={permissionLabel(micPermission, t)}
              hint={
                micPermission === 'granted'
                  ? 'Granted'
                  : micPermission === 'unavailable'
                    ? 'Not supported on this device'
                    : 'Required for voice input'
              }
              onPress={() => {
                if (micPermission === 'granted') {
                  router.push('/permissions');
                } else if (micPermission === 'unavailable') {
                  router.push('/permissions');
                } else {
                  void requestMicPermission().then((status) => {
                    if (status !== 'granted') void openSystemSettings();
                  });
                }
              }}
            />
            <GlowDivider style={styles.divider} />
            <SettingSwitch
              label={t('settings.analytics')}
              hint={t('settings.analyticsHint')}
              icon="shield"
              value={settings.shareAnalytics}
              onValueChange={(shareAnalytics) => update({ shareAnalytics })}
            />
            <GlowDivider style={styles.divider} />
            <SettingRow
              label={t('settings.clearData')}
              icon="trash"
              destructive
              onPress={() => setConfirmClear(true)}
              accessibilityHint="Deletes all chats and settings"
            />
          </View>
        </GlassCard>

        {/* About */}
        <SectionHeader label={t('settings.about')} icon="info" />
        <GlassCard padded={false} glow>
          <View style={styles.cardInner}>
            <SettingRow label={t('settings.aboutApp')} icon="sparkles" onPress={() => router.push('/about')} />
            <GlowDivider style={styles.divider} />
            <SettingRow
              label={t('settings.developer')}
              icon="user"
              value={DEVELOPER.name}
              onPress={() => router.push('/about')}
            />
            <GlowDivider style={styles.divider} />
            <SettingRow
              label={t('settings.telegram')}
              icon="telegram"
              value={DEVELOPER.telegramHandle}
              onPress={() => router.push('/about')}
            />
            <GlowDivider style={styles.divider} />
            <SettingRow
              label={t('settings.version')}
              icon="code"
              value={`v${APP_VERSION}`}
              onPress={() => void shareText(`${'Jarvis'} v${APP_VERSION} by ${DEVELOPER.name} — ${DEVELOPER.telegramUrl}`, 'Jarvis')}
            />
          </View>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textFaint }]}>
            {t('about.tech')}
          </Text>
          <Text style={[styles.footerText, { color: colors.textFaint }]}>
            © {new Date().getFullYear()} {DEVELOPER.name} · {DEVELOPER.telegramHandle}
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmClear}
        title={t('settings.clearDataTitle')}
        body={t('settings.clearDataBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon="trash"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void clearEverything()}
      />
    </View>
  );
}

function voiceLabel(language: LanguageCode, voiceId: string | null): string {
  if (!voiceId) return 'System default';
  void language;
  return voiceId.length > 22 ? `${voiceId.slice(0, 20)}…` : voiceId;
}

function permissionLabel(
  status: string,
  t: (key: string) => string,
): string {
  switch (status) {
    case 'granted':
      return t('onboarding.micGranted');
    case 'denied':
      return t('perm.deniedTitle');
    case 'unavailable':
      return t('perm.speechTitle');
    default:
      return t('common.no');
  }
}

const SAMPLE: Record<LanguageCode, string> = {
  en: 'Hello, I am Jarvis. This is how I sound.',
  hi: 'नमस्ते, मैं जार्विस हूँ। यह मेरी आवाज़ है।',
  hinglish: 'Namaste, main Jarvis hoon. Yeh meri awaaz hai.',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  infoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16 },
  cardInner: { padding: 14, gap: 4 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', marginBottom: 8, paddingHorizontal: 2 },
  divider: { marginVertical: 8 },
  languageRow: { flexDirection: 'row', gap: 8 },
  languageOption: { flex: 1 },
  languagePill: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  languageFlag: { fontSize: 19 },
  languageText: { fontSize: 12, fontWeight: '700' },
  helper: { fontSize: 11.5, lineHeight: 16, marginTop: 10, paddingHorizontal: 2 },
  sliderGap: { height: 16 },
  testBtn: { marginTop: 12 },
  footer: { alignItems: 'center', marginTop: 26, gap: 3, paddingHorizontal: 12 },
  footerText: { fontSize: 10.5, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
});