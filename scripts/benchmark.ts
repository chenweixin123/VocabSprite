import { performance } from 'node:perf_hooks';
import { buildDeterministicQueue } from '../packages/domain/src/index';
import type { ReviewCandidate } from '../packages/domain/src/index';

const senseCount = 10_000;
const reviewCount = 100_000;
const now = '2026-08-18T12:00:00.000Z';
const candidates: ReviewCandidate[] = Array.from({ length: senseCount }, (_, index) => ({
  cardId: `card.${index.toString().padStart(5, '0')}`,
  senseId: `sense.${index.toString().padStart(5, '0')}`,
  dueAt: new Date(Date.parse(now) - (index % 720) * 3_600_000).toISOString(),
  isNew: index % 5 === 0,
  rescueRequired: index % 211 === 0,
  confusionWeight: (index % 10) / 10,
  selectedStage: index % 2 === 0 ? 'cet4' : 'cet6',
}));

const queueStarted = performance.now();
const queue = buildDeterministicQueue(candidates, {
  nowUtc: now,
  selectedStages: ['cet4', 'cet6'],
  reviewLimit: 8_000,
  newLimit: 2_000,
  seed: 'benchmark-fixed-seed',
  bridgeMode: true,
});
const queueMilliseconds = performance.now() - queueStarted;

const reviews = Array.from({ length: reviewCount }, (_, index) => ({
  id: `review.${index}`,
  cardId: `card.${index % senseCount}`,
  reviewedAtUtc: new Date(Date.parse(now) - index * 60_000).toISOString(),
  rating: (index % 4) + 1,
}));
const serializationStarted = performance.now();
const encoded = JSON.stringify(reviews);
const decoded = JSON.parse(encoded) as unknown[];
const serializationMilliseconds = performance.now() - serializationStarted;

const result = {
  fixture: { senseCount, reviewCount },
  queue: { outputCount: queue.length, milliseconds: Number(queueMilliseconds.toFixed(2)) },
  reviewRoundTrip: {
    outputCount: decoded.length,
    bytes: Buffer.byteLength(encoded),
    milliseconds: Number(serializationMilliseconds.toFixed(2)),
  },
  heapUsedMiB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
};
console.log(JSON.stringify(result, null, 2));
if (queue.length !== senseCount || decoded.length !== reviewCount) process.exitCode = 1;
if (queueMilliseconds > 5_000 || serializationMilliseconds > 5_000) {
  throw new Error(
    'Performance fixture exceeded the conservative 5 second local threshold.',
  );
}
