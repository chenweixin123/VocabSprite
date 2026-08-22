import type { ReactNode } from 'react';
import type { MotionRecipe } from '@vocabsprite/domain';
import { getMotionPresentation } from './motionPresentation';

export interface MotionWordProps {
  readonly recipe: MotionRecipe;
  readonly motionSetting: 'off' | 'low' | 'standard';
  readonly prefersReducedMotion: boolean;
  readonly children: ReactNode;
}

export function MotionWord({
  recipe,
  motionSetting,
  prefersReducedMotion,
  children,
}: MotionWordProps) {
  const presentation = getMotionPresentation(recipe, motionSetting, prefersReducedMotion);
  return (
    <span
      className={presentation.className}
      style={presentation.style}
      data-motion={recipe.kind}
    >
      {children}
    </span>
  );
}
