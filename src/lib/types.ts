/** Jarvis — shared domain types. */

export type LanguageCode = 'en' | 'hi' | 'hinglish';

export type ThemeMode = 'system' | 'dark' | 'light';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error' | 'stopped';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  status: MessageStatus;
  /** True when this reply came from the offline demo engine. */
  demo?: boolean;
  /** Populated when status === 'error'. */
  error?: string;
  /** Set when the user repeats/copies the message. */
  spoken?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  /** Generated locally or synced from the cloud. */
  pinned?: boolean;
}

export type AssistantMode = 'push-to-talk' | 'continuous';

export interface Settings {
  /** Preferred UI language + assistant language. */
  language: LanguageCode;
  theme: ThemeMode;
  /** 0.5 – 2.0 */
  speechRate: number;
  /** 0.5 – 2.0 */
  speechPitch: number;
  /** Identifier from Speech.getAvailableVoicesAsync(), or null for default. */
  voiceId: string | null;
  /** Speak assistant replies aloud automatically. */
  autoSpeak: boolean;
  /** Continuous conversation: keep listening after answering. */
  continuousMode: boolean;
  /** Detect "Hey Jarvis" wake word (where supported). */
  wakeWord: boolean;
  hapticsEnabled: boolean;
  /** Send anonymous usage stats — off by default. */
  shareAnalytics: boolean;
  /** Whether the user has seen onboarding. */
  onboarded: boolean;
  /** Preferred startup tab. */
  defaultTab: 'home' | 'chat';
  /** Reduce motion for accessibility. */
  reduceMotion: boolean;
}

export interface QuickCommand {
  id: string;
  labelEn: string;
  labelHi: string;
  labelHinglish: string;
  prompt: string;
  icon: string;
}
