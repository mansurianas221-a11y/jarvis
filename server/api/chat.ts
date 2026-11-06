/**
 * Jarvis — streaming chat proxy (Vercel / Node serverless handler).
 *
 * Security model
 * --------------
 * • The AI provider key lives ONLY in the server environment (`AI_API_KEY`).
 *   It is never returned to the client, never logged, never echoed in errors.
 * • Requests must be POSTs from the app. If `AI_ROUTE_SECRET` is set, the
 *   `x-jarvis-secret` header must match it (constant-time compare).
 * • Bodies are validated and bounded: max 24 messages, 4000 chars each.
 *
 * Response format
 * ---------------
 * `text/event-stream` with lines of `data: {"delta":"..."}` and a final
 * `data: [DONE]`. The mobile client understands this shape (see src/lib/ai.ts)
 * and also accepts a plain JSON `{reply}` body.
 *
 * Deploy: drop the `server/` folder on Vercel (or any Node host) and set:
 *   AI_API_KEY, AI_MODEL, AI_BASE_URL (optional), AI_ROUTE_SECRET
 * Then point the app at it with EXPO_PUBLIC_API_BASE_URL.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_MESSAGES = 24;
const MAX_CHARS_PER_MESSAGE = 4000;
const MAX_BODY_BYTES = 96 * 1024;
const UPSTREAM_TIMEOUT_MS = 45_000;

function env(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Constant-time-ish string comparison so secrets do not leak via timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

interface ParsedRequest {
  messages: ChatMessage[];
  language: string;
  stream: boolean;
  temperature: number;
}

function parseBody(raw: unknown): ParsedRequest | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Body must be a JSON object' };
  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body.messages)) return { error: '`messages` must be an array' };
  if (body.messages.length === 0) return { error: '`messages` must not be empty' };
  if (body.messages.length > MAX_MESSAGES) return { error: 'Too many messages' };

  const messages: ChatMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== 'object') return { error: 'Invalid message' };
    const entry = item as Record<string, unknown>;
    const role = entry.role;
    const content = entry.content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      return { error: 'Invalid message role' };
    }
    if (typeof content !== 'string' || !content.trim()) return { error: 'Invalid message content' };
    messages.push({ role, content: content.slice(0, MAX_CHARS_PER_MESSAGE) });
  }

  // Exactly one system prompt, always first.
  const system = messages.filter((m) => m.role === 'system').slice(0, 1);
  const rest = messages.filter((m) => m.role !== 'system');
  const ordered = [...system, ...rest];

  const language = typeof body.language === 'string' ? body.language.slice(0, 16) : 'en';
  const temperature =
    typeof body.temperature === 'number' && Number.isFinite(body.temperature)
      ? Math.min(1.2, Math.max(0, body.temperature))
      : 0.7;

  return { messages: ordered, language, stream: body.stream !== false, temperature };
}

/* -------------------------------------------------------------------------- */
/* Upstream call                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The upstream endpoint is OpenAI-compatible, so swapping providers only means
 * changing AI_BASE_URL / AI_MODEL in the environment.
 */
function upstreamUrl(): string {
  const base = env('AI_BASE_URL') || 'https://api.openai.com/v1';
  return `${base.replace(/\/$/, '')}/chat/completions`;
}

function buildUpstreamRequest(parsed: ParsedRequest, stream: boolean): RequestInit {
  const apiKey = env('AI_API_KEY');
  const model = env('AI_MODEL') || DEFAULT_MODEL;

  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: parsed.messages,
      temperature: parsed.temperature,
      max_tokens: 700,
      stream,
    }),
  };
}

/** Translate upstream status codes into codes the app already understands. */
function statusFor(upstreamStatus: number): number {
  if (upstreamStatus === 401 || upstreamStatus === 403) return 503;
  if (upstreamStatus === 429) return 429;
  if (upstreamStatus >= 500) return 502;
  return 502;
}

function messageFor(status: number): string {
  if (status === 429) return 'Too many requests — please wait a moment.';
  if (status === 503) return 'The AI service is not configured correctly.';
  return 'The AI service is temporarily unavailable.';
}

/* -------------------------------------------------------------------------- */
/* Streaming                                                                  */
/* -------------------------------------------------------------------------- */

/** Pull `delta.content` out of an OpenAI-style SSE chunk. */
function extractDelta(payload: string): string {
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string }; message?: { content?: string } }[];
    };
    const choice = json.choices?.[0];
    return choice?.delta?.content ?? choice?.message?.content ?? '';
  } catch {
    return '';
  }
}

function streamFromUpstream(upstream: Response): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }

      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            const delta = extractDelta(payload);
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }
        if (buffer.trim().startsWith('data:')) {
          const delta = extractDelta(buffer.trim().slice(5).trim());
          if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch {
        // Never surface provider internals; the client shows a retry toast.
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'stream_failed' })}\n\n`),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request): Promise<Response> {
  // 1. Shared secret (optional, but recommended in production).
  const expected = env('AI_ROUTE_SECRET');
  if (expected) {
    const provided = request.headers.get('x-jarvis-secret') ?? '';
    if (!safeEqual(provided, expected)) {
      return json(401, { error: 'unauthorized', message: 'Invalid app secret.' });
    }
  }

  // 2. Provider key must exist server-side only.
  if (!env('AI_API_KEY')) {
    return json(503, {
      error: 'not-configured',
      message: 'AI_API_KEY is not set on the server.',
    });
  }

  // 3. Body size guard before parsing.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json(413, { error: 'too-large', message: 'Request body is too large.' });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'bad-json', message: 'Request body must be valid JSON.' });
  }

  const parsed = parseBody(raw);
  if ('error' in parsed) {
    return json(400, { error: 'bad-request', message: parsed.error });
  }

  // 4. Call the provider with a hard timeout.
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl(), {
      ...buildUpstreamRequest(parsed, parsed.stream),
      signal: abort.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return json(timedOut ? 504 : 502, {
      error: timedOut ? 'timeout' : 'network',
      message: timedOut ? 'The AI service timed out.' : 'Could not reach the AI service.',
    });
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    const status = statusFor(upstream.status);
    // Drain the body without reading provider error text into the response.
    await upstream.text().catch(() => '');
    return json(status, { error: 'upstream', message: messageFor(status) });
  }

  if (parsed.stream && upstream.body) {
    // The timeout only guards connection setup for streaming responses; the
    // stream itself is bounded by the client's own abort signal.
    clearTimeout(timeout);
    return streamFromUpstream(upstream);
  }

  // Non-streaming fallback: single JSON reply.
  try {
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? '';
    clearTimeout(timeout);
    if (!reply.trim()) {
      return json(502, { error: 'empty', message: 'The AI service returned an empty reply.' });
    }
    return json(200, { reply });
  } catch {
    clearTimeout(timeout);
    return json(502, { error: 'bad-upstream', message: messageFor(502) });
  }
}

/** Anything other than POST is rejected explicitly. */
export async function GET(): Promise<Response> {
  return json(405, { error: 'method-not-allowed', message: 'Use POST.' });
}
