import { createIdentityKey, stages } from '@vocabsprite/domain';
import type { AppState, UserPreferences } from './model';
import { createInitialState, DAILY_NEW_LIMIT_MAX, DAILY_REVIEW_LIMIT_MAX } from './model';

type UnknownRecord = Record<string, unknown>;

const pages = ['today', 'modules', 'confusions', 'library', 'settings'] as const;
const windowModes = ['dot', 'compact', 'expanded'] as const;
const locales = ['zh-CN', 'en'] as const;
const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const compactCardSizes = ['small', 'standard', 'large'] as const;
const compactCardColors = ['violet', 'blue', 'green', 'amber'] as const;
const motionSettings = ['off', 'low', 'standard'] as const;
const themes = ['light', 'dark', 'system', 'contrast'] as const;
const directions = [
  'english-to-meaning',
  'meaning-to-english',
  'context-to-english',
  'audio-to-english',
] as const;
const feedback = ['forgotten', 'fuzzy', 'remembered', 'too-easy'] as const;
const scaffoldStages = ['acquire', 'recognize', 'recall', 'use'] as const;
const confusionKinds = ['spelling', 'semantic', 'morphology', 'user-error'] as const;
const cueTypes = ['visual', 'sound', 'morphology', 'contrast'] as const;
const partsOfSpeech = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'pronoun',
  'interjection',
] as const;
const motionKinds = [
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
] as const;

const stableIdPattern = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
const safeTextPattern = /<\/?(?:script|iframe|object|embed)\b|javascript\s*:/i;
const dayKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEnum = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && allowed.includes(value as T);

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isFiniteNumber = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= minimum &&
  value <= maximum;

const isInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;

const isText = (value: unknown, maximum = 2_000): value is string =>
  typeof value === 'string' && value.length <= maximum;

const isSafeContentText = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= maximum &&
  !safeTextPattern.test(value);

const isStableId = (value: unknown): value is string =>
  typeof value === 'string' && stableIdPattern.test(value);

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
  !Number.isNaN(Date.parse(value));

const isNullableTimestamp = (value: unknown): value is string | null =>
  value === null || isIsoTimestamp(value);

const isStringArray = (
  value: unknown,
  maximumItems: number,
  maximumLength: number,
  safeContent = false,
): value is readonly string[] =>
  Array.isArray(value) &&
  value.length <= maximumItems &&
  value.every((item) =>
    safeContent ? isSafeContentText(item, maximumLength) : isText(item, maximumLength),
  );

const hasAtMostKeys = (value: UnknownRecord, maximum: number): boolean =>
  Object.keys(value).length <= maximum;

function isPreferences(value: unknown): value is UserPreferences {
  if (!isRecord(value)) return false;
  return (
    isEnum(value.locale, locales) &&
    Array.isArray(value.selectedStages) &&
    value.selectedStages.length <= stages.length &&
    value.selectedStages.every((stage) => isEnum(stage, stages)) &&
    new Set(value.selectedStages).size === value.selectedStages.length &&
    isInteger(value.dailyNewLimit, 1, DAILY_NEW_LIMIT_MAX) &&
    isInteger(value.dailyReviewLimit, 1, DAILY_REVIEW_LIMIT_MAX) &&
    isInteger(value.dailyAppearances, 1, 60) &&
    isInteger(value.minimumIntervalMinutes, 5, 240) &&
    typeof value.quietStart === 'string' &&
    timePattern.test(value.quietStart) &&
    typeof value.quietEnd === 'string' &&
    timePattern.test(value.quietEnd) &&
    isBoolean(value.topmost) &&
    isFiniteNumber(value.opacity, 0.5, 1) &&
    isEnum(value.compactCardSize, compactCardSizes) &&
    isEnum(value.compactCardColor, compactCardColors) &&
    isBoolean(value.hintEnabled) &&
    isEnum(value.cardCorner, corners) &&
    isEnum(value.motion, motionSettings) &&
    isEnum(value.theme, themes) &&
    isBoolean(value.autoplayPronunciation) &&
    isText(value.speechVoice, 200) &&
    isFiniteNumber(value.speechRate, 0.5, 1.5) &&
    isBoolean(value.autoStart) &&
    isBoolean(value.fullscreenDetection) &&
    isFiniteNumber(value.targetRetention, 0.7, 0.97) &&
    isBoolean(value.networkOptIn) &&
    isBoolean(value.telemetryOptIn)
  );
}

function isReviewEvent(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isText(value.id, 500) &&
    isStableId(value.senseId) &&
    isEnum(value.direction, directions) &&
    isEnum(value.feedback, feedback) &&
    isIsoTimestamp(value.reviewedAtUtc) &&
    isEnum(value.stageAfter, scaffoldStages) &&
    isText(value.reason, 2_000)
  );
}

function isDirectionalMastery(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isEnum(value.direction, directions) &&
    isEnum(value.stage, scaffoldStages) &&
    isInteger(value.successStreak, 0, 1_000_000) &&
    isInteger(value.lapseStreak, 0, 1_000_000) &&
    isInteger(value.attempts, 0, 1_000_000) &&
    isText(value.reason, 2_000)
  );
}

function isMasteryMap(value: unknown): boolean {
  if (!isRecord(value) || !hasAtMostKeys(value, 50_000)) return false;
  return Object.entries(value).every(
    ([key, mastery]) =>
      isStableId(key) &&
      Array.isArray(mastery) &&
      mastery.length <= directions.length &&
      mastery.every(isDirectionalMastery),
  );
}

function isFsrsCard(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const memory = value.memory;
  const validMemory =
    memory === null ||
    (isRecord(memory) &&
      isFiniteNumber(memory.stability, 0, 1_000_000_000) &&
      isFiniteNumber(memory.difficulty, 0, 100));
  return (
    validMemory &&
    isNullableTimestamp(value.lastReviewedAt) &&
    isIsoTimestamp(value.dueAt) &&
    isFiniteNumber(value.desiredRetention, 0.7, 0.99)
  );
}

function isFsrsMap(value: unknown): boolean {
  if (!isRecord(value) || !hasAtMostKeys(value, 50_000)) return false;
  return Object.entries(value).every(([key, card]) => isStableId(key) && isFsrsCard(card));
}

function isConfusionEdge(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isStableId(value.sourceSenseId) &&
    isStableId(value.targetSenseId) &&
    value.sourceSenseId !== value.targetSenseId &&
    isEnum(value.kind, confusionKinds) &&
    isFiniteNumber(value.weight, 0, 10) &&
    isInteger(value.count, 0, 1_000_000) &&
    isIsoTimestamp(value.lastSeenAt) &&
    Array.isArray(value.history) &&
    value.history.length <= 50 &&
    value.history.every(isIsoTimestamp)
  );
}

function isCueEffectiveness(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isStableId(value.senseId) &&
    isEnum(value.cueType, cueTypes) &&
    isInteger(value.successes, 0, 1_000_000) &&
    isInteger(value.attempts, 0, 1_000_000) &&
    isInteger(value.confusingVotes, 0, 1_000_000) &&
    value.successes <= value.attempts &&
    value.confusingVotes <= value.attempts
  );
}

function isAttention(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.dayKey === 'string' &&
    dayKeyPattern.test(value.dayKey) &&
    isInteger(value.appearances, 0, 1_000_000) &&
    isInteger(value.newCount, 0, 1_000_000) &&
    isInteger(value.reviewCount, 0, 1_000_000) &&
    isNullableTimestamp(value.lastShownAt) &&
    isNullableTimestamp(value.snoozedUntil) &&
    isNullableTimestamp(value.pausedUntil)
  );
}

function isPositions(value: unknown): boolean {
  if (!isRecord(value) || !hasAtMostKeys(value, 100)) return false;
  return Object.entries(value).every(([display, position]) => {
    if (!/^\d{2,5}x\d{2,5}$/.test(display) || !isRecord(position)) return false;
    return (
      isFiniteNumber(position.x, -100_000, 100_000) &&
      isFiniteNumber(position.y, -100_000, 100_000)
    );
  });
}

function isWordSense(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    !isStableId(value.id) ||
    !isText(value.identityKey, 256) ||
    !isStableId(value.lexemeId) ||
    !isSafeContentText(value.lemma, 80) ||
    !isEnum(value.partOfSpeech, partsOfSpeech) ||
    !isStableId(value.senseKey) ||
    value.identityKey !==
      createIdentityKey(value.lemma, value.partOfSpeech, value.senseKey) ||
    !isSafeContentText(value.definitionZh, 300) ||
    !isSafeContentText(value.definitionEn, 500) ||
    !Array.isArray(value.examples) ||
    value.examples.length === 0 ||
    value.examples.length > 10
  )
    return false;
  const validExamples = value.examples.every((example) => {
    if (!isRecord(example)) return false;
    return (
      isStableId(example.id) &&
      isSafeContentText(example.text, 300) &&
      isSafeContentText(example.translation, 300) &&
      (example.source === 'original' || example.source === 'user')
    );
  });
  if (!validExamples) return false;
  if (
    !isStringArray(value.collocations, 20, 100, true) ||
    !isStringArray(value.synonyms, 20, 80, true) ||
    !isStringArray(value.antonyms, 20, 80, true) ||
    !isStringArray(value.confusables, 20, 80, true) ||
    !isStringArray(value.morphology, 20, 100, true) ||
    !Array.isArray(value.cues) ||
    value.cues.length > 12
  )
    return false;
  const validCues = value.cues.every((cue) => {
    if (!isRecord(cue)) return false;
    return (
      isStableId(cue.id) &&
      isEnum(cue.type, cueTypes) &&
      isSafeContentText(cue.text, 500) &&
      isBoolean(cue.verified)
    );
  });
  if (!validCues || !isRecord(value.motion)) return false;
  return (
    isEnum(value.motion.kind, motionKinds) &&
    (value.motion.intensity === 'low' || value.motion.intensity === 'standard') &&
    isInteger(value.motion.durationMs, 150, 3_000) &&
    (value.motion.iterationCount === 1 || value.motion.iterationCount === 2) &&
    (value.visualAssetId === undefined || isStableId(value.visualAssetId))
  );
}

function isStringRecord(
  value: unknown,
  maximumKeys: number,
  maximumLength: number,
): boolean {
  if (!isRecord(value) || !hasAtMostKeys(value, maximumKeys)) return false;
  return Object.entries(value).every(
    ([key, item]) => isStableId(key) && isText(item, maximumLength),
  );
}

function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    isBoolean(value.onboardingComplete) &&
    isPreferences(value.preferences) &&
    isEnum(value.page, pages) &&
    isEnum(value.windowMode, windowModes) &&
    isInteger(value.currentSenseIndex, 0, Number.MAX_SAFE_INTEGER) &&
    isBoolean(value.revealed) &&
    Array.isArray(value.reviewEvents) &&
    value.reviewEvents.length <= 500 &&
    value.reviewEvents.every(isReviewEvent) &&
    isMasteryMap(value.mastery) &&
    isFsrsMap(value.fsrsCards) &&
    Array.isArray(value.confusions) &&
    value.confusions.length <= 50_000 &&
    value.confusions.every(isConfusionEdge) &&
    Array.isArray(value.cueEffectiveness) &&
    value.cueEffectiveness.length <= 50_000 &&
    value.cueEffectiveness.every(isCueEffectiveness) &&
    isStringArray(value.rescueSenseIds, 50_000, 128) &&
    value.rescueSenseIds.every(isStableId) &&
    isAttention(value.attention) &&
    isPositions(value.positionsByDisplay) &&
    isStringArray(value.deletedSenseIds, 50_000, 128) &&
    value.deletedSenseIds.every(isStableId) &&
    Array.isArray(value.importedSenses) &&
    value.importedSenses.length <= 50_000 &&
    value.importedSenses.every(isWordSense) &&
    isStringRecord(value.notesBySense, 50_000, 20_000) &&
    isStringArray(value.importReports, 30, 2_000) &&
    isText(value.statusMessage, 2_000)
  );
}

const valueOrDefault = (
  source: UnknownRecord,
  key: keyof AppState,
  fallback: unknown,
): unknown => (source[key] === undefined ? fallback : source[key]);

/**
 * Merge same-schema snapshots with current defaults, then validate every field before the
 * result can enter React or the scheduler. Unknown keys are deliberately discarded.
 */
export function normalizePersistedState(value: unknown): AppState | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.preferences))
    return null;
  const initial = createInitialState();
  const candidate: unknown = {
    schemaVersion: 1,
    onboardingComplete: valueOrDefault(
      value,
      'onboardingComplete',
      initial.onboardingComplete,
    ),
    preferences: { ...initial.preferences, ...value.preferences },
    page: valueOrDefault(value, 'page', initial.page),
    windowMode: valueOrDefault(value, 'windowMode', initial.windowMode),
    currentSenseIndex: valueOrDefault(
      value,
      'currentSenseIndex',
      initial.currentSenseIndex,
    ),
    revealed: valueOrDefault(value, 'revealed', initial.revealed),
    reviewEvents: valueOrDefault(value, 'reviewEvents', initial.reviewEvents),
    mastery: valueOrDefault(value, 'mastery', initial.mastery),
    fsrsCards: valueOrDefault(value, 'fsrsCards', initial.fsrsCards),
    confusions: valueOrDefault(value, 'confusions', initial.confusions),
    cueEffectiveness: valueOrDefault(value, 'cueEffectiveness', initial.cueEffectiveness),
    rescueSenseIds: valueOrDefault(value, 'rescueSenseIds', initial.rescueSenseIds),
    attention: valueOrDefault(value, 'attention', initial.attention),
    positionsByDisplay: valueOrDefault(
      value,
      'positionsByDisplay',
      initial.positionsByDisplay,
    ),
    deletedSenseIds: valueOrDefault(value, 'deletedSenseIds', initial.deletedSenseIds),
    importedSenses: valueOrDefault(value, 'importedSenses', initial.importedSenses),
    notesBySense: valueOrDefault(value, 'notesBySense', initial.notesBySense),
    importReports: valueOrDefault(value, 'importReports', initial.importReports),
    statusMessage: valueOrDefault(value, 'statusMessage', initial.statusMessage),
  };
  return isAppState(candidate) ? candidate : null;
}
