import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Linking, Platform, type AppStateStatus } from 'react-native';

import { streamReply, isDemoMode as computeDemoMode, type AiErrorCode } from '@/lib/ai';
import { SPEECH_LOCALES } from '@/lib/constants';
import { isRecognitionSupported, isTtsSupported } from '@/lib/device';
import { translate } from '@/lib/i18n';
import { stt, type SttEvent } from '@/lib/stt';
import { tts } from '@/lib/tts';
import type { ChatMessage, OrbState } from '@/lib/types';
import { sanitizeForSpeech, uid } from '@/lib/utils';
import { useConversations } from './ConversationsProvider';
import { useHaptic, useSettings } from './SettingsProvider';
import { useToast } from './ToastProvider';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface AssistantError {
  code: AiErrorCode | 'mic' | 'permission';
  message: string;
}

interface AssistantContextValue {
  orbState: OrbState;
  transcript: string;
  volume: number;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  busy: boolean;
  demoMode: boolean;
  speechAvailable: boolean;
  micPermission: PermissionStatus;
  error: AssistantError | null;
  lastResponse: string | null;

  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelListening: () => void;
  sendPrompt: (text: string) => Promise<void>;
  stopResponse: () => void;
  retryLast: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  toggleMute: () => void;
  requestMicPermission: () => Promise<PermissionStatus>;
  openSystemSettings: () => Promise<void>;
  clearError: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const haptic = useHaptic();
  const toast = useToast();
  const {
    activeId,
    active,
    createConversation,
    addMessage,
    appendToMessage,
    setMessageStatus,
    truncateFrom,
  } = useConversations();

  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [micPermission, setMicPermission] = useState<PermissionStatus>('unknown');
  const [error, setError] = useState<AssistantError | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* -------------------------------- refs -------------------------------- */
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef('');
  const activeIdRef = useRef<string | null>(activeId);
  const listeningRef = useRef(false);
  const lastPromptRef = useRef<string | null>(null);
  const sendLockRef = useRef(false);
  const mountedRef = useRef(true);
  /** Set false right before a manual abort so no stray auto-send fires. */
  const autoSendRef = useRef(true);

  activeIdRef.current = activeId;

  const speechAvailable = useMemo(() => isRecognitionSupported(), []);
  const demoMode = useMemo(() => computeDemoMode(), []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(settings.language, key, params),
    [settings.language],
  );

  /* --------------------------- mic permission --------------------------- */
  const refreshPermission = useCallback(async () => {
    if (!isRecognitionSupported()) {
      setMicPermission('unavailable');
      return 'unavailable' as PermissionStatus;
    }
    const result = await stt.getPermissions();
    const status: PermissionStatus = result.granted
      ? 'granted'
      : result.canAskAgain
        ? 'unknown'
        : 'denied';
    if (mountedRef.current) setMicPermission(status);
    return status;
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  const requestMicPermission = useCallback(async (): Promise<PermissionStatus> => {
    const result = await stt.requestPermissions();
    const status: PermissionStatus = result.granted
      ? 'granted'
      : result.canAskAgain
        ? 'unknown'
        : 'denied';
    if (mountedRef.current) setMicPermission(status);
    if (result.granted) haptic.success();
    return status;
  }, [haptic]);

  const openSystemSettings = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      toast.show({ message: t('perm.openSettings'), variant: 'warning' });
    }
  }, [t, toast]);

  /* ------------------------------- speech ------------------------------- */
  const stopSpeaking = useCallback(async () => {
    await tts.stop();
    if (!mountedRef.current) return;
    setIsSpeaking(false);
    setOrbState((current) => (current === 'speaking' ? 'idle' : current));
    haptic.tap();
  }, [haptic]);

  const speak = useCallback(
    async (text: string) => {
      if (isMuted || !isTtsSupported()) return;
      const clean = sanitizeForSpeech(text);
      if (!clean) return;

      setIsSpeaking(true);
      setOrbState('speaking');
      await tts.speak({
        text: clean,
        language: SPEECH_LOCALES[settings.language] ?? 'en-US',
        voiceId: settings.voiceId,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        onStart: () => {
          if (!mountedRef.current) return;
          setOrbState('speaking');
          setIsSpeaking(true);
        },
        onDone: () => {
          if (!mountedRef.current) return;
          setIsSpeaking(false);
          setOrbState('idle');
        },
        onStopped: () => {
          if (!mountedRef.current) return;
          setIsSpeaking(false);
          setOrbState('idle');
        },
        onError: () => {
          if (!mountedRef.current) return;
          setIsSpeaking(false);
          setOrbState('idle');
          toast.show({ message: t('settings.speechUnavailable'), variant: 'warning' });
        },
      });
    },
    [
      isMuted,
      settings.language,
      settings.speechPitch,
      settings.speechRate,
      settings.voiceId,
      t,
      toast,
    ],
  );

  /* ------------------------------ listening ----------------------------- */
  const resetCapture = useCallback(() => {
    listeningRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    setVolume(0);
  }, []);

  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const finalizeRef = useRef<() => void>(() => {});

  const handleSttEvent = useCallback(
    (event: SttEvent) => {
      if (!mountedRef.current) return;
      switch (event.type) {
        case 'start':
          listeningRef.current = true;
          setOrbState('listening');
          break;

        case 'volume':
          setVolume(Math.min(1, Math.max(0, event.value / 10)));
          break;

        case 'result': {
          transcriptRef.current = event.transcript;
          setTranscript(event.transcript);
          if (event.isFinal && autoSendRef.current && event.transcript.trim()) {
            finalizeRef.current();
          }
          break;
        }

        case 'end':
          listeningRef.current = false;
          setVolume(0);
          setOrbState((current) => (current === 'listening' ? 'idle' : current));
          break;

        case 'error': {
          listeningRef.current = false;
          setVolume(0);
          setOrbState((current) => (current === 'listening' ? 'idle' : current));

          if (event.code === 'no-speech' || event.code === 'aborted') {
            toast.show({ message: t('toast.noSpeech'), variant: 'info' });
          } else if (event.code === 'not-allowed' || event.code === 'service-not-allowed') {
            setMicPermission('denied');
            setError({ code: 'permission', message: t('perm.deniedBody') });
            void refreshPermission();
          } else if (event.code === 'language-not-supported') {
            setError({ code: 'mic', message: t('perm.notAvailable') });
          } else if (event.code === 'network') {
            setError({ code: 'mic', message: t('error.network') });
          } else {
            setError({ code: 'mic', message: event.message || t('error.mic') });
          }
          break;
        }

        default:
          break;
      }
    },
    [refreshPermission, t, toast],
  );

  useEffect(() => {
    const unsubscribe = stt.on(handleSttEvent);
    return unsubscribe;
  }, [handleSttEvent]);

  const finalizeSpeech = useCallback(() => {
    const text = transcriptRef.current.trim();
    resetCapture();
    if (text) {
      haptic.medium();
      void sendRef.current(text);
    } else {
      setOrbState('idle');
    }
  }, [haptic, resetCapture]);

  const startListening = useCallback(async () => {
    if (listeningRef.current) return;
    if (isSpeaking) await tts.stop();
    setIsSpeaking(false);

    if (!isRecognitionSupported()) {
      setError({ code: 'mic', message: t('perm.speechBody') });
      toast.show({ message: t('perm.notAvailable'), variant: 'warning' });
      return;
    }

    let permission = micPermission;
    if (permission !== 'granted') {
      permission = await requestMicPermission();
    }
    if (permission !== 'granted') {
      const unavailable = permission === 'unavailable';
      setError({
        code: unavailable ? 'mic' : 'permission',
        message: unavailable ? t('perm.speechBody') : t('perm.body'),
      });
      toast.show({
        message: unavailable ? t('perm.notAvailable') : t('toast.micDenied'),
        variant: 'warning',
        actionLabel: unavailable ? undefined : t('perm.openSettings'),
        onAction: unavailable ? undefined : () => void openSystemSettings(),
      });
      return;
    }

    setError(null);
    autoSendRef.current = true;
    transcriptRef.current = '';
    setTranscript('');

    const started = stt.start({
      locale: SPEECH_LOCALES[settings.language] ?? 'en-US',
      continuous: false,
      interim: true,
      volumeMetering: true,
    });

    if (started) {
      listeningRef.current = true;
      setOrbState('listening');
      haptic.medium();
    } else {
      setError({ code: 'mic', message: t('error.mic') });
      toast.show({ message: t('error.mic'), variant: 'error' });
    }
  }, [
    haptic,
    isSpeaking,
    micPermission,
    openSystemSettings,
    requestMicPermission,
    settings.language,
    t,
    toast,
  ]);

  const stopListening = useCallback(() => {
    if (!listeningRef.current) return;
    autoSendRef.current = true;
    stt.stop();
    // Safety net: if the recogniser never delivers a final result, settle the
    // UI and send whatever we captured.
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (listeningRef.current) finalizeRef.current();
    }, 1200);
  }, []);

  const cancelListening = useCallback(() => {
    autoSendRef.current = false;
    stt.abort();
    resetCapture();
    setOrbState('idle');
    haptic.tap();
  }, [haptic, resetCapture]);

  /* ------------------------------ requests ------------------------------ */
  const runCompletion = useCallback(
    async (conversationId: string, history: ChatMessage[]) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setOrbState('thinking');

      const assistantId = uid('msg');
      addMessage(conversationId, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      });

      let full = '';
      let failure: { code: AiErrorCode; message: string; retryable: boolean } | null = null;
      let demo = false;

      try {
        for await (const event of streamReply({
          messages: history,
          language: settings.language,
          signal: controller.signal,
        })) {
          if (event.type === 'delta') {
            full += event.text;
            appendToMessage(conversationId, assistantId, event.text);
          } else if (event.type === 'done') {
            demo = event.demo;
            if (event.full && !full) full = event.full;
            setMessageStatus(conversationId, assistantId, 'done', {
              content: full,
              demo: event.demo,
            });
          } else if (event.type === 'error' && event.code !== 'aborted') {
            failure = event;
          }
        }
      } catch (err) {
        failure = {
          code: 'server',
          message: err instanceof Error ? err.message : 'Unexpected error',
          retryable: true,
        };
      } finally {
        abortRef.current = null;
        if (mountedRef.current) setBusy(false);
      }

      if (!mountedRef.current) return;

      if (failure) {
        const message = mapErrorMessage(failure.code, t);
        setError({ code: failure.code, message });
        setMessageStatus(conversationId, assistantId, 'error', {
          content: full,
          error: message,
        });
        setOrbState('error');
        haptic.error();
        toast.show({
          message,
          variant: 'error',
          actionLabel: failure.retryable ? t('common.retry') : undefined,
          onAction: failure.retryable ? () => void retryRef.current() : undefined,
        });
        return;
      }

      if (!full.trim()) {
        setMessageStatus(conversationId, assistantId, 'error', { error: t('chat.failed') });
        setOrbState('idle');
        haptic.warning();
        return;
      }

      setLastResponse(full);
      setOrbState('idle');
      haptic.success();
      void demo;

      if (settings.autoSpeak && !isMuted) {
        await speak(full);
      }
    },
    [
      addMessage,
      appendToMessage,
      haptic,
      isMuted,
      settings.autoSpeak,
      settings.language,
      setMessageStatus,
      speak,
      t,
      toast,
    ],
  );

  const sendPrompt = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sendLockRef.current) return;
      sendLockRef.current = true;

      await tts.stop();
      if (mountedRef.current) {
        setIsSpeaking(false);
        setError(null);
      }
      lastPromptRef.current = text;

      let conversationId = activeIdRef.current;
      if (!conversationId) {
        conversationId = createConversation().id;
        activeIdRef.current = conversationId;
      }

      const userMessage: ChatMessage = {
        id: uid('msg'),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        status: 'done',
      };

      const history = [...(active?.id === conversationId ? active.messages : []), userMessage];
      addMessage(conversationId, userMessage);

      try {
        await runCompletion(conversationId, history);
      } finally {
        sendLockRef.current = false;
      }
    },
    [active, addMessage, createConversation, runCompletion],
  );

  const retryLast = useCallback(async () => {
    const prompt = lastPromptRef.current;
    if (!prompt) return;
    const conversationId = activeIdRef.current;
    if (conversationId && active) {
      const lastAssistant = [...active.messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) truncateFrom(conversationId, lastAssistant.id);
    }
    setError(null);
    toast.show({ message: t('toast.retrying'), variant: 'info' });
    await sendPrompt(prompt);
  }, [active, sendPrompt, t, toast, truncateFrom]);

  const retryRef = useRef(retryLast);
  retryRef.current = retryLast;
  sendRef.current = sendPrompt;
  finalizeRef.current = finalizeSpeech;

  const stopResponse = useCallback(() => {
    autoSendRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    void tts.stop();
    setIsSpeaking(false);
    setBusy(false);
    setOrbState('idle');
    haptic.tap();
  }, [haptic]);

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      if (next) {
        void tts.stop();
        setIsSpeaking(false);
      }
      haptic.tap();
      toast.show({ message: next ? 'Muted' : 'Unmuted', variant: 'info' });
      return next;
    });
  }, [haptic, toast]);

  const clearError = useCallback(() => setError(null), []);

  /* ---------------------------- app lifecycle --------------------------- */
  useEffect(() => {
    mountedRef.current = true;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') return;
      if (listeningRef.current) {
        autoSendRef.current = false;
        stt.abort();
        resetCapture();
      }
      void tts.stop();
      setIsSpeaking(false);
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
      setOrbState('idle');
    });
    return () => {
      mountedRef.current = false;
      sub.remove();
      stt.abort();
      void tts.stop();
      abortRef.current?.abort();
    };
  }, [resetCapture]);

  /* ------------------------- continuous conversation -------------------- */
  useEffect(() => {
    if (!settings.continuousMode || busy || isSpeaking || orbState !== 'idle') return;
    if (!active || active.messages.length === 0) return;
    const last = active.messages[active.messages.length - 1];
    if (!last || last.role !== 'assistant' || last.status !== 'done') return;
    const timer = setTimeout(() => {
      if (!listeningRef.current) void startListening();
    }, 1000);
    return () => clearTimeout(timer);
  }, [orbState, isSpeaking, busy, settings.continuousMode, active, startListening]);

  const isListening = orbState === 'listening';
  const isThinking = orbState === 'thinking';

  const value = useMemo<AssistantContextValue>(
    () => ({
      orbState,
      transcript,
      volume,
      isListening,
      isThinking,
      isSpeaking,
      isMuted,
      busy,
      demoMode,
      speechAvailable,
      micPermission,
      error,
      lastResponse,
      startListening,
      stopListening,
      cancelListening,
      sendPrompt,
      stopResponse,
      retryLast,
      speak,
      stopSpeaking,
      toggleMute,
      requestMicPermission,
      openSystemSettings,
      clearError,
    }),
    [
      orbState,
      transcript,
      volume,
      isListening,
      isThinking,
      isSpeaking,
      isMuted,
      busy,
      demoMode,
      speechAvailable,
      micPermission,
      error,
      lastResponse,
      startListening,
      stopListening,
      cancelListening,
      sendPrompt,
      stopResponse,
      retryLast,
      speak,
      stopSpeaking,
      toggleMute,
      requestMicPermission,
      openSystemSettings,
      clearError,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

function mapErrorMessage(code: AiErrorCode, t: (key: string) => string): string {
  switch (code) {
    case 'network':
      return t('error.network');
    case 'timeout':
      return t('error.timeout');
    case 'rate-limit':
      return t('ai.rateLimited');
    case 'server':
      return t('error.server');
    default:
      return t('ai.errorReply');
  }
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used inside <AssistantProvider>');
  return ctx;
}