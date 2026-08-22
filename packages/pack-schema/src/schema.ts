import { z } from 'zod';
import { stages } from '@vocabsprite/domain';

const safeText = z
  .string()
  .trim()
  .min(1)
  .max(2_000)
  .refine((value) => !/<\/?(?:script|iframe|object|embed)\b/i.test(value), {
    message: 'Executable or embedded HTML is not allowed.',
  })
  .refine((value) => !/javascript\s*:/i.test(value), {
    message: 'javascript: URLs are not allowed.',
  });

const stableId = z.string().regex(/^[a-z0-9][a-z0-9._-]{2,127}$/i);
const semanticKey = z.string().regex(/^[a-z0-9][a-z0-9|._-]{2,255}$/i);

export const motionRecipeSchema = z.object({
  kind: z.enum([
    'calm',
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
  ]),
  intensity: z.enum(['low', 'standard']),
  durationMs: z.number().int().min(150).max(3_000),
  iterationCount: z.union([z.literal(1), z.literal(2)]),
});

export const wordSenseSchema = z.object({
  id: stableId,
  identityKey: semanticKey,
  lexemeId: stableId,
  lemma: safeText.max(80),
  partOfSpeech: z.enum([
    'noun',
    'verb',
    'adjective',
    'adverb',
    'preposition',
    'conjunction',
    'pronoun',
    'interjection',
  ]),
  senseKey: stableId,
  definitionZh: safeText.max(300),
  definitionEn: safeText.max(500),
  examples: z
    .array(
      z.object({
        id: stableId,
        text: safeText.max(300),
        translation: safeText.max(300),
        source: z.enum(['original', 'user']),
      }),
    )
    .min(1)
    .max(10),
  collocations: z.array(safeText.max(100)).max(20),
  synonyms: z.array(safeText.max(80)).max(20),
  antonyms: z.array(safeText.max(80)).max(20),
  confusables: z.array(safeText.max(80)).max(20),
  morphology: z.array(safeText.max(100)).max(20),
  cues: z
    .array(
      z.object({
        id: stableId,
        type: z.enum(['visual', 'sound', 'morphology', 'contrast']),
        text: safeText.max(500),
        verified: z.boolean(),
      }),
    )
    .max(12),
  motion: motionRecipeSchema,
  visualAssetId: stableId.optional(),
});

export const packManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: stableId,
  title: safeText.max(120),
  stage: z.enum(stages),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  language: z.literal('en'),
  uiLocale: z.literal('zh-CN'),
  coverage: z.enum(['demo', 'partial', 'complete']),
  officialStatus: z.enum(['community-compatible', 'user-created']),
  sourceName: safeText.max(200),
  sourceUrl: z.url().nullable(),
  license: safeText.max(100),
  attribution: safeText.max(500).nullable(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const vocabularyPackSchema = z.object({
  manifest: packManifestSchema,
  senses: z.array(wordSenseSchema).min(1).max(50_000),
  aliases: z.record(stableId, stableId),
});

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  packs: z
    .array(
      z.object({
        manifest: z.string().min(1).max(240),
        entries: z.string().min(1).max(240),
      }),
    )
    .min(1)
    .max(1_000),
});
