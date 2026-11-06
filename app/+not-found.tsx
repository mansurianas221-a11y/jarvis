import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { JarvisMark } from '@/components/JarvisMark';
import { translate } from '@/lib/i18n';
import { useSettings } from '@/state/SettingsProvider';
import { useTheme } from '@/theme';

/** Fallback route for unknown deep links. */
export default function NotFoundRoute() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors } = useTheme();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(380)} style={styles.content}>
        <JarvisMark size={84} primary={colors.primary} secondary={colors.secondary} accent={colors.tertiary} />

        <Text style={[styles.code, { color: `${colors.primary}88` }]}>404</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('notFound.title')}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{t('notFound.body')}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.actions}>
        <Button
          label={t('notFound.home')}
          icon="home"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(tabs)')}
        />
        <Button
          label={t('common.back')}
          icon="chevronLeft"
          variant="ghost"
          fullWidth
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: -20 },
  code: { fontSize: 46, fontWeight: '900', letterSpacing: 6, marginTop: 10 },
  title: { fontSize: 21, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  actions: { gap: 10 },
});