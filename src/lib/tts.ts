import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { sanitizeForSpeech } from './utils';

export interface TtsVoice {
  id: string;
  name: string;
  language: string;
  quality?: string;
}

export interface SpeakOptions {
  text: string;
  language?: string;
  voiceId?: string | null;
  /** 0.5 – 2.0, default 1.0 */
  rate?: number;
  /** 0.5 – 2.0, default 1.0 */
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
  /** Called for each word boundary with the character index reached. */
  onProgress?: (charIndex: number) => void;
}

function chunkForSpeech(text: string, max: number): string[] {
  const clean = text.trim();
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?…\n]+[.!?…\n]?/g) ?? [clean];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > max) {
      if (current) chunks.push(current.trim());
      if (sentence.length > max) {
        for (let i = 0; i < sentence.length; i += max) {
          chunks.push(sentence.slice(i, i + max).trim());
        }
        current = '';
      } else {
        current = sentence;
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

class TtsService {
  private voices: TtsVoice[] | null = null;
  private loading: Promise<TtsVoice[]> | null = null;
  private speaking = false;
  private lastCharIndex = 0;
  private listeners = new Set<(speaking: boolean) => void>();

  onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb(this.speaking);
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  getLastCharIndex(): number {
    return this.lastCharIndex;
  }

  async loadVoices(): Promise<TtsVoice[]> {
    if (this.voices) return this.voices;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const raw = await Speech.getAvailableVoicesAsync();
        this.voices = (raw ?? []).map((v) => ({
          id: v.identifier,
          name: v.name ?? v.identifier,
          language: v.language ?? '',
          quality: v.quality,
        }));
      } catch {
        this.voices = [];
      } finally {
        this.loading = null;
      }
      return this.voices ?? [];
    })();
    return this.loading;
  }

  getCachedVoices(): TtsVoice[] {
    return this.voices ?? [];
  }

  /** Speak the given text; resolves when speech finishes or is stopped. */
  async speak(options: SpeakOptions): Promise<void> {
    const {
      language = 'en-US',
      voiceId = null,
      rate = 1,
      pitch = 1,
      onStart,
      onDone,
      onStopped,
      onError,
      onProgress,
    } = options;

    const text = sanitizeForSpeech(options.text);
    if (!text) {
      onDone?.();
      return;
    }

    await this.stop();

    const max = typeof Speech.maxSpeechInputLength === 'number' ? Speech.maxSpeechInputLength : 4000;
    const chunks = chunkForSpeech(text, Math.max(200, max - 40));

    this.speaking = true;
    this.lastCharIndex = 0;
    this.emit();
    onStart?.();

    let cancelled = false;
    const baseOffset = text.length;

    for (let i = 0; i < chunks.length; i++) {
      if (cancelled) break;
      const chunk = chunks[i] as string;
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        try {
          Speech.speak(chunk, {
            language,
            pitch,
            rate,
            ...(voiceId ? { voice: voiceId } : {}),
            onDone: finish,
            onStopped: () => {
              cancelled = true;
              finish();
            },
            onError: (err) => {
              onError?.(err instanceof Error ? err : new Error(String(err)));
              finish();
            },
            onBoundary: (event: { charIndex?: number }) => {
              const idx = event?.charIndex ?? 0;
              this.lastCharIndex = Math.min(baseOffset, idx);
              onProgress?.(this.lastCharIndex);
            },
          });
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error(String(error)));
          finish();
        }
      });
      // Small gap between chunks for a natural cadence.
      if (i < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    this.speaking = false;
    this.emit();
    if (cancelled) onStopped?.();
    else onDone?.();
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch {
      /* ignore */
    }
    if (this.speaking) {
      this.speaking = false;
      this.emit();
    }
  }

  async pause(): Promise<void> {
    if (Platform.OS === 'android') return; // not supported on Android
    try {
      await Speech.pause();
    } catch {
      /* ignore */
    }
  }

  async resume(): Promise<void> {
    if (Platform.OS === 'android') return;
    try {
      await Speech.resume();
    } catch {
      /* ignore */
    }
  }
}

export const tts = new TtsService();
