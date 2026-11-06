import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { ChatBubble } from '@/components/ChatBubble';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ChatSkeleton, EmptyState } from '@/components/Feedback';
import { GlassCard } from '@/components/GlassCard';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { translate } from '@/lib/i18n';
import { clipboard, shareText } from '@/lib/clipboard';
import type { ChatMessage } from '@/lib/types';
import { useAssistant } from '@/state/AssistantProvider';
import { useConversations } from '@/state/ConversationsProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const {
    active,
    activeId,
    loading,
    createConversation,
    clearMessages,
    deleteMessage,
  } = useConversations();
  const { sendPrompt, busy, stopResponse, retryLast, speak, stopSpeaking, isSpeaking, demoMode } =
    useAssistant();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const [draft, setDraft] = useState('');
  const [sheetMessage, setSheetMessage] = useState<ChatMessage | null>();
  const [confirmClear, setConfirmClear] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>();
  const inputRef = useRef<TextInput>();

  const messages = active?.messages ?? [];

  // Auto-scroll while the assistant streams.
  useEffect(() => {
    if (atBottom && messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, atBottom]);

  const onScroll = (event: NativeSyntheticEvent<{ contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } }>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setAtBottom(distanceFromBottom < 80);
  };

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    void sendPrompt(text);
  }, [busy, draft, sendPrompt]);

  const onSubmitEditing = (_event: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    submit();
  };

  const onSheetAction = useCallback(
    async (message: ChatMessage, action: string) => {
      switch (action) {
        case 'copy':
          await clipboard.copy(message.content);
          toast.show({ message: t('common.copied'), variant: 'success' });
          break;
        case 'share':
          await shareText(message.content, 'Jarvis');
          break;
        case 'speak':
          await speak(message.content);
          break;
        case 'delete':
          if (activeId) deleteMessage(activeId, message.id);
          break;
        case 'retry':
          await retryLast();
          break;
        default:
          break;
      }
    },
    [activeId, deleteMessage, retryLast, speak, t, toast],
  );

  const sheetActions = useMemo<SheetAction[]>(() => {
    if (!sheetMessage) return [];
    const actions: SheetAction[] = [];
    if (sheetMessage.content) {
      actions.push({ label: t('common.copy'), icon: 'copy', onPress: () => void onSheetAction(sheetMessage, 'copy') });
      actions.push({ label: t('common.share'), icon: 'share', onPress: () => void onSheetAction(sheetMessage, 'share') });
    }
    if (sheetMessage.role === 'assistant' && sheetMessage.content) {
      actions.push({ label: 'Read aloud', icon: 'volume', onPress: () => void onSheetAction(sheetMessage, 'speak') });
    }
    if (sheetMessage.role === 'assistant') {
      actions.push({ label: t('common.retry'), icon: 'refresh', onPress: () => void onSheetAction(sheetMessage, 'retry') });
    }
    actions.push({
      label: t('common.delete'),
      icon: 'trash',
      destructive: true,
      onPress: () => void onSheetAction(sheetMessage, 'delete'),
    });
    return actions;
  }, [onSheetAction, sheetMessage, t]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <ChatBubble
        message={item}
        onLongPress={setSheetMessage}
        onSpeak={(message) => void speak(message.content)}
      />
    ),
    [speak],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const showEmpty = !loading && messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat.title')}</Text>
          {demoMode ? (
            <View style={[styles.demoPill, { borderColor: `${colors.warning}55`, backgroundColor: `${colors.warning}14` }]}>
              <Text style={[styles.demoPillText, { color: colors.warning }]}>{t('home.demoMode')}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          {isSpeaking ? (
            <PressableScale onPress={() => void stopSpeaking()} style={styles.iconBtn} accessibilityLabel={t('home.stopSpeaking')}>
              <View style={[styles.iconBtnInner, { borderColor: colors.surfaceBorder }]}>
                <Icon name="volumeOff" size={16} color={colors.danger} strokeWidth={2} />
              </View>
            </PressableScale>
          ) : null}

          <PressableScale
            onPress={() => setConfirmClear(true)}
            style={styles.iconBtn}
            accessibilityLabel={t('common.clear')}
          >
            <View style={[styles.iconBtnInner, { borderColor: colors.surfaceBorder }]}>
              <Icon name="trash" size={16} color={colors.textMuted} strokeWidth={2} />
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => {
              createConversation();
              toast.show({ message: t('history.newChat'), variant: 'info' });
            }}
            style={styles.iconBtn}
            accessibilityLabel={t('history.newChat')}
          >
            <View style={[styles.iconBtnInner, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}14` }]}>
              <Icon name="plus" size={17} color={colors.primary} strokeWidth={2.2} />
            </View>
          </PressableScale>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <ChatSkeleton />
      ) : showEmpty ? (
        <View style={styles.emptyHost}>
          <EmptyState
            icon="chat"
            title={t('chat.emptyTitle')}
            body={t('chat.emptyBody')}
            action={
              <PressableScale onPress={() => inputRef.current?.focus()} noFeedback>
                <Text style={[styles.emptyLink, { color: colors.primary }]}>{t('chat.placeholder')}</Text>
              </PressableScale>
            }
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={80}
          onContentSizeChange={() => {
            if (atBottom) listRef.current?.scrollToEnd({ animated: false });
          }}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {!atBottom && messages.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.scrollFabHost}>
          <PressableScale
            onPress={() => listRef.current?.scrollToEnd({ animated: true })}
            style={styles.scrollFab}
            accessibilityLabel={t('chat.scrollToBottom')}
          >
            <View
              style={[
                styles.scrollFabInner,
                { backgroundColor: isDark ? 'rgba(20,28,52,0.96)' : '#FFFFFF', borderColor: colors.surfaceBorder },
              ]}
            >
              <Icon name="arrowDown" size={17} color={colors.primary} strokeWidth={2.2} />
            </View>
          </PressableScale>
        </Animated.View>
      ) : null}

      {/* Composer */}
      <View
        style={[
          styles.composer,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 78,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={onSubmitEditing}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={2000}
            returnKeyType="send"
            blurOnSubmit={false}
            accessibilityLabel={t('chat.placeholder')}
            selectionColor={colors.primary}
          />

          <PressableScale
            onPress={busy ? stopResponse : submit}
            disabled={!busy && draft.trim().length === 0}
            style={styles.sendBtn}
            accessibilityLabel={busy ? t('chat.stop') : t('chat.send')}
            accessibilityState={{ disabled: !busy && draft.trim().length === 0 }}
          >
            <View
              style={[
                styles.sendBtnInner,
                { opacity: !busy && draft.trim().length === 0 ? 0.4 : 1 },
              ]}
            >
              <LinearGradient
                colors={busy ? [colors.danger, colors.tertiary] : [colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Icon name={busy ? 'stop' : 'send'} size={17} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </PressableScale>
        </View>

        {busy ? (
          <Animated.View entering={FadeIn.duration(160)} style={styles.typingRow}>
            <View style={[styles.typingDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.typingText, { color: colors.textMuted }]}>{t('chat.streaming')}</Text>
          </Animated.View>
        ) : null}
      </View>

      <ActionSheet
        visible={sheetMessage !== null}
        onClose={() => setSheetMessage(null)}
        title={sheetMessage?.role === 'user' ? t('chat.you') : 'Jarvis'}
        subtitle={sheetMessage?.content?.slice(0, 90)}
        actions={sheetActions}
        cancelLabel={t('common.cancel')}
      />

      <ConfirmDialog
        visible={confirmClear}
        title={t('chat.clearTitle')}
        body={t('chat.clearBody')}
        confirmLabel={t('common.clear')}
        cancelLabel={t('common.cancel')}
        destructive
        icon="trash"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          if (activeId) clearMessages(activeId);
          toast.show({ message: t('chat.cleared'), variant: 'success' });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  demoPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  demoPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36 },
  iconBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingTop: 10, paddingBottom: 16 },
  emptyHost: { flex: 1, justifyContent: 'center' },
  emptyLink: { fontSize: 13.5, fontWeight: '800' },
  scrollFabHost: { position: 'absolute', right: 18, bottom: 200 },
  scrollFab: { width: 42, height: 42 },
  scrollFabInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: { width: 38, height: 38 },
  sendBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7, paddingLeft: 8 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5 },
  typingText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});