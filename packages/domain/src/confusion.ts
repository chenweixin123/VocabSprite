import type { ConfusionEdge } from './types';

const MAX_WEIGHT = 10;
const ADVERSARIAL_THRESHOLD = 3;

export function recordConfusion(
  existing: ConfusionEdge | undefined,
  sourceSenseId: string,
  targetSenseId: string,
  nowUtc: string,
): ConfusionEdge {
  if (sourceSenseId === targetSenseId)
    throw new Error('A confusion edge cannot be a self-loop.');
  const previousWeight = existing?.weight ?? 0;
  const count = (existing?.count ?? 0) + 1;
  return {
    sourceSenseId,
    targetSenseId,
    kind: 'user-error',
    weight: Math.min(MAX_WEIGHT, previousWeight + 1 + Math.min(count, 5) * 0.1),
    count,
    lastSeenAt: nowUtc,
    history: [...(existing?.history ?? []), nowUtc].slice(-50),
  };
}

export function decayConfusion(edge: ConfusionEdge, nowUtc: string): ConfusionEdge {
  const elapsedMs = Math.max(0, Date.parse(nowUtc) - Date.parse(edge.lastSeenAt));
  const elapsedDays = elapsedMs / 86_400_000;
  const decayed = edge.weight * Math.pow(0.98, elapsedDays);
  return { ...edge, weight: Math.max(0, Math.min(MAX_WEIGHT, decayed)) };
}

export function shouldCreateAdversarialCard(edge: ConfusionEdge): boolean {
  return edge.count >= ADVERSARIAL_THRESHOLD && edge.weight >= ADVERSARIAL_THRESHOLD;
}
