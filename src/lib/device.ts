import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

import { CONFIG } from './constants';

/**
 * Talks to the speech-recognition module defensively. The module is loaded
 * lazily because it is unavailable in some environments (e.g. Expo Go on
 * certain SDKs or the web without the polyfill) and we must never crash.
 */
type SpeechRecognitionModule = typeof import('expo-speech-recognition');

let moduleRef: SpeechRecognitionModule | null | undefined;

export function getSpeechRecognition(): SpeechRecognitionModule | null {
  if (moduleRef !== undefined) return moduleRef;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduleRef = require('expo-speech-recognition') as SpeechRecognitionModule;
  } catch (error) {
    if (__DEV__) console.warn('[speech-recognition] module unavailable', error);
    moduleRef = null;
  }
  return moduleRef;
}

export function isRecognitionSupported(): boolean {
  const mod = getSpeechRecognition();
  if (!mod) return false;
  try {
    return mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export function isTtsSupported(): boolean {
  try {
    return typeof Speech.speak === 'function';
  } catch {
    return false;
  }
}

/** True when a real AI backend has been configured. */
export function isAiConfigured(): boolean {
  return CONFIG.apiBaseUrl.length > 0;
}

/** True when running in offline demo mode. */
export function isDemoMode(): boolean {
  return !isAiConfigured() && CONFIG.demoAllowed;
}

export const platform = {
  isWeb: Platform.OS === 'web',
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};
