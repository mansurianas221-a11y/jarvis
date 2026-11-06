import 'react-native-gesture-handler';

import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { Starfield } from '@/components/Starfield';
import { ThemeProvider, useTheme } from '@/theme';
import {
  AssistantProvider,
  ConversationsProvider,
  SettingsProvider,
  ToastProvider,
  useSettings,
} from '@/state';

// Keep the native splash visible until settings hydrate so the app never
// flashes the wrong theme.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemedApp />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { settings, loading } = useSettings();

  useEffect(() => {
    if (loading) return;
    void SystemUI.setBackgroundColorAsync(settings.theme === 'light' ? '#F3F6FE' : '#05060E').catch(
      () => {},
    );
  }, [loading, settings.theme]);

  if (loading) {
    // Settings are still hydrating; keep the native splash up.
    return <View style={styles.root} />;
  }

  return (
    <ThemeProvider mode={settings.theme}>
      <ToastProvider>
        <ConversationsProvider>
          <AssistantProvider>
            <AppShell />
          </AssistantProvider>
        </ConversationsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Hide the native splash once the first screen has actually laid out.
  const onLayoutRootView = useCallback(async () => {
    if (ready) return;
    setReady(true);
    await SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Onboarding gate: if the user has not finished onboarding, send them there.
  // The splash route (`index`) is excluded — it owns the initial redirect using
  // its own minimum display timer, so this gate must never pre-empt it.
  useEffect(() => {
    if (!ready) return;
    const current = segments[0];
    if (current === undefined || current === 'index' || current === 'onboarding') return;
    if (!settings.onboarded) {
      router.replace('/onboarding');
    }
  }, [ready, segments, settings.onboarded, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background[0] }]} onLayout={onLayoutRootView}>
      <Starfield reducedMotion={settings.reduceMotion} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="permissions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings/voice" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" options={{ animation: 'fade' }} />
      </Stack>

      <StatusBar style={isDark ? 'light' : 'dark'} translucent />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});