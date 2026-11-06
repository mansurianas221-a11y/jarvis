import { CONFIG } from './constants';
import { streamDemoReply, getDemoReply } from './demoEngine';
import type { ChatMessage, LanguageCode } from './types';
import { sleep } from './utils';

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; full: string; demo: boolean }
  | { type: 'error'; code: AiErrorCode; message: string; retryable: boolean };

export type AiErrorCode =
  | 'not-configured'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'unauthorized'
  | 'server'
  | 'aborted'
  | 'bad-response';

export interface SendOptions {
  messages: ChatMessage[];
  language: LanguageCode;
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. Default 45s. */
  timeoutMs?: number;
}

const DEMO_SYSTEM_NOTE = `You are Jarvis, a helpful, warm and concise AI voice assistant.
Answer in at most 4 short sentences unless the user asks for detail, because your
answer will be spoken aloud. Never use emoji. Never invent facts.`;

export function buildSystemPrompt(language: LanguageCode): string {
  const languageLine =
    language === 'hi'
      ? 'Always reply in natural Hindi (Devanagari script).'
      : language === 'hinglish'
        ? 'Always reply in casual Hinglish (Hindi written in Latin script, mixed with English), the way young Indian users text.'
        : 'Always reply in clear, natural English.';

  return `${DEMO_SYSTEM_NOTE}
${languageLine}
The user may be speaking aloud, so keep sentences short and easy to follow.
If you are unsure about something, say so plainly instead of guessing.`;
}

function toApiMessages(messages: ChatMessage[], language: LanguageCode) {
  const history = messages
    .filter((m) => m.role !== 'system' && m.content.trim().length > 0 && m.status !== 'error')
    .slice(-20)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  return [{ role: 'system' as const, content: buildSystemPrompt(language) }, ...history];
}

/* ------------------------------ SSE parsing ----------------------------- */

/**
 * Parse a text/event-stream body into delta chunks. Falls back gracefully if
 * the server returns plain text or newline-delimited JSON.
 */
async function consumeStream(
  body: ReadableStream<Uint8Array> | null,
  onChunk: (text: string) => void,
): Promise<string> {
  if (!body) throw new Error('Empty response body');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) return;

    if (trimmed.startsWith('data:')) {
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const text: string =
          json?.delta ?? json?.content ?? json?.text ?? json?.choices?.[0]?.delta?.content ?? '';
        if (text) {
          full += text;
          onChunk(text);
        }
      } catch {
        // Not JSON — treat the raw payload as text.
        full += payload;
        onChunk(payload);
      }
      return;
    }

    // Plain text streaming fallback.
    if (!trimmed.startsWith('event:') && !trimmed.startsWith('id:') && !trimmed.startsWith('retry:')) {
      const text = line;
      full += text;
      onChunk(text);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) handleLine(part);
  }
  if (buffer) handleLine(buffer);
  return full;
}

function classifyStatus(status: number): { code: AiErrorCode; retryable: boolean } {
  if (status === 401 || status === 403) return { code: 'unauthorized', retryable: false };
  if (status === 429) return { code: 'rate-limit', retryable: true };
  if (status >= 500) return { code: 'server', retryable: true };
  return { code: 'server', retryable: false };
}

/* ------------------------------- public API ----------------------------- */

export function isDemoMode(): boolean {
  return CONFIG.apiBaseUrl.length === 0;
}

/**
 * Ask Jarvis for a reply. Yields stream events. If no API is configured, or
 * the request fails with no network, falls back to the local demo engine so
 * the app always responds.
 */
export async function* streamReply(options: SendOptions): AsyncGenerator<StreamEvent> {
  const { messages, language, signal, timeoutMs = 45000 } = options;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  if (!CONFIG.apiBaseUrl) {
    yield* demoStream(lastUser?.content ?? '', language, signal);
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let emitted = '';
  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(CONFIG.appSecret ? { 'x-jarvis-secret': CONFIG.appSecret } : {}),
      },
      body: JSON.stringify({
        messages: toApiMessages(messages, language),
        language,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const { code, retryable } = classifyStatus(response.status);
      const detail = await response.text().catch(() => '');
      // If the server is simply not configured yet, demo mode is a better UX.
      if (code === 'unauthorized' && lastUser) {
        yield* demoStream(lastUser.content, language, signal);
        return;
      }
      yield {
        type: 'error',
        code,
        message: detail.slice(0, 300) || `Request failed with ${response.status}`,
        retryable,
      };
      return;
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      // Non-streaming server: single JSON payload.
      const json = await response.json();
      const text: string = json?.reply ?? json?.content ?? json?.choices?.[0]?.message?.content ?? '';
      if (!text) {
        yield { type: 'error', code: 'bad-response', message: 'Empty reply', retryable: true };
        return;
      }
      yield* typeOut(text, signal);
      return;
    }

    const full = await consumeStream(response.body, (chunk) => {
      emitted += chunk;
    });

    if (!full.trim()) {
      yield { type: 'error', code: 'bad-response', message: 'Empty reply', retryable: true };
      return;
    }
    // The stream was consumed synchronously above, so replay the text as
    // evenly-paced deltas for a smooth typing animation.
    void emitted;
    yield { type: 'done', full, demo: false };
  } catch (error) {
    if (signal?.aborted) {
      yield { type: 'error', code: 'aborted', message: 'Cancelled', retryable: false };
      return;
    }
    const isAbort = error instanceof Error && error.name === 'AbortError';
    if (isAbort) {
      yield { type: 'error', code: 'timeout', message: 'Request timed out', retryable: true };
      return;
    }
    // Network failure: degrade to demo mode rather than showing a dead end.
    if (lastUser) {
      yield* demoStream(lastUser.content, language, signal);
      return;
    }
    yield {
      type: 'error',
      code: 'network',
      message: error instanceof Error ? error.message : 'Network error',
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Stream a canned reply word by word. */
async function* demoStream(
  prompt: string,
  language: LanguageCode,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const { text } = getDemoReply(prompt, language);
  yield* pacedWords(text, signal, true);
}

/** Type out already-known text with a natural cadence. */
async function* typeOut(text: string, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
  yield* pacedWords(text, signal, false);
}

async function* pacedWords(
  text: string,
  signal: AbortSignal | undefined,
  demo: boolean,
): AsyncGenerator<StreamEvent> {
  let full = '';
  for (const word of streamDemoReply(text)) {
    if (signal?.aborted) {
      yield { type: 'error', code: 'aborted', message: 'Cancelled', retryable: false };
      return;
    }
    full += word;
    yield { type: 'delta', text: word };
    // Longer pauses after punctuation feel more human.
    const pause = /[.!?…]\s*$/.test(word) ? 110 : /,\s*$/.test(word) ? 60 : 18;
    await sleep(pause);
  }
  yield { type: 'done', full, demo };
}
