/** Jarvis — app-wide constants (no secrets here, ever). */

export const APP_NAME = 'Jarvis';
export const APP_TAGLINE = 'Your AI Companion';
export const APP_VERSION = '1.0.0';

export const DEVELOPER = {
  name: 'Anas Papa',
  telegramHandle: '@AnaxModz',
  /** The exact URL the Telegram CTA must open. */
  telegramUrl: 'https://t.me/AnaxModz',
  telegramLabel: 't.me/AnaxModz',
} as const;

/**
 * Public runtime config. Read from EXPO_PUBLIC_* env vars injected at build
 * time. These are SAFE to ship in the client (never put an AI key here).
 */
export const CONFIG = {
  /** Base URL of the deployed AI route. Empty string => offline demo mode. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  /** Optional shared secret shared with the server route. */
  appSecret: process.env.EXPO_PUBLIC_APP_SECRET ?? '',
  wakeWordEnabled: (process.env.EXPO_PUBLIC_ENABLE_WAKE_WORD ?? 'true') !== 'false',
  demoAllowed: (process.env.EXPO_PUBLIC_DEMO_MODE_ALLOWED ?? 'true') !== 'false',
} as const;

export const WAKE_WORD = 'hey jarvis';

export const STORAGE_KEYS = {
  settings: 'jarvis.settings.v1',
  conversations: 'jarvis.conversations.v1',
  activeConversation: 'jarvis.activeConversation.v1',
  onboarded: 'jarvis.onboarded.v1',
} as const;

/** Speech recognition locale per app language. */
export const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  hinglish: 'en-IN',
};

export const MAX_HISTORY_CONVERSATIONS = 100;
export const MAX_MESSAGES_PER_CONVERSATION = 400;
