import type { VocabularyPack, WordSense } from '../src';

export const sense = (overrides: Partial<WordSense> = {}): WordSense => ({
  id: 'sense.adapt.change',
  identityKey: 'adapt|verb|change-to-fit',
  lexemeId: 'lexeme.adapt',
  lemma: 'adapt',
  partOfSpeech: 'verb',
  senseKey: 'change-to-fit',
  definitionZh: '调整以适应',
  definitionEn: 'to change something so it fits a new situation',
  examples: [
    {
      id: 'example.adapt.1',
      text: 'We adapt the plan when the weather changes.',
      translation: '天气变化时，我们调整计划。',
      source: 'original',
    },
  ],
  collocations: ['adapt a plan'],
  synonyms: ['adjust'],
  antonyms: [],
  confusables: ['adopt'],
  morphology: ['adaptation'],
  cues: [],
  motion: { kind: 'reluctant', intensity: 'low', durationMs: 600, iterationCount: 1 },
  ...overrides,
});

export const pack = (
  id: string,
  stage: VocabularyPack['manifest']['stage'],
  senses: readonly WordSense[],
  aliases: Readonly<Record<string, string>> = {},
): VocabularyPack => ({
  manifest: {
    schemaVersion: 1,
    id,
    title: `${id} demo`,
    stage,
    version: '0.1.0',
    language: 'en',
    uiLocale: 'zh-CN',
    coverage: 'demo',
    officialStatus: stage === 'custom' ? 'user-created' : 'community-compatible',
    sourceName: 'VocabSprite original demo content',
    sourceUrl: null,
    license: 'CC0-1.0',
    attribution: null,
    checksum: 'sha256:test',
  },
  senses,
  aliases,
});
