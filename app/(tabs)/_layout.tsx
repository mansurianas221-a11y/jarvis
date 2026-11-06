import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { translate } from '@/lib/i18n';
import { useSettings } from '@/state';
import { useTheme } from '@/theme';

/**
 * Bottom tab bar: Home · Chat · History · Settings.
 * A custom bar is used instead of the default one so the glassmorphism,
 * active-glow and haptics match the rest of the design system.
 */
export default function TabsLayout() {
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();

  const labels = {
    home: translate(settings.language, 'tab.home'),
    chat: translate(settings.language, 'tab.chat'),
    history: translate(settings.language, 'tab.history'),
    settings: translate(settings.language, 'tab.settings'),
  };

  return (
    <Tabs
      initialRouteName={settings.defaultTab === 'chat' ? 'chat' : 'index'}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: styles.hiddenBar,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => (
        <GlassTabBar
          state={props.state}
          descriptors={props.descriptors}
          navigation={props.navigation}
          labels={labels}
          isDark={isDark}
          colors={colors}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: labels.home,
          tabBarIcon: ({ focused }) => (
            <Icon name="home" size={22} color={focused ? colors.primary : colors.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: labels.chat,
          tabBarIcon: ({ focused }) => (
            <Icon name="chat" size={22} color={focused ? colors.primary : colors.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: labels.history,
          tabBarIcon: ({ focused }) => (
            <Icon name="history" size={22} color={focused ? colors.primary : colors.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: labels.settings,
          tabBarIcon: ({ focused }) => (
            <Icon name="settings" size={22} color={focused ? colors.primary : colors.textFaint} />
          ),
        }}
      />
    </Tabs>
  );
}

const TAB_META: Record<string, { icon: IconName; key: keyof TabLabels }> = {
  index: { icon: 'home', key: 'home' },
  chat: { icon: 'chat', key: 'chat' },
  history: { icon: 'history', key: 'history' },
  settings: { icon: 'settings', key: 'settings' },
};

interface TabLabels {
  home: string;
  chat: string;
  history: string;
  settings: string;
}

function GlassTabBar({
  state,
  navigation,
  labels,
  isDark,
  colors,
}: {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: unknown;
  navigation: { navigate: (name: string) => void; emit: (event: unknown) => void };
  labels: TabLabels;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.barHost,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            borderColor: colors.surfaceBorder,
            shadowColor: isDark ? colors.primary : '#000',
          },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 40 : 30}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(10,14,28,0.62)' : 'rgba(255,255,255,0.66)' },
          ]}
        />

        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] ?? TAB_META.index!;
          const focused = state.index === index;
          const label = labels[meta.key];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            }) as { defaultPrevented?: boolean };
            if (!focused && !event?.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <PressableScale
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              scaleTo={0.9}
              noFeedback
            >
              <View style={styles.tabInner}>
                {focused ? (
                  <View
                    style={[
                      styles.activeGlow,
                      { backgroundColor: `${colors.primary}1F`, shadowColor: colors.primary },
                    ]}
                  />
                ) : null}
                <Icon
                  name={meta.icon}
                  size={21}
                  color={focused ? colors.primary : colors.textFaint}
                  strokeWidth={focused ? 2.2 : 1.7}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    { color: focused ? colors.primary : colors.textFaint },
                    focused && { fontWeight: '800' },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenBar: { display: 'none' },
  barHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3 },
  activeGlow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    top: -6,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  tabLabel: { fontSize: 9.5, fontWeight: '650', letterSpacing: 0.3 },
});