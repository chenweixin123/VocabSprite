import {
  applyReview,
  initialMastery,
  learningDirections,
  recordConfusion,
  updateCueEffectiveness,
} from '@vocabsprite/domain';
import type {
  AttentionState,
  ConfusionEdge,
  CueEffectiveness,
  DirectionalMastery,
  LearningDirection,
  ReviewRating,
  ScaffoldStage,
  Stage,
  WordSense,
} from '@vocabsprite/domain';

export type WindowMode = 'dot' | 'compact' | 'expanded';
export type Page = 'today' | 'modules' | 'confusions' | 'library' | 'settings';
export type ProductFeedback = 'forgotten' | 'fuzzy' | 'remembered' | 'too-easy';
export type CompactCardSize = 'small' | 'standard' | 'large';
export type CompactCardColor = 'violet' | 'blue' | 'green' | 'amber';
export type QuestionType =
  | 'word-meaning'
  | 'meaning-word'
  | 'sentence-gap'
  | 'confusion-choice'
  | 'audio-word'
  | 'visual-word';

// The onboarding sliders stay intentionally conservative, while these guarded
// maxima leave room for users who deliberately run much larger study sessions.
export const DAILY_NEW_LIMIT_MAX = 1_000;
export const DAILY_REVIEW_LIMIT_MAX = 5_000;

export interface UserPreferences {
  readonly locale: 'zh-CN' | 'en';
  readonly selectedStages: readonly Stage[];
  readonly dailyNewLimit: number;
  readonly dailyReviewLimit: number;
  readonly dailyAppearances: number;
  readonly minimumIntervalMinutes: number;
  readonly quietStart: string;
  readonly quietEnd: string;
  readonly topmost: boolean;
  readonly opacity: number;
  readonly compactCardSize: CompactCardSize;
  readonly compactCardColor: CompactCardColor;
  readonly hintEnabled: boolean;
  readonly cardCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  readonly motion: 'off' | 'low' | 'standard';
  readonly theme: 'light' | 'dark' | 'system' | 'contrast';
  readonly autoplayPronunciation: boolean;
  readonly speechVoice: string;
  readonly speechRate: number;
  readonly autoStart: boolean;
  readonly fullscreenDetection: boolean;
  readonly targetRetention: number;
  readonly networkOptIn: boolean;
  readonly telemetryOptIn: boolean;
}

export interface ReviewEventView {
  readonly id: string;
  readonly senseId: string;
  readonly direction: LearningDirection;
  readonly feedback: ProductFeedback;
  readonly reviewedAtUtc: string;
  readonly stageAfter: ScaffoldStage;
  readonly reason: string;
}

export interface CardPosition {
  readonly x: number;
  readonly y: number;
}

export interface FsrsMemoryView {
  readonly stability: number;
  readonly difficulty: number;
}

export interface FsrsCardView {
  readonly memory: FsrsMemoryView | null;
  readonly lastReviewedAt: string | null;
  readonly dueAt: string;
  readonly desiredRetention: number;
}

export interface FsrsScheduleView {
  readonly state: FsrsCardView;
  readonly intervalDays: number;
  readonly fsrsRating: number;
}

export interface AppState {
  readonly schemaVersion: 1;
  readonly onboardingComplete: boolean;
  readonly preferences: UserPreferences;
  readonly page: Page;
  readonly windowMode: WindowMode;
  readonly currentSenseIndex: number;
  readonly revealed: boolean;
  readonly reviewEvents: readonly ReviewEventView[];
  readonly mastery: Readonly<Record<string, readonly DirectionalMastery[]>>;
  readonly fsrsCards: Readonly<Record<string, FsrsCardView>>;
  readonly confusions: readonly ConfusionEdge[];
  readonly cueEffectiveness: readonly CueEffectiveness[];
  readonly rescueSenseIds: readonly string[];
  readonly attention: AttentionState;
  readonly positionsByDisplay: Readonly<Record<string, CardPosition>>;
  readonly deletedSenseIds: readonly string[];
  readonly importedSenses: readonly WordSense[];
  readonly notesBySense: Readonly<Record<string, string>>;
  readonly importReports: readonly string[];
  readonly statusMessage: string;
}

export const defaultPreferences: UserPreferences = {
  locale: 'zh-CN',
  selectedStages: ['senior', 'cet4'],
  dailyNewLimit: 8,
  dailyReviewLimit: 24,
  dailyAppearances: 12,
  minimumIntervalMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:30',
  topmost: true,
  opacity: 0.98,
  compactCardSize: 'standard',
  compactCardColor: 'violet',
  hintEnabled: false,
  cardCorner: 'bottom-right',
  motion: 'low',
  theme: 'system',
  autoplayPronunciation: false,
  speechVoice: '',
  speechRate: 0.9,
  autoStart: false,
  fullscreenDetection: true,
  targetRetention: 0.9,
  networkOptIn: false,
  telemetryOptIn: false,
};

const todayKey = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const createInitialState = (): AppState => ({
  schemaVersion: 1,
  onboardingComplete: false,
  preferences: defaultPreferences,
  page: 'today',
  windowMode: 'compact',
  currentSenseIndex: 0,
  revealed: false,
  reviewEvents: [],
  mastery: {},
  fsrsCards: {},
  confusions: [],
  cueEffectiveness: [],
  rescueSenseIds: [],
  attention: {
    dayKey: todayKey(),
    appearances: 0,
    newCount: 0,
    reviewCount: 0,
    lastShownAt: null,
    snoozedUntil: null,
    pausedUntil: null,
  },
  positionsByDisplay: {},
  deletedSenseIds: [],
  importedSenses: [],
  notesBySense: {},
  importReports: [],
  statusMessage: '所有学习数据默认保存在本机。',
});

const feedbackRating: Readonly<Record<ProductFeedback, ReviewRating>> = {
  forgotten: 'again',
  fuzzy: 'hard',
  remembered: 'good',
  'too-easy': 'easy',
};

export const questionDirection: Readonly<Record<QuestionType, LearningDirection>> = {
  'word-meaning': 'english-to-meaning',
  'meaning-word': 'meaning-to-english',
  'sentence-gap': 'context-to-english',
  'confusion-choice': 'context-to-english',
  'audio-word': 'audio-to-english',
  'visual-word': 'meaning-to-english',
};

export function initialFsrsCard(nowUtc: string, desiredRetention: number): FsrsCardView {
  return {
    memory: null,
    lastReviewedAt: null,
    dueAt: nowUtc,
    desiredRetention,
  };
}

export function applyFsrsScheduleToState(
  state: AppState,
  senseId: string,
  schedule: FsrsScheduleView,
): AppState {
  return {
    ...state,
    fsrsCards: { ...state.fsrsCards, [senseId]: schedule.state },
    statusMessage: `FSRS 已安排下次复习：约 ${Math.max(1, Math.round(schedule.intervalDays * 24))} 小时后。`,
  };
}

export function applyFeedbackToState(
  state: AppState,
  sense: WordSense,
  questionType: QuestionType,
  feedback: ProductFeedback,
  nowUtc: string,
): AppState {
  const direction = questionDirection[questionType];
  const previousDirections =
    state.mastery[sense.id] ?? learningDirections.map((item) => initialMastery(item));
  const previous =
    previousDirections.find((item) => item.direction === direction) ??
    initialMastery(direction);
  const transition = applyReview(previous, feedbackRating[feedback]);
  const nextDirections = previousDirections.map((item) =>
    item.direction === direction ? transition.mastery : item,
  );
  const event: ReviewEventView = {
    id: `review.${nowUtc}.${sense.id}.${direction}`,
    senseId: sense.id,
    direction,
    feedback,
    reviewedAtUtc: nowUtc,
    stageAfter: transition.mastery.stage,
    reason: transition.mastery.reason,
  };
  const rescue = new Set(state.rescueSenseIds);
  if (transition.rescueRequired) rescue.add(sense.id);
  else if (feedback === 'remembered' || feedback === 'too-easy') rescue.delete(sense.id);

  return {
    ...state,
    revealed: true,
    mastery: { ...state.mastery, [sense.id]: nextDirections },
    reviewEvents: [event, ...state.reviewEvents].slice(0, 500),
    rescueSenseIds: [...rescue],
    attention: {
      ...state.attention,
      lastShownAt: nowUtc,
    },
    statusMessage: transition.rescueRequired
      ? '本次换一种方法，因为你连续两次没有想起。'
      : transition.mastery.reason,
  };
}

export function addConfusionToState(
  state: AppState,
  sourceSenseId: string,
  targetSenseId: string,
  nowUtc: string,
): AppState {
  const existing = state.confusions.find(
    (edge) => edge.sourceSenseId === sourceSenseId && edge.targetSenseId === targetSenseId,
  );
  const next = recordConfusion(existing, sourceSenseId, targetSenseId, nowUtc);
  return {
    ...state,
    confusions: [
      ...state.confusions.filter(
        (edge) =>
          edge.sourceSenseId !== sourceSenseId || edge.targetSenseId !== targetSenseId,
      ),
      next,
    ],
    statusMessage: '已记录这次具体混淆；达到阈值后会出现辨析卡。',
  };
}

export function rateCueInState(
  state: AppState,
  senseId: string,
  cueType: CueEffectiveness['cueType'],
  vote: 'effective' | 'neutral' | 'confusing',
): AppState {
  const previous = state.cueEffectiveness.find(
    (item) => item.senseId === senseId && item.cueType === cueType,
  );
  const next = updateCueEffectiveness(previous, senseId, cueType, vote);
  return {
    ...state,
    cueEffectiveness: [
      ...state.cueEffectiveness.filter(
        (item) => item.senseId !== senseId || item.cueType !== cueType,
      ),
      next,
    ],
    statusMessage:
      vote === 'effective'
        ? '已记下：这类助记对你有效。'
        : vote === 'confusing'
          ? '已记下：以后降低这类助记的优先级。'
          : '已记录助记反馈。',
  };
}
