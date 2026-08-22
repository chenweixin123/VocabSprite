import type { AttentionSettings, AttentionState } from './types';

export type AttentionBlockReason =
  | 'focus-mode'
  | 'quiet-hours'
  | 'snoozed'
  | 'paused'
  | 'minimum-interval'
  | 'daily-appearance-budget'
  | 'daily-new-budget'
  | 'daily-review-budget'
  | 'fullscreen-unknown';

const minutesSinceMidnight = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

const parseClock = (value: string): number => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (match === null) throw new Error(`Invalid local clock value: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid local clock value: ${value}`);
  return hours * 60 + minutes;
};

export function isQuietTime(nowLocal: Date, start: string, end: string): boolean {
  const value = minutesSinceMidnight(nowLocal);
  const startValue = parseClock(start);
  const endValue = parseClock(end);
  if (startValue === endValue) return false;
  return startValue < endValue
    ? value >= startValue && value < endValue
    : value >= startValue || value < endValue;
}

export interface AttentionDecision {
  readonly allowed: boolean;
  readonly reason?: AttentionBlockReason;
  readonly remainingAppearances: number;
}

export function canShowAmbientCard(input: {
  readonly nowUtc: string;
  readonly nowLocal: Date;
  readonly settings: AttentionSettings;
  readonly state: AttentionState;
  readonly isNew: boolean;
  readonly userInitiated: boolean;
  readonly fullscreenStatus: 'active' | 'inactive' | 'unknown';
}): AttentionDecision {
  const { settings, state } = input;
  const remainingAppearances = Math.max(0, settings.dailyAppearances - state.appearances);
  if (input.userInitiated) return { allowed: true, remainingAppearances };

  let reason: AttentionBlockReason | undefined;
  if (settings.focusMode) reason = 'focus-mode';
  else if (isQuietTime(input.nowLocal, settings.quietStart, settings.quietEnd))
    reason = 'quiet-hours';
  else if (
    state.snoozedUntil !== null &&
    Date.parse(input.nowUtc) < Date.parse(state.snoozedUntil)
  )
    reason = 'snoozed';
  else if (
    state.pausedUntil !== null &&
    Date.parse(input.nowUtc) < Date.parse(state.pausedUntil)
  )
    reason = 'paused';
  else if (
    state.lastShownAt !== null &&
    Date.parse(input.nowUtc) - Date.parse(state.lastShownAt) <
      settings.minimumIntervalMinutes * 60_000
  )
    reason = 'minimum-interval';
  else if (remainingAppearances <= 0) reason = 'daily-appearance-budget';
  else if (input.isNew && state.newCount >= settings.dailyNewLimit)
    reason = 'daily-new-budget';
  else if (!input.isNew && state.reviewCount >= settings.dailyReviewLimit)
    reason = 'daily-review-budget';
  else if (settings.safeFullscreenDetection && input.fullscreenStatus !== 'inactive')
    reason = 'fullscreen-unknown';

  return reason === undefined
    ? { allowed: true, remainingAppearances }
    : { allowed: false, reason, remainingAppearances };
}
