export const stages = [
  'primary',
  'junior',
  'senior',
  'cet4',
  'cet6',
  'postgraduate',
  'custom',
] as const;

export type Stage = (typeof stages)[number];
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'interjection';

export type MotionKind =
  | 'calm'
  | 'cling'
  | 'reluctant'
  | 'vanish'
  | 'scatter'
  | 'expand'
  | 'shrink'
  | 'wobble'
  | 'fragile'
  | 'bounce'
  | 'swift'
  | 'hesitate'
  | 'gloomy';

export interface MotionRecipe {
  readonly kind: MotionKind;
  readonly intensity: 'low' | 'standard';
  readonly durationMs: number;
  readonly iterationCount: 1 | 2;
}

export interface ExampleSentence {
  readonly id: string;
  readonly text: string;
  readonly translation: string;
  readonly source: 'original' | 'user';
}

export interface MnemonicCue {
  readonly id: string;
  readonly type: CueType;
  readonly text: string;
  readonly verified: boolean;
}

export type CueType = 'visual' | 'sound' | 'morphology' | 'contrast';

export interface WordSense {
  readonly id: string;
  readonly identityKey: string;
  readonly lexemeId: string;
  readonly lemma: string;
  readonly partOfSpeech: PartOfSpeech;
  readonly senseKey: string;
  readonly definitionZh: string;
  readonly definitionEn: string;
  readonly examples: readonly ExampleSentence[];
  readonly collocations: readonly string[];
  readonly synonyms: readonly string[];
  readonly antonyms: readonly string[];
  readonly confusables: readonly string[];
  readonly morphology: readonly string[];
  readonly cues: readonly MnemonicCue[];
  readonly motion: MotionRecipe;
  readonly visualAssetId?: string | undefined;
}

export interface PackManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly stage: Stage;
  readonly version: string;
  readonly language: 'en';
  readonly uiLocale: 'zh-CN';
  readonly coverage: 'demo' | 'partial' | 'complete';
  readonly officialStatus: 'community-compatible' | 'user-created';
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly license: string;
  readonly attribution: string | null;
  readonly checksum: string;
}

export interface VocabularyPack {
  readonly manifest: PackManifest;
  readonly senses: readonly WordSense[];
  readonly aliases: Readonly<Record<string, string>>;
}

export interface PackMembership {
  readonly senseId: string;
  readonly packId: string;
  readonly stage: Stage;
  readonly packVersion: string;
}

export interface PackConflict {
  readonly code: 'IDENTITY_CONTENT_MISMATCH' | 'ALIAS_COLLISION' | 'DUPLICATE_ID';
  readonly identityKey: string;
  readonly packIds: readonly string[];
  readonly detail: string;
}

export interface FusedSense {
  readonly sense: WordSense;
  readonly memberships: readonly PackMembership[];
}

export type LearningDirection =
  'english-to-meaning' | 'meaning-to-english' | 'context-to-english' | 'audio-to-english';

export type ScaffoldStage = 'acquire' | 'recognize' | 'recall' | 'use';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface DirectionalMastery {
  readonly direction: LearningDirection;
  readonly stage: ScaffoldStage;
  readonly successStreak: number;
  readonly lapseStreak: number;
  readonly attempts: number;
  readonly reason: string;
}

export interface ConfusionEdge {
  readonly sourceSenseId: string;
  readonly targetSenseId: string;
  readonly kind: 'spelling' | 'semantic' | 'morphology' | 'user-error';
  readonly weight: number;
  readonly count: number;
  readonly lastSeenAt: string;
  readonly history: readonly string[];
}

export interface CueEffectiveness {
  readonly senseId: string;
  readonly cueType: CueType;
  readonly successes: number;
  readonly attempts: number;
  readonly confusingVotes: number;
}

export interface AttentionSettings {
  readonly dailyAppearances: number;
  readonly dailyNewLimit: number;
  readonly dailyReviewLimit: number;
  readonly minimumIntervalMinutes: number;
  readonly quietStart: string;
  readonly quietEnd: string;
  readonly focusMode: boolean;
  readonly safeFullscreenDetection: boolean;
}

export interface AttentionState {
  readonly dayKey: string;
  readonly appearances: number;
  readonly newCount: number;
  readonly reviewCount: number;
  readonly lastShownAt: string | null;
  readonly snoozedUntil: string | null;
  readonly pausedUntil: string | null;
}

export interface ReviewCandidate {
  readonly cardId: string;
  readonly senseId: string;
  readonly dueAt: string;
  readonly isNew: boolean;
  readonly rescueRequired: boolean;
  readonly confusionWeight: number;
  readonly selectedStage: Stage;
  readonly examDate?: string;
}
