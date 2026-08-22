import type { CSSProperties } from 'react';
import type { MotionRecipe } from '@vocabsprite/domain';

export function getMotionPresentation(
  recipe: MotionRecipe,
  motionSetting: 'off' | 'low' | 'standard',
  prefersReducedMotion: boolean,
): { className: string; style: CSSProperties } {
  const disabled = prefersReducedMotion || motionSetting === 'off';
  const effectiveKind = disabled ? 'calm' : recipe.kind;
  const intensity = motionSetting === 'low' ? 'low' : recipe.intensity;
  return {
    className: `motion-word motion-${effectiveKind} motion-intensity-${intensity}${disabled ? ' motion-reduced' : ''}`,
    style: {
      '--motion-duration': `${disabled ? 0 : recipe.durationMs}ms`,
      '--motion-iterations': disabled ? 1 : recipe.iterationCount,
    } as CSSProperties,
  };
}
