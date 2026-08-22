import type {
  DirectionalMastery,
  LearningDirection,
  ReviewRating,
  ScaffoldStage,
} from './types';

export const scaffoldStages: readonly ScaffoldStage[] = [
  'acquire',
  'recognize',
  'recall',
  'use',
];

export const learningDirections: readonly LearningDirection[] = [
  'english-to-meaning',
  'meaning-to-english',
  'context-to-english',
  'audio-to-english',
];

export const initialMastery = (direction: LearningDirection): DirectionalMastery => ({
  direction,
  stage: 'acquire',
  successStreak: 0,
  lapseStreak: 0,
  attempts: 0,
  reason: '尚无复习记录，从获取阶段开始。',
});

const at = (index: number): ScaffoldStage =>
  scaffoldStages[Math.max(0, Math.min(scaffoldStages.length - 1, index))] ?? 'acquire';

export interface MasteryTransition {
  readonly mastery: DirectionalMastery;
  readonly rescueRequired: boolean;
}

export function applyReview(
  previous: DirectionalMastery,
  rating: ReviewRating,
): MasteryTransition {
  const currentIndex = scaffoldStages.indexOf(previous.stage);
  const attempts = previous.attempts + 1;

  if (rating === 'again') {
    const lapseStreak = previous.lapseStreak + 1;
    const stage = at(currentIndex - 1);
    return {
      mastery: {
        ...previous,
        stage,
        successStreak: 0,
        lapseStreak,
        attempts,
        reason:
          stage === previous.stage
            ? '本方向未想起，保留获取阶段并更换线索。'
            : `本方向未想起，从${previous.stage}回退到${stage}。`,
      },
      rescueRequired: lapseStreak >= 2,
    };
  }

  if (rating === 'hard') {
    return {
      mastery: {
        ...previous,
        successStreak: 0,
        lapseStreak: 0,
        attempts,
        reason: '本方向回答模糊，保持当前阶段继续巩固。',
      },
      rescueRequired: false,
    };
  }

  const successStreak = previous.successStreak + (rating === 'easy' ? 2 : 1);
  const threshold = previous.stage === 'acquire' ? 2 : 3;
  const promotes = successStreak >= threshold && currentIndex < scaffoldStages.length - 1;
  const stage = promotes ? at(currentIndex + 1) : previous.stage;

  return {
    mastery: {
      ...previous,
      stage,
      successStreak: promotes ? 0 : successStreak,
      lapseStreak: 0,
      attempts,
      reason: promotes
        ? `本方向连续成功，升级到${stage}。`
        : `本方向证据增加，仍处于${stage}。`,
    },
    rescueRequired: false,
  };
}

export function lowerDifficulty(previous: DirectionalMastery): DirectionalMastery {
  const index = scaffoldStages.indexOf(previous.stage);
  const stage = at(index - 1);
  return {
    ...previous,
    stage,
    successStreak: 0,
    reason: `用户手动降低本方向难度到${stage}；历史记录已保留。`,
  };
}
