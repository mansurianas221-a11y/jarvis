import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { formatTime } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export interface ChatBubbleProps {
  message: ChatMessage;
  /** Hide the bubble chrome for streaming placeholders. */
  compact?: boolean;
  onLongPress?: (message: ChatMessage) => void;
  onSpeak?: (message: ChatMessage) => void;
}

/**
 * Chat bubble with role-aware styling, timestamp, delivery status,
 * a demo badge, and an inline "speak" affordance on assistant messages.
 */
export function ChatBubble({ message, onLongPress, onSpeak }: ChatBubbleProps) {
  const { colors, isDark } = useTheme();
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const [cursorOn, setCursorOn] = useState(true);

  // Blinking caret while the assistant is typing.
  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => setCursorOn((v) => !v), 520);
    return () => clearInterval(timer);
  }, [isStreaming]);

  const bubbleColor = isUser ? colors.bubbleUser : colors.bubbleAssistant;
  const borderColor = isError
    ? `${colors.danger}66`
    : isUser
      ? colors.bubbleUserBorder
      : colors.bubbleAssistantBorder;

  return (
    <Animated.View
      entering={FadeInDown.duration(240).springify().damping(18)}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      {!isUser ? (
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(109,74,224,0.12)',
              borderColor: `${colors.secondary}55`,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon name="bot" size={15} color={colors.secondary} strokeWidth={2} />
        </View>
      ) : null}

      <View style={styles.contentCol}>
        <PressableScale
          noFeedback
          onLongPress={onLongPress ? () => onLongPress(message) : undefined}
          accessibilityLabel={`${isUser ? 'You' : 'Jarvis'} said: ${message.content || 'empty message'}`}
          accessibilityHint="Long press for message actions"
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleColor,
              borderColor,
            },
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {message.content ? (
            <Text
              selectable
              style={[styles.text, { color: colors.text }, isError && { color: colors.textMuted }]}
            >
              {message.content}
              {isStreaming && cursorOn ? (
                <Text style={{ color: colors.primary }}>▍</Text>
              ) : null}
            </Text>
          ) : (
            <TypingDots />
          )}

          {isError && message.error ? (
            <View style={styles.errorRow}>
              <Icon name="alert" size={12} color={colors.danger} strokeWidth={2.2} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{message.error}</Text>
            </View>
          ) : null}
        </PressableScale>

        <View style={[styles.metaRow, isUser ? styles.metaRowUser : null]}>
          <Text style={[styles.time, { color: colors.textFaint }]}>
            {formatTime(message.createdAt)}
          </Text>

          {isUser ? <StatusChip status={message.status} /> : null}

          {!isUser && message.demo ? (
            <View style={[styles.demoBadge, { borderColor: `${colors.warning}55` }]}>
              <Text style={[styles.demoText, { color: colors.warning }]}>DEMO</Text>
            </View>
          ) : null}

          {!isUser && message.status === 'done' && onSpeak && message.content ? (
            <PressableScale
              onPress={() => onSpeak(message)}
              style={styles.speakBtn}
              accessibilityLabel="Read this reply aloud"
            >
              <Icon name="volume" size={13} color={colors.textFaint} strokeWidth={2} />
            </PressableScale>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function StatusChip({ status }: { status: ChatMessage['status'] }) {
  const { colors } = useTheme();
  if (status === 'sending' || status === 'streaming') {
    return (
      <View style={styles.statusRow}>
        <Icon name="refresh" size={11} color={colors.textFaint} strokeWidth={2} />
        <Text style={[styles.statusText, { color: colors.textFaint }]}>Sending</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.statusRow}>
        <Icon name="alert" size={11} color={colors.danger} strokeWidth={2} />
        <Text style={[styles.statusText, { color: colors.danger }]}>Failed</Text>
      </View>
    );
  }
  return (
    <View style={styles.statusRow}>
      <Icon name="check" size={12} color={colors.primary} strokeWidth={2.6} />
    </View>
  );
}

/** Three-dot "typing" indicator with staggered opacity. */
function TypingDots() {
  const { colors } = useTheme();
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const loop = (sv: typeof dot1, delay: number) => {
      const timer = setInterval(() => {
        sv.value = withTiming(sv.value > 0.6 ? 0.3 : 1, { duration: 320 });
      }, 380);
      return timer;
    };
    const t1 = loop(dot1, 0);
    const t2 = loop(dot2, 120);
    const t3 = loop(dot3, 240);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, [dot1, dot2, dot3]);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typing} accessibilityLabel="Jarvis is typing">
      <Animated.View style={[styles.dot, { backgroundColor: colors.secondary }, s1]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.secondary }, s2]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.secondary }, s3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 16, gap: 8 },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  contentCol: { maxWidth: '82%' },
  bubble: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { borderBottomRightRadius: 6 },
  bubbleAssistant: { borderBottomLeftRadius: 6 },
  text: { fontSize: 15, lineHeight: 22, letterSpacing: 0.1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  metaRowUser: { justifyContent: 'flex-end' },
  time: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  demoBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  demoText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  speakBtn: { padding: 2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  errorText: { fontSize: 11.5, fontWeight: '600', flexShrink: 1 },
  typing: { flexDirection: 'row', gap: 4, paddingVertical: 5, paddingHorizontal: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});