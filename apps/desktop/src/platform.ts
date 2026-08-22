import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Event, UnlistenFn } from '@tauri-apps/api/event';
import type {
  FsrsCardView,
  FsrsScheduleView,
  ProductFeedback,
  WindowMode,
} from './state/model';

const native = (): boolean => window.__TAURI_INTERNALS__ !== undefined;

async function invokeIfNative<T>(
  command: string,
  arguments_: Record<string, unknown>,
): Promise<T | null> {
  if (!native()) return null;
  try {
    return await invoke<T>(command, arguments_);
  } catch (error) {
    console.warn(`Native command ${command} failed without exposing user content.`, error);
    return null;
  }
}

export const platform = {
  isNative: native,
  resizeWindow: (mode: WindowMode) => invokeIfNative<void>('resize_window', { mode }),
  resizeCompactWindow: (width: number, height: number) =>
    invokeIfNative<void>('resize_compact_window', { width, height }),
  setTopmost: (topmost: boolean) => invokeIfNative<void>('set_topmost', { topmost }),
  setOpacity: (opacity: number) => invokeIfNative<void>('set_window_opacity', { opacity }),
  snooze: (untilUtc: string) => invokeIfNative<void>('snooze_card', { untilUtc }),
  pause: (untilUtc: string) => invokeIfNative<void>('pause_cards', { untilUtc }),
  exit: () => invokeIfNative<void>('exit_application', {}),
  savePosition: (displayKey: string, x: number, y: number) =>
    invokeIfNative<void>('save_window_position', { displayKey, x, y }),
  readClipboardAfterShortcut: () =>
    invokeIfNative<string>('read_clipboard_after_shortcut', {}),
  loadNativeState: () => invokeIfNative<string | null>('load_state_json', {}),
  saveNativeState: (stateJson: string) =>
    invokeIfNative<void>('save_state_json', { stateJson }),
  deleteNativeData: () => invokeIfNative<void>('delete_all_personal_data', {}),
  setAutostart: (enabled: boolean) => invokeIfNative<void>('set_autostart', { enabled }),
  scheduleReview: (previous: FsrsCardView, reviewedAt: string, feedback: ProductFeedback) =>
    invokeIfNative<FsrsScheduleView>('schedule_fsrs_review', {
      previous,
      reviewedAt,
      feedback,
    }),
  listen: async <T>(
    eventName: string,
    handler: (event: Event<T>) => void,
  ): Promise<UnlistenFn | null> => (native() ? listen<T>(eventName, handler) : null),
};

export function speakWord(word: string, rate: number, preferredVoice = ''): boolean {
  if (
    !('speechSynthesis' in window) ||
    window.speechSynthesis === undefined ||
    typeof SpeechSynthesisUtterance === 'undefined'
  )
    return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice =
    voices.find((voice) => voice.name === preferredVoice) ??
    voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('en')) ??
    null;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function downloadText(
  filename: string,
  text: string,
  type = 'application/json',
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
