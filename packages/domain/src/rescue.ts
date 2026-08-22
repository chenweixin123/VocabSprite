import type { CueEffectiveness, CueType } from './types';

const cueTypes: readonly CueType[] = ['visual', 'sound', 'morphology', 'contrast'];

const score = (record: CueEffectiveness | undefined): number => {
  if (record === undefined || record.attempts === 0) return 0.55;
  return (record.successes + 1) / (record.attempts + 2) - record.confusingVotes * 0.15;
};

export function chooseRescueCue(
  senseId: string,
  records: readonly CueEffectiveness[],
  tried: readonly CueType[],
): CueType {
  const triedSet = new Set(tried);
  const ranked = cueTypes
    .map((cueType) => ({
      cueType,
      record: records.find((item) => item.senseId === senseId && item.cueType === cueType),
    }))
    .sort((a, b) => {
      const untriedDifference =
        Number(!triedSet.has(b.cueType)) - Number(!triedSet.has(a.cueType));
      if (untriedDifference !== 0) return untriedDifference;
      const scoreDifference = score(b.record) - score(a.record);
      return scoreDifference === 0 ? a.cueType.localeCompare(b.cueType) : scoreDifference;
    });
  return ranked[0]?.cueType ?? 'visual';
}

export function updateCueEffectiveness(
  previous: CueEffectiveness | undefined,
  senseId: string,
  cueType: CueType,
  vote: 'effective' | 'neutral' | 'confusing',
): CueEffectiveness {
  return {
    senseId,
    cueType,
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + (vote === 'effective' ? 1 : 0),
    confusingVotes: (previous?.confusingVotes ?? 0) + (vote === 'confusing' ? 1 : 0),
  };
}
