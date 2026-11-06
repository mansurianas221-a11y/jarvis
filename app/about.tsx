import React, { useCallback, useMemo } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BrandLockup } from '@/components/JarvisMark';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { GlowDivider, ScreenHeader } from '@/components/ScreenHeader';
import { APP_NAME, APP_TAGLINE, APP_VERSION, DEVELOPER } from '@/lib/constants';
import { clipboard } from '@/lib/clipboard';
import { isAiConfigured, isRecognitionSupported, isTtsSupported } from '@/lib/device';
import { LANGUAGES, translate } from '@/lib/i18n';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';

const STACK: IconName[] = ['code', 'sparkles', 'wave', 'shield'];

/**
 * Screen 7 — About / Developer.
 *
 * The single place that must always credit the developer and open the Telegram
 * channel. If the URL handler is unavailable the link is copied instead, so the
 * call to action never silently does nothing.
 */
export default function AboutRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const toast = useToast();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const openTelegram = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(DEVELOPER.telegramUrl).catch(() => true);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(DEVELOPER.telegramUrl);
    } catch {
      const copied = await clipboard.copy(DEVELOPER.telegramUrl);
      toast.show({
        message: copied ? t('about.linkCopied') : DEVELOPER.telegramUrl,
        variant: copied ? 'info' : 'warning',
        duration: 3600,
      });
    }
  }, [t, toast]);

  const buildRows = useMemo(
    () => [
      { icon: 'code' as IconName, label: t('about.version'), value: `v${APP_VERSION}` },
      { icon: 'globe' as IconName, label: t('about.language'), value: LANGUAGES.length.toString() },
      {
        icon: 'wave' as IconName,
        label: t('about.speech'),
        value: isRecognitionSupported() ? t('common.on') : t('common.off'),
      },
      {
        icon: 'volume' as IconName,
        label: t('about.voiceOut'),
        value: isTtsSupported() ? t('common.on') : t('common.off'),
      },
      {
        icon: 'wifiOff' as IconName,
        label: t('about.aiBackend'),
        value: isAiConfigured() ? t('about.aiLive') : t('about.aiDemo'),
      },
      {
        icon: 'lock' as IconName,
        label: t('about.platform'),
        value: Platform.select({ ios: 'iOS', android: 'Android', default: 'Web' }) ?? 'App',
      },
    ],
    [t],
  );

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ScreenHeader title={t('about.title')} onBack={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(380)}>
          <BrandLockup size={96} showTagline tagline={t('brand.tagline')} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.versionPill}>
          <Text style={[styles.versionText, { color: colors.textFaint }]}>
            {t('about.taglineLine')} · v{APP_VERSION}
          </Text>
        </Animated.View>

        {/* Developer card */}
        <Animated.View entering={FadeInDown.delay(140).duration(380)}>
          <GlassCard glow tint="primary" style={styles.devCard}>
            <View style={styles.devRow}>
              <View
                style={[
                  styles.avatar,
                  { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}18` },
                ]}
              >
                <LinearGradient
                  colors={[`${colors.primary}33`, `${colors.secondary}22`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.avatarText, { color: colors.primary }]}>AP</Text>
              </View>

              <View style={styles.devText}>
                <Text style={[styles.devEyebrow, { color: colors.textFaint }]}>
                  {t('about.role').toUpperCase()}
                </Text>
                <Text style={[styles.devName, { color: colors.text }]}>{DEVELOPER.name}</Text>
                <Text style={[styles.devHandle, { color: colors.primary }]}>
                  {DEVELOPER.telegramHandle}
                </Text>
              </View>
            </View>

            <GlowDivider style={styles.divider} />

            <Text style={[styles.telegramTitle, { color: colors.text }]}>
              {t('about.telegramTitle')}
            </Text>
            <Text style={[styles.telegramBody, { color: colors.textMuted }]}>
              {t('about.telegramBody')}
            </Text>

            <Button
              label={t('about.openTelegram')}
              icon="telegramPlane"
              iconRight="arrowRight"
              variant="telegram"
              size="lg"
              fullWidth
              onPress={() => void openTelegram()}
              style={styles.telegramBtn}
              accessibilityLabel={`${t('about.openTelegram')} — ${DEVELOPER.telegramUrl}`}
            />

            <PressableScale
              onPress={async () => {
                const copied = await clipboard.copy(DEVELOPER.telegramUrl);
                toast.show({ message: t(copied ? 'about.linkCopied' : 'common.somethingWrong'), variant: copied ? 'success' : 'error' });
              }}
              style={styles.copyRow}
              accessibilityLabel={t('about.copyLink')}
              noFeedback
            >
              <Icon name="copy" size={12} color={colors.textFaint} strokeWidth={2} />
              <Text style={[styles.copyText, { color: colors.textFaint }]}>
                {t('about.copyLink')} · {DEVELOPER.telegramLabel}
              </Text>
            </PressableScale>
          </GlassCard>
        </Animated.View>

        {/* Build info */}
        <Animated.View entering={FadeInDown.delay(200).duration(380)}>
          <GlassCard padded={false} style={styles.infoCard}>
            <View style={styles.infoInner}>
              {buildRows.map((row, index) => (
                <View key={row.label}>
                  {index > 0 ? <GlowDivider style={styles.rowDivider} /> : null}
                  <View style={styles.infoRow}>
                    <Icon name={row.icon} size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                    <Text numberOfLines={1} style={[styles.infoValue, { color: colors.text }]}>
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Tech stack */}
        <Animated.View entering={FadeInDown.delay(260).duration(380)} style={styles.stackBlock}>
          <Text style={[styles.stackLabel, { color: colors.textFaint }]}>
            {t('about.features').toUpperCase()}
          </Text>
          <View style={styles.stackRow}>
            {STACK.map((icon) => (
              <View
                key={icon}
                style={[
                  styles.stackChip,
                  {
                    borderColor: colors.surfaceBorder,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                  },
                ]}
              >
                <Icon name={icon} size={13} color={colors.secondary} strokeWidth={2} />
              </View>
            ))}
          </View>
          <Text style={[styles.tech, { color: colors.textMuted }]}>{t('about.tech')}</Text>
        </Animated.View>

        <Text style={[styles.legal, { color: colors.textFaint }]}>{t('about.legal')}</Text>
        <Text style={[styles.thanks, { color: colors.textFaint }]}>{t('about.thanks')}</Text>
        <Text style={[styles.copyright, { color: colors.textFaint }]}>
          © {new Date().getFullYear()} {DEVELOPER.name} · {APP_NAME} · {DEVELOPER.telegramHandle}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
  versionPill: { alignItems: 'center', marginTop: -6 },
  versionText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  devCard: { gap: 2 },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 21, fontWeight: '900', letterSpacing: 1 },
  devText: { flex: 1, gap: 1 },
  devEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  devName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  devHandle: { fontSize: 12.5, fontWeight: '700' },
  divider: { marginVertical: 14 },
  telegramTitle: { fontSize: 14.5, fontWeight: '800' },
  telegramBody: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  telegramBtn: { marginTop: 14 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 4,
  },
  copyText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  infoCard: { marginTop: 2 },
  infoInner: { paddingHorizontal: 14, paddingVertical: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  infoLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 12.5, fontWeight: '800', maxWidth: 150, textAlign: 'right' },
  rowDivider: { marginVertical: 0 },
  stackBlock: { alignItems: 'center', gap: 8, marginTop: 4 },
  stackLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  stackRow: { flexDirection: 'row', gap: 7 },
  stackChip: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tech: { fontSize: 11.5, fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 6,
  },
  thanks: { fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  copyright: { fontSize: 10, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
});