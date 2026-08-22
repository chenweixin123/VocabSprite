import { describe, expect, it } from 'vitest';
import { demoPacks } from '../src/data/demo';
import {
  applyFeedbackToState,
  applyFsrsScheduleToState,
  createInitialState,
  initialFsrsCard,
} from '../src/state/model';
import { loadState, restoreBackup, serializeBackup } from '../src/state/repository';

const sense = demoPacks[0]?.senses[0];

describe('desktop state model', () => {
  it('tracks scaffold feedback without changing unrelated directions', () => {
    if (sense === undefined) throw new Error('demo fixture is missing');
    const state = createInitialState();
    const next = applyFeedbackToState(
      state,
      sense,
      'word-meaning',
      'remembered',
      '2026-08-18T12:00:00.000Z',
    );
    const directions = next.mastery[sense.id];
    expect(directions).toHaveLength(4);
    expect(
      directions?.find((item) => item.direction === 'english-to-meaning')?.attempts,
    ).toBe(1);
    expect(
      directions?.find((item) => item.direction === 'audio-to-english')?.attempts,
    ).toBe(0);
  });

  it('persists the schedule returned by the native FSRS adapter', () => {
    if (sense === undefined) throw new Error('demo fixture is missing');
    const state = createInitialState();
    const schedule = {
      state: {
        ...initialFsrsCard('2026-08-18T12:00:00.000Z', 0.9),
        memory: { stability: 3.2, difficulty: 5.1 },
        lastReviewedAt: '2026-08-18T12:00:00.000Z',
        dueAt: '2026-08-21T16:00:00.000Z',
      },
      intervalDays: 3.166,
      fsrsRating: 3,
    };
    const next = applyFsrsScheduleToState(state, sense.id, schedule);
    expect(next.fsrsCards[sense.id]).toEqual(schedule.state);
    expect(next.statusMessage).toContain('FSRS');
  });
});

describe('backup repository', () => {
  it('round-trips a full local backup', () => {
    const state = { ...createInitialState(), onboardingComplete: true };
    expect(restoreBackup(serializeBackup(state))).toMatchObject(state);
  });

  it('migrates older same-schema snapshots to safe compact-card defaults', () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState())) as {
      preferences: Record<string, unknown>;
    };
    delete legacy.preferences.compactCardSize;
    delete legacy.preferences.compactCardColor;
    delete legacy.preferences.hintEnabled;

    const loaded = loadState({ getItem: () => JSON.stringify(legacy) });
    expect(loaded.preferences).toMatchObject({
      compactCardSize: 'standard',
      compactCardColor: 'violet',
      hintEnabled: false,
    });
  });

  it('fails closed for malformed or unsupported state', () => {
    const storage = { getItem: () => '{broken' };
    expect(loadState(storage).onboardingComplete).toBe(false);
    expect(() => restoreBackup('{"format":"Other","schemaVersion":1}')).toThrow(
      '不是受支持',
    );
  });

  it('fails closed when persisted state has the right version but unsafe nested types', () => {
    const malformed = JSON.stringify({
      ...createInitialState(),
      onboardingComplete: true,
      reviewEvents: null,
      importedSenses: [{ lemma: '<script>alert(1)</script>' }],
    });

    const loaded = loadState({ getItem: () => malformed });
    expect(loaded).toEqual(createInitialState());
  });

  it('rejects a structurally invalid backup instead of accepting a crashable state', () => {
    const malformed = JSON.stringify({
      format: 'VocabSpriteBackup',
      schemaVersion: 1,
      state: {
        ...createInitialState(),
        preferences: { ...createInitialState().preferences, selectedStages: 'cet4' },
      },
    });

    expect(() => restoreBackup(malformed)).toThrow('备份状态结构无效');
  });

  it('round-trips guarded high-volume study limits and rejects excessive values', () => {
    const state = createInitialState();
    const highVolume = {
      ...state,
      preferences: {
        ...state.preferences,
        dailyNewLimit: 1_000,
        dailyReviewLimit: 5_000,
      },
    };
    expect(restoreBackup(serializeBackup(highVolume)).preferences).toMatchObject({
      dailyNewLimit: 1_000,
      dailyReviewLimit: 5_000,
    });

    const excessive = JSON.parse(serializeBackup(highVolume)) as {
      state: { preferences: { dailyReviewLimit: number } };
    };
    excessive.state.preferences.dailyReviewLimit = 5_001;
    expect(() => restoreBackup(JSON.stringify(excessive))).toThrow('备份状态结构无效');
  });
});
