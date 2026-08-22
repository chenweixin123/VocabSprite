import { describe, expect, it } from 'vitest';
import {
  chooseRescueCue,
  decayConfusion,
  recordConfusion,
  shouldCreateAdversarialCard,
  updateCueEffectiveness,
} from '../src';

describe('confusion graph', () => {
  it('creates, strengthens, thresholds and safely decays a directed edge', () => {
    const first = recordConfusion(undefined, 'adapt', 'adopt', '2026-01-01T00:00:00.000Z');
    const second = recordConfusion(first, 'adapt', 'adopt', '2026-01-02T00:00:00.000Z');
    const third = recordConfusion(second, 'adapt', 'adopt', '2026-01-03T00:00:00.000Z');
    expect(second.weight).toBeGreaterThan(first.weight);
    expect(shouldCreateAdversarialCard(third)).toBe(true);
    const decayed = decayConfusion(third, '2036-01-03T00:00:00.000Z');
    expect(decayed.weight).toBeGreaterThanOrEqual(0);
    expect(decayed.weight).toBeLessThan(third.weight);
  });

  it('rejects self loops', () => {
    expect(() =>
      recordConfusion(undefined, 'same', 'same', new Date().toISOString()),
    ).toThrow('self-loop');
  });
});

describe('memory rescue', () => {
  it('prefers an untried cue and is deterministic', () => {
    const morphology = updateCueEffectiveness(
      undefined,
      'adapt',
      'morphology',
      'effective',
    );
    const first = chooseRescueCue('adapt', [morphology], ['visual', 'sound']);
    const second = chooseRescueCue('adapt', [morphology], ['visual', 'sound']);
    expect(first).toBe('morphology');
    expect(second).toBe(first);
  });

  it('penalizes cues the user found confusing', () => {
    const confusing = updateCueEffectiveness(undefined, 'adapt', 'contrast', 'confusing');
    expect(chooseRescueCue('adapt', [confusing], ['visual', 'sound', 'morphology'])).toBe(
      'contrast',
    );
    const effective = updateCueEffectiveness(undefined, 'adapt', 'visual', 'effective');
    expect(
      chooseRescueCue(
        'adapt',
        [confusing, effective],
        ['visual', 'sound', 'morphology', 'contrast'],
      ),
    ).toBe('visual');
  });
});
