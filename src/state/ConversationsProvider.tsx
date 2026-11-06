import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  MAX_HISTORY_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  STORAGE_KEYS,
} from '@/lib/constants';
import { storage } from '@/lib/storage';
import type { ChatMessage, Conversation, MessageStatus } from '@/lib/types';
import { deriveTitle, uid } from '@/lib/utils';

interface ConversationsContextValue {
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  loading: boolean;

  createConversation: () => Conversation;
  selectConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  clearAll: () => void;

  addMessage: (conversationId: string, message: ChatMessage) => void;
  appendToMessage: (conversationId: string, messageId: string, delta: string) => void;
  setMessageStatus: (
    conversationId: string,
    messageId: string,
    status: MessageStatus,
    extra?: Partial<ChatMessage>,
  ) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  clearMessages: (conversationId: string) => void;
  /** Clears everything after (and including) a message id — used by "retry". */
  truncateFrom: (conversationId: string, messageId: string) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

function sanitizeStored(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  const valid: Conversation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<Conversation>;
    if (typeof c.id !== 'string' || !Array.isArray(c.messages)) continue;
    const messages = c.messages
      .filter((m): m is ChatMessage => Boolean(m) && typeof m.id === 'string' && typeof m.content === 'string')
      .map((m) => ({
        ...m,
        // A message that was mid-stream when the app closed can never resume.
        status: m.status === 'streaming' || m.status === 'sending' ? 'done' : m.status,
      }));
    valid.push({
      id: c.id,
      title: typeof c.title === 'string' && c.title ? c.title : 'Conversation',
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
      updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
      messages,
      pinned: Boolean(c.pinned),
    });
  }
  return sortConversations(valid).slice(0, MAX_HISTORY_CONVERSATIONS);
}

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hydrated = useRef(false);

  /* ------------------------------ hydration ----------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedConvos, storedActive] = await Promise.all([
        storage.get<unknown>(STORAGE_KEYS.conversations),
        storage.get<string | null>(STORAGE_KEYS.activeConversation),
      ]);
      if (!mounted) return;
      const list = sanitizeStored(storedConvos);
      setConversations(list);
      if (storedActive && list.some((c) => c.id === storedActive)) {
        setActiveId(storedActive);
      }
      setLoading(false);
      hydrated.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------ persistence --------------------------- */
  useEffect(() => {
    if (!hydrated.current) return;
    // Debounced write so rapid token streaming does not hammer storage.
    const handle = setTimeout(() => {
      void storage.set(STORAGE_KEYS.conversations, conversations.slice(0, MAX_HISTORY_CONVERSATIONS));
    }, 400);
    return () => clearTimeout(handle);
  }, [conversations]);

  useEffect(() => {
    if (!hydrated.current) return;
    void storage.set(STORAGE_KEYS.activeConversation, activeId);
  }, [activeId]);

  /* -------------------------------- helpers ----------------------------- */
  const mutateConversation = useCallback(
    (id: string, updater: (conversation: Conversation) => Conversation) => {
      setConversations((current) => {
        const index = current.findIndex((c) => c.id === id);
        if (index === -1) return current;
        const updated = updater(current[index] as Conversation);
        const next = [...current];
        next[index] = { ...updated, updatedAt: Date.now() };
        return sortConversations(next);
      });
    },
    [],
  );

  /* --------------------------------- API -------------------------------- */
  const createConversation = useCallback((): Conversation => {
    const now = Date.now();
    const conversation: Conversation = {
      id: uid('conv'),
      title: 'New conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setConversations((current) =>
      sortConversations([conversation, ...current]).slice(0, MAX_HISTORY_CONVERSATIONS),
    );
    setActiveId(conversation.id);
    return conversation;
  }, []);

  const selectConversation = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((current) => current.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const renameConversation = useCallback(
    (id: string, title: string) => {
      const clean = title.trim();
      if (!clean) return;
      mutateConversation(id, (c) => ({ ...c, title: clean.slice(0, 80) }));
    },
    [mutateConversation],
  );

  const togglePin = useCallback(
    (id: string) => {
      mutateConversation(id, (c) => ({ ...c, pinned: !c.pinned }));
    },
    [mutateConversation],
  );

  const clearAll = useCallback(() => {
    setConversations([]);
    setActiveId(null);
  }, []);

  const addMessage = useCallback(
    (conversationId: string, message: ChatMessage) => {
      setConversations((current) => {
        const index = current.findIndex((c) => c.id === conversationId);
        if (index === -1) {
          // The conversation may have been created in another tick.
          return sortConversations(
            [
              {
                id: conversationId,
                title: message.role === 'user' ? deriveTitle(message.content) : 'New conversation',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                messages: [message],
              },
              ...current,
            ].slice(0, MAX_HISTORY_CONVERSATIONS),
          );
        }
        const conversation = current[index] as Conversation;
        const messages = [...conversation.messages, message].slice(-MAX_MESSAGES_PER_CONVERSATION);
        const shouldRetitle =
          message.role === 'user' &&
          (conversation.title === 'New conversation' || !conversation.title.trim());
        const next = [...current];
        next[index] = {
          ...conversation,
          messages,
          title: shouldRetitle ? deriveTitle(message.content) : conversation.title,
          updatedAt: Date.now(),
        };
        return sortConversations(next);
      });
    },
    [],
  );

  const appendToMessage = useCallback((conversationId: string, messageId: string, delta: string) => {
    setConversations((current) => {
      const index = current.findIndex((c) => c.id === conversationId);
      if (index === -1) return current;
      const conversation = current[index] as Conversation;
      const msgIndex = conversation.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return current;
      const messages = [...conversation.messages];
      const existing = messages[msgIndex] as ChatMessage;
      messages[msgIndex] = { ...existing, content: existing.content + delta, status: 'streaming' };
      const next = [...current];
      next[index] = { ...conversation, messages, updatedAt: Date.now() };
      return next;
    });
  }, []);

  const setMessageStatus = useCallback(
    (
      conversationId: string,
      messageId: string,
      status: MessageStatus,
      extra?: Partial<ChatMessage>,
    ) => {
      setConversations((current) => {
        const index = current.findIndex((c) => c.id === conversationId);
        if (index === -1) return current;
        const conversation = current[index] as Conversation;
        const msgIndex = conversation.messages.findIndex((m) => m.id === messageId);
        if (msgIndex === -1) return current;
        const messages = [...conversation.messages];
        messages[msgIndex] = { ...(messages[msgIndex] as ChatMessage), ...extra, status };
        const next = [...current];
        next[index] = { ...conversation, messages, updatedAt: Date.now() };
        return next;
      });
    },
    [],
  );

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations((current) => {
      const index = current.findIndex((c) => c.id === conversationId);
      if (index === -1) return current;
      const conversation = current[index] as Conversation;
      const next = [...current];
      next[index] = {
        ...conversation,
        messages: conversation.messages.filter((m) => m.id !== messageId),
        updatedAt: Date.now(),
      };
      return next;
    });
  }, []);

  const clearMessages = useCallback((conversationId: string) => {
    setConversations((current) => {
      const index = current.findIndex((c) => c.id === conversationId);
      if (index === -1) return current;
      const next = [...current];
      next[index] = { ...(current[index] as Conversation), messages: [], updatedAt: Date.now() };
      return next;
    });
  }, []);

  const truncateFrom = useCallback((conversationId: string, messageId: string) => {
    setConversations((current) => {
      const index = current.findIndex((c) => c.id === conversationId);
      if (index === -1) return current;
      const conversation = current[index] as Conversation;
      const msgIndex = conversation.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return current;
      const next = [...current];
      next[index] = {
        ...conversation,
        messages: conversation.messages.slice(0, msgIndex),
        updatedAt: Date.now(),
      };
      return next;
    });
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const value = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      activeId,
      active,
      loading,
      createConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      togglePin,
      clearAll,
      addMessage,
      appendToMessage,
      setMessageStatus,
      deleteMessage,
      clearMessages,
      truncateFrom,
    }),
    [
      conversations,
      activeId,
      active,
      loading,
      createConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      togglePin,
      clearAll,
      addMessage,
      appendToMessage,
      setMessageStatus,
      deleteMessage,
      clearMessages,
      truncateFrom,
    ],
  );

  return (
    <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
  );
}

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used inside <ConversationsProvider>');
  return ctx;
}