import type { ReviewCandidate, Stage } from './types';

const fnv = (value: string): number => {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export interface QueueOptions {
  readonly nowUtc: string;
  readonly selectedStages: readonly Stage[];
  readonly reviewLimit: number;
  readonly newLimit: number;
  readonly seed: string;
  readonly bridgeMode: boolean;
}

export function buildDeterministicQueue(
  candidates: readonly ReviewCandidate[],
  options: QueueOptions,
): readonly ReviewCandidate[] {
  const now = Date.parse(options.nowUtc);
  let newRemaining = options.newLimit;
  let reviewRemaining = options.reviewLimit;

  return candidates
    .filter((candidate) => options.selectedStages.includes(candidate.selectedStage))
    .map((candidate) => {
      const overdueHours = Math.max(0, now - Date.parse(candidate.dueAt)) / 3_600_000;
      const rescueBoost = candidate.rescueRequired ? 10_000 : 0;
      const confusionBoost = candidate.confusionWeight * 100;
      const bridgeBoost =
        options.bridgeMode && candidate.selectedStage !== 'custom' ? 50 : 0;
      const examBoost =
        candidate.examDate === undefined
          ? 0
          : Math.max(0, 365 - (Date.parse(candidate.examDate) - now) / 86_400_000);
      return {
        candidate,
        score: rescueBoost + confusionBoost + overdueHours + bridgeBoost + examBoost,
        tie: fnv(`${options.seed}:${candidate.cardId}`),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.tie - b.tie ||
        a.candidate.cardId.localeCompare(b.candidate.cardId),
    )
    .filter(({ candidate }) => {
      if (candidate.isNew) {
        if (newRemaining <= 0) return false;
        newRemaining -= 1;
        return true;
      }
      if (reviewRemaining <= 0) return false;
      reviewRemaining -= 1;
      return true;
    })
    .map(({ candidate }) => candidate);
}
