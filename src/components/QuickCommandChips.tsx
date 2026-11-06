import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';
import { translate } from '@/lib/i18n';
import type { LanguageCode, QuickCommand } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { haptics } from '@/lib/haptics';

export const QUICK_COMMANDS: (QuickCommand & { iconName: IconName })[] = [
  {
    id: 'capabilities',
    labelEn: 'What can you do?',
    labelHi: 'तुम क्या कर सकते हो?',
    labelHinglish: 'Tum kya kar sakte ho?',
    prompt: 'What can you do?',
    icon: 'sparkles',
    iconName: 'sparkles',
  },
  {
    id: 'time',
    labelEn: 'What time is it?',
    labelHi: 'अभी कितने बजे हैं?',
    labelHinglish: 'Abhi kitne baje hain?',
    prompt: 'What time is it?',
    icon: 'history',
    iconName: 'history',
  },
  {
    id: 'joke',
    labelEn: 'Tell me a joke',
    labelHi: 'एक चुटकुला सुनाओ',
    labelHinglish: 'Ek joke sunao',
    prompt: 'Tell me a joke',
    icon: 'heart',
    iconName: 'heart',
  },
  {
    id: 'about',
    labelEn: 'Who made you?',
    labelHi: 'तुम्हें किसने बनाया?',
    labelHinglish: 'Tumhe kisne banaya?',
    prompt: 'Who made you?',
    icon: 'user',
    iconName: 'user',
  },
  {
    id: 'languages',
    labelEn: 'Language support',
    labelHi: 'भाषा सहायता',
    labelHinglish: 'Language support',
    prompt: 'Which languages do you support?',
    icon: 'globe',
    iconName: 'globe',
  },
  {
    id: 'math',
    labelEn: 'Calculate 24 × 7',
    labelHi: '24 × 7 कितना होता है?',
    labelHinglish: '24 x 7 kitna hai?',
    prompt: '24 * 7',
    icon: 'code',
    iconName: 'code',
  },
];

function labelFor(command: QuickCommand, language: LanguageCode): string {
  if (language === 'hi') return command.labelHi;
  if (language === 'hinglish') return command.labelHinglish;
  return command.labelEn;
}

export function QuickCommandChips({
  language,
  onSelect,
  disabled,
}: {
  language: LanguageCode;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="sparkles" size={12} color={colors.primary} strokeWidth={2.2} />
          <Text style={[styles.header, { color: colors.textFaint }]}>
            {translate(language, 'home.quickCommands').toUpperCase()}
          </Text>
        </View>
        <View style={[styles.line, { backgroundColor: colors.divider }]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityLabel={translate(language, 'home.quickCommands')}
      >
        {QUICK_COMMANDS.map((command) => (
          <PressableScale
            key={command.id}
            onPress={() => {
              if (disabled) return;
              haptics.light();
              onSelect(command.prompt);
            }}
            disabled={disabled}
            scaleTo={0.95}
            accessibilityLabel={labelFor(command, language)}
            accessibilityHint="Sends this prompt to Jarvis"
            style={styles.chipWrapper}
          >
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <LinearGradient
                colors={[`${colors.primary}14`, `${colors.secondary}0A`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.chipIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Icon name={command.iconName} size={13} color={colors.primary} strokeWidth={2.1} />
              </View>
              <Text numberOfLines={1} style={[styles.chipText, { color: colors.text }]}>
                {labelFor(command, language)}
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  header: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  line: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  scroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 2 },
  chipWrapper: { maxWidth: 240 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '650', letterSpacing: 0.1 },
});