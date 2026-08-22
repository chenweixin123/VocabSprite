import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MotionKind } from '@vocabsprite/domain';
import { MotionWord, getMotionPresentation } from '../src';

const effects: readonly MotionKind[] = [
  'cling',
  'reluctant',
  'vanish',
  'scatter',
  'expand',
  'shrink',
  'wobble',
  'fragile',
  'bounce',
  'swift',
  'hesitate',
  'gloomy',
];

describe('data-driven motion recipes', () => {
  it.each(effects)('maps %s to a reusable state class', (kind) => {
    expect(
      getMotionPresentation(
        { kind, intensity: 'standard', durationMs: 500, iterationCount: 1 },
        'standard',
        false,
      ).className,
    ).toContain(`motion-${kind}`);
  });

  it('calmly degrades under reduced motion', () => {
    const value = getMotionPresentation(
      { kind: 'bounce', intensity: 'standard', durationMs: 500, iterationCount: 2 },
      'standard',
      true,
    );
    expect(value.className).toContain('motion-calm');
    expect(value.className).toContain('motion-reduced');
    expect(value.style['--motion-duration' as keyof typeof value.style]).toBe('0ms');
  });

  it('renders semantic text even when animation is disabled', () => {
    render(
      <MotionWord
        recipe={{ kind: 'vanish', intensity: 'low', durationMs: 500, iterationCount: 1 }}
        motionSetting="off"
        prefersReducedMotion={false}
      >
        vanish
      </MotionWord>,
    );
    expect(screen.getByText('vanish')).toBeVisible();
    expect(screen.getByText('vanish')).toHaveClass('motion-reduced');
  });
});
