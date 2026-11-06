import { getSpeechRecognition, isRecognitionSupported } from './device';

/** Events emitted by the speech recogniser, normalised for the app. */
export type SttEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'speechstart' }
  | { type: 'speechend' }
  | { type: 'audiostart' }
  | { type: 'audioend' }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'error'; code: string; message: string }
  | { type: 'volume'; value: number }
  | { type: 'language'; language: string };

export interface SttPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  /** Reason string for UI copy. */
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable' | 'restricted';
}

export interface StartOptions {
  /** BCP-47 locale, e.g. "en-US" or "hi-IN". */
  locale: string;
  /** Keep listening for multiple utterances. */
  continuous?: boolean;
  /** Emit interim results. Default true. */
  interim?: boolean;
  /** Prefer a small on-device model where supported. */
  onDevice?: boolean;
  /** Emit volume metering events (for the reactive waveform). */
  volumeMetering?: boolean;
}

type Listener = (event: SttEvent) => void;

class SttService {
  private listeners = new Set<Listener>();
  private subscriptions: { remove: () => void }[] = [];
  private active = false;
  private bound = false;

  isAvailable(): boolean {
    return isRecognitionSupported();
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SttEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        if (__DEV__) console.warn('[stt] listener error', error);
      }
    }
  }

  private bind() {
    if (this.bound) return;
    const mod = getSpeechRecognition();
    if (!mod) return;
    const M = mod.ExpoSpeechRecognitionModule;
    const add = (name: string, handler: (payload: any) => void) => {
      try {
        this.subscriptions.push(M.addListener(name as never, handler as never));
      } catch {
        /* ignore unsupported events */
      }
    };

    add('start', () => {
      this.active = true;
      this.emit({ type: 'start' });
    });
    add('end', () => {
      this.active = false;
      this.emit({ type: 'end' });
    });
    add('speechstart', () => this.emit({ type: 'speechstart' }));
    add('speechend', () => this.emit({ type: 'speechend' }));
    add('audiostart', () => this.emit({ type: 'audiostart' }));
    add('audioend', () => this.emit({ type: 'audioend' }));
    add('result', (event: any) => {
      const transcript: string = event?.results?.[0]?.transcript ?? '';
      this.emit({ type: 'result', transcript, isFinal: Boolean(event?.isFinal) });
    });
    add('error', (event: any) => {
      this.emit({
        type: 'error',
        code: String(event?.error ?? 'unknown'),
        message: String(event?.message ?? ''),
      });
    });
    add('volumechange', (event: any) => {
      this.emit({ type: 'volume', value: Number(event?.value ?? 0) });
    });
    add('languagedetection', (event: any) => {
      if (event?.detectedLanguage) {
        this.emit({ type: 'language', language: String(event.detectedLanguage) });
      }
    });

    this.bound = true;
  }

  async getPermissions(): Promise<SttPermissionResult> {
    const mod = getSpeechRecognition();
    if (!mod) return { granted: false, canAskAgain: false, status: 'unavailable' };
    try {
      const res = await mod.ExpoSpeechRecognitionModule.getPermissionsAsync();
      return {
        granted: Boolean(res.granted),
        canAskAgain: res.canAskAgain !== false,
        status: (res.status as SttPermissionResult['status']) ?? 'undetermined',
      };
    } catch {
      return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
  }

  async requestPermissions(): Promise<SttPermissionResult> {
    const mod = getSpeechRecognition();
    if (!mod) return { granted: false, canAskAgain: false, status: 'unavailable' };
    try {
      const res = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return {
        granted: Boolean(res.granted),
        canAskAgain: res.canAskAgain !== false,
        status: (res.status as SttPermissionResult['status']) ?? 'undetermined',
      };
    } catch {
      return { granted: false, canAskAgain: false, status: 'denied' };
    }
  }

  isActive(): boolean {
    return this.active;
  }

  start(options: StartOptions): boolean {
    const mod = getSpeechRecognition();
    if (!mod || !this.isAvailable()) {
      this.emit({
        type: 'error',
        code: 'service-not-allowed',
        message: 'Speech recognition is not available',
      });
      return false;
    }
    this.bind();
    try {
      mod.ExpoSpeechRecognitionModule.start({
        lang: options.locale,
        interimResults: options.interim !== false,
        continuous: options.continuous ?? false,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: options.onDevice ?? false,
        addsPunctuation: true,
        ...(options.volumeMetering
          ? { volumeChangeEventOptions: { enabled: true, intervalMillis: 90 } }
          : {}),
      });
      return true;
    } catch (error) {
      this.emit({
        type: 'error',
        code: 'start-failed',
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  stop(): void {
    const mod = getSpeechRecognition();
    try {
      mod?.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* ignore */
    }
  }

  abort(): void {
    const mod = getSpeechRecognition();
    try {
      mod?.ExpoSpeechRecognitionModule.abort();
    } catch {
      /* ignore */
    }
  }

  dispose(): void {
    for (const sub of this.subscriptions) sub.remove();
    this.subscriptions = [];
    this.bound = false;
  }
}

export const stt = new SttService();
