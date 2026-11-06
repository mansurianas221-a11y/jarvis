import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, Skeleton } from '@/components/Feedback';
import { GlowDivider } from '@/components/ScreenHeader';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { translate } from '@/lib/i18n';
import { formatRelative } from '@/lib/utils';
import type { Conversation } from '@/lib/types';
import { useConversations } from '@/state/ConversationsProvider';
import { useSettings } from '@/state/SettingsProvider';
import { useToast } from '@/state/ToastProvider';
import { useTheme } from '@/theme';

/** Screen 5 — History. Search, open, pin, rename and delete conversations. */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const {
    conversations,
    loading,
    activeId,
    selectConversation,
    deleteConversation,
    clearAll,
    togglePin,
    renameConversation,
  } = useConversations();

  const t = useCallback((key: string) => translate(settings.language, key), [settings.language]);

  const [query, setQuery] = useState('');
  const [sheetFor, setSheetFor] = useState<Conversation | null>();
  const [renaming, setRenaming] = useState<Conversation | null>();
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>();
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conversation) => {
      if (conversation.title.toLowerCase().includes(q)) return true;
      return conversation.messages.some((message) => message.content.toLowerCase().includes(q));
    });
  }, [conversations, query]);

  const open = useCallback(
    (conversation: Conversation) => {
      selectConversation(conversation.id);
      router.push('/(tabs)/chat');
    },
    [router, selectConversation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Conversation>) => {
      const isActive = item.id === activeId;
      const lastMessage = item.messages[item.messages.length - 1];
      return (
        <Animated.View entering={FadeInDown.duration(260)} layout={Layout.springify().damping(18)}>
          <PressableScale
            onPress={() => open(item)}
            onLongPress={() => setSheetFor(item)}
            noFeedback
            accessibilityLabel={`${item.title}, ${item.messages.length} ${t('history.messages')}`}
            accessibilityHint="Long press for options"
            style={styles.rowWrapper}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(18,24,44,0.5)' : 'rgba(255,255,255,0.66)',
                  borderColor: isActive ? `${colors.primary}66` : colors.surfaceBorder,
                },
                isActive && { shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 14 },
              ]}
            >
              {item.pinned ? (
                <View style={[styles.pinFlag, { backgroundColor: colors.primary }]} />
              ) : null}

              <View
                style={[
                  styles.chevronHost,
                  { backgroundColor: isDark ? `${colors.primary}14` : `${colors.primary}0E` },
                ]}
              >
                <Icon name="chat" size={17} color={colors.primary} strokeWidth={2} />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  {item.pinned ? (
                    <Icon name="pin" size={12} color={colors.primary} strokeWidth={2} filled />
                  ) : null}
                </View>

                <Text numberOfLines={1} style={[styles.preview, { color: colors.textMuted }]}>
                  {lastMessage?.content || t('chat.emptyTitle')}
                </Text>

                <View style={styles.cardMeta}>
                  <Text style={[styles.meta, { color: colors.textFaint }]}>
                    {formatRelative(item.updatedAt)}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: colors.textFaint }]} />
                  <Text style={[styles.meta, { color: colors.textFaint }]}>
                    {item.messages.length} {t('history.messages')}
                  </Text>
                </View>
              </View>

              <Icon name="chevronRight" size={16} color={colors.textFaint} />
            </View>
          </PressableScale>
        </Animated.View>
      );
    },
    [activeId, colors, isDark, open, settings.language, t],
  );

  const sheetActions = useMemo<SheetAction[]>(() => {
    if (!sheetFor) return [];
    return [
      {
        label: t('history.newChat'),
        icon: 'chat',
        onPress: () => {
          selectConversation(sheetFor.id);
          router.push('/(tabs)/chat');
        },
      },
      {
        label: sheetFor.pinned ? t('history.unpin') : t('history.pin'),
        icon: sheetFor.pinned ? 'pinOff' : 'pin',
        onPress: () => togglePin(sheetFor.id),
      },
      {
        label: t('history.rename'),
        icon: 'edit',
        onPress: () => {
          setRenameValue(sheetFor.title);
          setRenaming(sheetFor);
        },
      },
      {
        label: t('common.delete'),
        icon: 'trash',
        destructive: true,
        onPress: () => setDeleteTarget(sheetFor),
      },
    ];
  }, [router, selectConversation, sheetFor, t, togglePin]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('history.title')}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {conversations.length} {t('history.messages')}
          </Text>
        </View>

        {conversations.length > 0 ? (
          <PressableScale onPress={() => setConfirmClearAll(true)} accessibilityLabel={t('history.clearAll')}>
            <View style={[styles.clearBtn, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}10` }]}>
              <Icon name="trash" size={14} color={colors.danger} strokeWidth={2} />
              <Text style={[styles.clearText, { color: colors.danger }]}>{t('history.clearAll')}</Text>
            </View>
          </PressableScale>
        ) : null}
      </View>

      {conversations.length > 0 ? (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Icon name="search" size={16} color={colors.textFaint} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('history.searchPlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={[styles.searchInput, { color: colors.text }]}
            selectionColor={colors.primary}
            accessibilityLabel={t('history.searchPlaceholder')}
          />
          {query.length > 0 ? (
            <PressableScale onPress={() => setQuery('')} accessibilityLabel={t('common.clear')}>
              <Icon name="close" size={15} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={82} borderRadius={18} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyHost}>
          <EmptyState
            icon={query ? 'search' : 'history'}
            title={query ? t('history.noResults') : t('history.emptyTitle')}
            body={query ? undefined : t('history.emptyBody')}
            action={
              query ? undefined : (
                <PressableScale
                  onPress={() => {
                    router.push('/(tabs)/index');
                  }}
                  noFeedback
                >
                  <Text style={[styles.emptyLink, { color: colors.primary }]}>{t('history.newChat')}</Text>
                </PressableScale>
              )
            }
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={GlowDivider}
        />
      )}

      <ActionSheet
        visible={sheetFor !== null}
        onClose={() => setSheetFor(null)}
        title={sheetFor?.title}
        subtitle={sheetFor ? `${sheetFor.messages.length} ${t('history.messages')}` : undefined}
        actions={sheetActions}
        cancelLabel={t('common.cancel')}
      />

      <ConfirmDialog
        visible={deleteTarget !== null}
        title={t('history.deleteTitle')}
        body={t('history.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon="trash"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteConversation(deleteTarget.id);
          setDeleteTarget(null);
          toast.show({ message: t('history.deleted'), variant: 'success' });
        }}
      />

      <ConfirmDialog
        visible={confirmClearAll}
        title={t('history.clearAllTitle')}
        body={t('history.clearAllBody')}
        confirmLabel={t('history.clearAll')}
        cancelLabel={t('common.cancel')}
        destructive
        icon="alert"
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClearAll(false);
          toast.show({ message: t('history.allCleared'), variant: 'success' });
        }}
      />

      <RenameDialog
        visible={renaming !== null}
        value={renameValue}
        onChange={setRenameValue}
        title={t('history.rename')}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
        placeholder={t('history.rename')}
        onCancel={() => setRenaming(null)}
        onSave={() => {
          if (renaming && renameValue.trim()) renameConversation(renaming.id, renameValue);
          setRenaming(null);
        }}
      />
    </View>
  );
}

/** Simple rename dialog with a focused text field. */
function RenameDialog({
  visible,
  value,
  onChange,
  title,
  placeholder,
  cancelLabel,
  saveLabel,
  onCancel,
  onSave,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  title: string;
  placeholder: string;
  cancelLabel: string;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.renameRoot}>
        <PressableScale onPress={onCancel} style={StyleSheet.absoluteFill} noFeedback>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(2,4,10,0.78)' : 'rgba(10,20,40,0.4)' },
            ]}
          />
        </PressableScale>

        <View
          style={[
            styles.renameBubble,
            { backgroundColor: isDark ? 'rgba(16,22,42,0.99)' : '#FFFFFF', borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.renameTitle, { color: colors.text }]}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            autoFocus
            selectTextOnFocus
            onSubmitEditing={onSave}
            returnKeyType="done"
            maxLength={80}
            style={[styles.renameInput, { color: colors.text, borderColor: colors.surfaceBorder }]}
            selectionColor={colors.primary}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            accessibilityLabel={title}
          />
          <View style={styles.renameActions}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} variant="outline" onPress={onCancel} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={saveLabel} onPress={onSave} fullWidth />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearText: { fontSize: 11.5, fontWeight: '800' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14.5, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 110 },
  rowWrapper: { paddingVertical: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pinFlag: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  chevronHost: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14.5, fontWeight: '800', flexShrink: 1, letterSpacing: 0.1 },
  preview: { fontSize: 12.5, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 },
  meta: { fontSize: 10.5, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  emptyHost: { flex: 1, justifyContent: 'center' },
  emptyLink: { fontSize: 13.5, fontWeight: '800' },
  skeletonList: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  renameRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  renameBubble: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  renameTitle: { fontSize: 17, fontWeight: '800' },
  renameInput: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  renameActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
});