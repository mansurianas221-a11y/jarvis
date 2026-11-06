import * as Clipboard from 'expo-clipboard';
import { Share, Platform } from 'react-native';

export const clipboard = {
  async copy(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      return false;
    }
  },
  async getText(): Promise<string | null> {
    try {
      return await Clipboard.getStringAsync();
    } catch {
      return null;
    }
  },
};

/** Native share sheet (falls back to clipboard copy on web). */
export async function shareText(text: string, title = 'Jarvis'): Promise<void> {
  try {
    await Share.share({ title, message: text });
  } catch (error) {
    if (__DEV__) console.warn('[share] failed', error);
    if (Platform.OS === 'web') await clipboard.copy(text);
  }
}
