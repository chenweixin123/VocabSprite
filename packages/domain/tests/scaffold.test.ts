import { describe, expect, it } from 'vitest';
import { applyReview, initialMastery, learningDirections, lowerDifficulty } from '../src';

describe('directional scaffold', () => {
  it.each(learningDirections)(
    'advances %s through all four stages from evidence',
    (direction) => {
      let state = initialMastery(direction);
      for (const count of [2, 3, 3]) {
        for (let index = 0; index < count; index += 1) {
          state = applyReview(state, 'good').mastery;
        }
      }
      expect(state.stage).toBe('use');
    },
  );

  it('only retreats the failed direction', () => {
    const base = {
      ...initialMastery('meaning-to-english' as const),
      stage: 'recall' as const,
    };
    const failed = applyReview(base, 'again').mastery;
    const untouched = {
      ...initialMastery('audio-to-english' as const),
      stage: 'use' as const,
    };
    expect(failed.stage).toBe('recognize');
    expect(untouched.stage).toBe('use');
  });

  it('requires repeated evidence and cannot jump to full mastery in one click', () => {
    const state = applyReview(initialMastery('english-to-meaning'), 'easy').mastery;
    expect(state.stage).toBe('recognize');
    expect(state.stage).not.toBe('use');
  });

  it('triggers rescue after two consecutive lapses', () => {
    const first = applyReview(initialMastery('context-to-english'), 'again');
    const second = applyReview(first.mastery, 'again');
    expect(first.rescueRequired).toBe(false);
    expect(second.rescueRequired).toBe(true);
  });

  it('manual lowering retains attempt history', () => {
    const state = {
      ...initialMastery('audio-to-english' as const),
      stage: 'use' as const,
      attempts: 8,
    };
    expect(lowerDifficulty(state)).toMatchObject({ stage: 'recall', attempts: 8 });
  });
});
