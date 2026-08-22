import { describe, expect, it } from 'vitest';
import { buildDeterministicQueue, canShowAmbientCard, isQuietTime } from '../src';
import type { AttentionSettings, AttentionState, ReviewCandidate } from '../src';

const settings: AttentionSettings = {
  dailyAppearances: 10,
  dailyNewLimit: 3,
  dailyReviewLimit: 8,
  minimumIntervalMinutes: 20,
  quietStart: '22:00',
  quietEnd: '07:00',
  focusMode: false,
  safeFullscreenDetection: false,
};

const state: AttentionState = {
  dayKey: '2026-01-01',
  appearances: 0,
  newCount: 0,
  reviewCount: 0,
  lastShownAt: null,
  snoozedUntil: null,
  pausedUntil: null,
};

describe('attention budget', () => {
  it('handles quiet hours that cross midnight', () => {
    expect(isQuietTime(new Date(2026, 0, 1, 23, 0), '22:00', '07:00')).toBe(true);
    expect(isQuietTime(new Date(2026, 0, 1, 12, 0), '22:00', '07:00')).toBe(false);
  });

  it('honors snooze and limits while allowing user-initiated cards', () => {
    const decision = canShowAmbientCard({
      nowUtc: '2026-01-01T12:00:00.000Z',
      nowLocal: new Date(2026, 0, 1, 12),
      settings,
      state: { ...state, snoozedUntil: '2026-01-01T13:00:00.000Z' },
      isNew: false,
      userInitiated: false,
      fullscreenStatus: 'inactive',
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'snoozed' });
    expect(
      canShowAmbientCard({
        nowUtc: '2026-01-01T12:00:00.000Z',
        nowLocal: new Date(2026, 0, 1, 12),
        settings,
        state: { ...state, appearances: 10 },
        isNew: true,
        userInitiated: true,
        fullscreenStatus: 'unknown',
      }).allowed,
    ).toBe(true);
  });

  it('fails closed when fullscreen detection is enabled but unknown', () => {
    const decision = canShowAmbientCard({
      nowUtc: '2026-01-01T12:00:00.000Z',
      nowLocal: new Date(2026, 0, 1, 12),
      settings: { ...settings, safeFullscreenDetection: true },
      state,
      isNew: false,
      userInitiated: false,
      fullscreenStatus: 'unknown',
    });
    expect(decision.reason).toBe('fullscreen-unknown');
  });

  it.each([
    [{ appearances: 10 }, false, 'daily-appearance-budget'],
    [{ newCount: 3 }, true, 'daily-new-budget'],
    [{ reviewCount: 8 }, false, 'daily-review-budget'],
    [{ pausedUntil: '2026-01-01T13:00:00.000Z' }, false, 'paused'],
    [{ lastShownAt: '2026-01-01T11:50:00.000Z' }, false, 'minimum-interval'],
  ] as const)('enforces the %s attention case', (change, isNew, reason) => {
    const decision = canShowAmbientCard({
      nowUtc: '2026-01-01T12:00:00.000Z',
      nowLocal: new Date(2026, 0, 1, 12),
      settings,
      state: { ...state, ...change },
      isNew,
      userInitiated: false,
      fullscreenStatus: 'inactive',
    });
    expect(decision).toMatchObject({ allowed: false, reason });
  });
});

describe('deterministic queue', () => {
  const candidates: readonly ReviewCandidate[] = [
    {
      cardId: 'normal',
      senseId: 'normal',
      dueAt: '2026-01-01T10:00:00.000Z',
      isNew: false,
      rescueRequired: false,
      confusionWeight: 0,
      selectedStage: 'cet4',
    },
    {
      cardId: 'rescue',
      senseId: 'rescue',
      dueAt: '2026-01-01T11:00:00.000Z',
      isNew: false,
      rescueRequired: true,
      confusionWeight: 0,
      selectedStage: 'cet4',
    },
    {
      cardId: 'new-one',
      senseId: 'new-one',
      dueAt: '2026-01-01T12:00:00.000Z',
      isNew: true,
      rescueRequired: false,
      confusionWeight: 0,
      selectedStage: 'cet4',
    },
  ];

  it('is reproducible, prioritizes rescue, and enforces new/review caps', () => {
    const options = {
      nowUtc: '2026-01-01T12:00:00.000Z',
      selectedStages: ['cet4' as const],
      reviewLimit: 1,
      newLimit: 1,
      seed: 'fixed',
      bridgeMode: false,
    };
    const first = buildDeterministicQueue(candidates, options);
    const second = buildDeterministicQueue(candidates, options);
    expect(first).toEqual(second);
    expect(first.map((item) => item.cardId)).toEqual(['rescue', 'new-one']);
  });

  it('compares UTC instants rather than local calendar labels', () => {
    const result = buildDeterministicQueue(candidates, {
      nowUtc: '2026-01-01T12:00:00.000Z',
      selectedStages: ['cet4'],
      reviewLimit: 2,
      newLimit: 0,
      seed: 'timezone-independent',
      bridgeMode: false,
    });
    expect(result).toHaveLength(2);
  });
});
