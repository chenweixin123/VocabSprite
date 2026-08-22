import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stage, VocabularyPack, WordSense } from '@vocabsprite/domain';
import {
  buildDeterministicQueue,
  canShowAmbientCard,
  fusePacks,
  initialMastery,
  learningDirections,
} from '@vocabsprite/domain';
import { CompactCard } from './components/CompactCard';
import { DotView } from './components/DotView';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { WordDetail } from './components/WordDetail';
import { demoPacks } from './data/demo';
import { useReducedMotion } from './hooks/useReducedMotion';
import { platform } from './platform';
import { ConfusionsPage } from './pages/ConfusionsPage';
import { Dashboard } from './pages/Dashboard';
import { LibraryPage } from './pages/LibraryPage';
import { ModulesPage } from './pages/ModulesPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  addConfusionToState,
  applyFeedbackToState,
  applyFsrsScheduleToState,
  initialFsrsCard,
  rateCueInState,
} from './state/model';
import type {
  AppState,
  CardPosition,
  ProductFeedback,
  QuestionType,
  UserPreferences,
} from './state/model';
import { clearState, loadState, restoreBackup, saveState } from './state/repository';

const questionTypes: readonly QuestionType[] = [
  'word-meaning',
  'meaning-word',
  'sentence-gap',
  'confusion-choice',
  'audio-word',
  'visual-word',
];

const displayKey = (): string => `${screen.width}x${screen.height}`;
const defaultPosition = (): CardPosition =>
  platform.isNative() ? { x: 0, y: 0 } : { x: Math.max(8, window.innerWidth - 360), y: 8 };

const resizeNativeCompactWindow = (size: {
  readonly width: number;
  readonly height: number;
}): void => {
  void platform.resizeCompactWindow(size.width, size.height);
};

const userPack = (senses: readonly WordSense[]): VocabularyPack => ({
  manifest: {
    schemaVersion: 1,
    id: 'user.local.imports',
    title: '本机自定义词包',
    stage: 'custom',
    version: '0.1.0',
    language: 'en',
    uiLocale: 'zh-CN',
    coverage: 'partial',
    officialStatus: 'user-created',
    sourceName: 'User imports stored locally',
    sourceUrl: null,
    license: 'User-provided; redistribution rights not asserted',
    attribution: null,
    checksum: `sha256:${'0'.repeat(64)}`,
  },
  senses,
  aliases: {},
});

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [detailSense, setDetailSense] = useState<WordSense | null>(null);
  const nativeHydrated = useRef(!platform.isNative());
  const reducedMotion = useReducedMotion();
  const fused = useMemo(
    () =>
      fusePacks(
        state.importedSenses.length === 0
          ? demoPacks
          : [...demoPacks, userPack(state.importedSenses)],
      ).senses,
    [state.importedSenses],
  );
  const activeSenses = useMemo(() => {
    const eligible = fused.filter(
      (item) =>
        item.memberships.some((membership) =>
          state.preferences.selectedStages.includes(membership.stage),
        ) && !state.deletedSenseIds.includes(item.sense.id),
    );
    const byId = new Map(eligible.map((item) => [item.sense.id, item.sense]));
    const queued = buildDeterministicQueue(
      eligible.map((item) => {
        const selectedStage =
          item.memberships.find((membership) =>
            state.preferences.selectedStages.includes(membership.stage),
          )?.stage ?? 'custom';
        const confusionWeight = state.confusions
          .filter(
            (edge) =>
              edge.sourceSenseId === item.sense.id || edge.targetSenseId === item.sense.id,
          )
          .reduce((sum, edge) => sum + edge.weight, 0);
        return {
          cardId: `card.${item.sense.id}`,
          senseId: item.sense.id,
          dueAt: state.fsrsCards[item.sense.id]?.dueAt ?? '1970-01-01T00:00:00.000Z',
          isNew: state.fsrsCards[item.sense.id] === undefined,
          rescueRequired: state.rescueSenseIds.includes(item.sense.id),
          confusionWeight,
          selectedStage,
        };
      }),
      {
        nowUtc: new Date().toISOString(),
        selectedStages: state.preferences.selectedStages,
        reviewLimit: state.preferences.dailyReviewLimit,
        newLimit: state.preferences.dailyNewLimit,
        seed: state.attention.dayKey,
        bridgeMode: true,
      },
    );
    return queued.flatMap((candidate) => {
      const sense = byId.get(candidate.senseId);
      return sense === undefined ? [] : [sense];
    });
  }, [fused, state]);
  const safeSenses =
    activeSenses.length > 0 ? activeSenses : fused.map((item) => item.sense);
  const currentSense =
    safeSenses[state.currentSenseIndex % safeSenses.length] ?? fused[0]?.sense;
  if (currentSense === undefined) throw new Error('No valid demo senses were loaded.');
  const questionType =
    questionTypes[state.currentSenseIndex % questionTypes.length] ?? 'word-meaning';
  const position = state.positionsByDisplay[displayKey()] ?? defaultPosition();

  useEffect(() => {
    if (!platform.isNative()) return;
    void platform.loadNativeState().then((stateJson) => {
      const hydrated =
        stateJson === null ? loadState() : loadState({ getItem: () => stateJson });
      setState(hydrated);
      void platform.resizeWindow(
        hydrated.onboardingComplete ? hydrated.windowMode : 'expanded',
      );
      nativeHydrated.current = true;
    });
  }, []);
  useEffect(() => {
    saveState(state);
    if (nativeHydrated.current) {
      void platform.saveNativeState(JSON.stringify(state));
    }
  }, [state]);
  useEffect(() => {
    const listeners = [
      platform.listen<void>('tray-open', () =>
        setState((previous) => ({
          ...previous,
          windowMode: 'expanded',
          page: 'today',
          statusMessage: '已从系统托盘打开主页。',
        })),
      ),
      platform.listen<void>('tray-next', () =>
        setState((previous) => ({
          ...previous,
          currentSenseIndex: previous.currentSenseIndex + 1,
          revealed: false,
          statusMessage: '已从系统托盘选择下一个词。',
        })),
      ),
      platform.listen<number>('tray-pause', (event) => {
        const until = new Date(Date.now() + event.payload * 60_000).toISOString();
        setState((previous) => ({
          ...previous,
          windowMode: 'dot',
          attention: { ...previous.attention, snoozedUntil: until },
          statusMessage: `已从系统托盘暂停 ${event.payload} 分钟。`,
        }));
        void platform.pause(until);
        void platform.resizeWindow('dot');
      }),
      platform.listen<number>('native-close-snooze', (event) => {
        const until = new Date(Date.now() + event.payload * 60_000).toISOString();
        setState((previous) => ({
          ...previous,
          windowMode: 'dot',
          attention: { ...previous.attention, snoozedUntil: until },
          statusMessage: '窗口关闭已转换为 snooze，没有删除数据。',
        }));
      }),
    ];
    return () => {
      for (const listener of listeners) void listener.then((unlisten) => unlisten?.());
    };
  }, []);
  useEffect(() => {
    const listener = platform.listen<void>('clipboard-shortcut', () => {
      void platform.readClipboardAfterShortcut().then((value) => {
        if (value === null || value.trim() === '') return;
        const normalized = value.trim().toLocaleLowerCase('en-US');
        const match = fused.find(
          (item) => item.sense.lemma.toLocaleLowerCase('en-US') === normalized,
        )?.sense;
        setState((previous) => ({
          ...previous,
          windowMode: 'expanded',
          page: 'library',
          statusMessage:
            match === undefined
              ? '快捷键已读取剪贴板，但本地词包中没有精确匹配；内容未写日志。'
              : '快捷键已读取并匹配本地词义；内容未写日志。',
        }));
        if (match !== undefined) setDetailSense(match);
        void platform.resizeWindow('expanded');
      });
    });
    return () => {
      void listener.then((unlisten) => unlisten?.());
    };
  }, [fused]);
  useEffect(() => {
    if (state.windowMode !== 'dot') return;
    const deadlines = [state.attention.snoozedUntil, state.attention.pausedUntil]
      .filter((value): value is string => value !== null)
      .map(Date.parse)
      .filter(Number.isFinite);
    if (deadlines.length === 0) return;
    const deadline = Math.max(...deadlines);
    const delay = Math.max(0, deadline - Date.now());
    const timeout = window.setTimeout(
      () => {
        const now = new Date();
        const nowUtc = now.toISOString();
        const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const attention =
          state.attention.dayKey === dayKey
            ? state.attention
            : {
                dayKey,
                appearances: 0,
                newCount: 0,
                reviewCount: 0,
                lastShownAt: null,
                snoozedUntil: null,
                pausedUntil: null,
              };
        const isNew = state.fsrsCards[currentSense.id] === undefined;
        const decision = canShowAmbientCard({
          nowUtc,
          nowLocal: now,
          settings: {
            dailyAppearances: state.preferences.dailyAppearances,
            dailyNewLimit: state.preferences.dailyNewLimit,
            dailyReviewLimit: state.preferences.dailyReviewLimit,
            minimumIntervalMinutes: state.preferences.minimumIntervalMinutes,
            quietStart: state.preferences.quietStart,
            quietEnd: state.preferences.quietEnd,
            focusMode: false,
            safeFullscreenDetection: state.preferences.fullscreenDetection,
          },
          state: attention,
          isNew,
          userInitiated: false,
          fullscreenStatus: state.preferences.fullscreenDetection ? 'unknown' : 'inactive',
        });
        if (!decision.allowed) {
          setState((previous) => ({
            ...previous,
            attention,
            statusMessage: `自动弹卡已安全阻止：${decision.reason ?? 'unknown'}。应用不会轮询。`,
          }));
          return;
        }
        setState((previous) => ({
          ...previous,
          windowMode: 'compact',
          revealed: false,
          attention: {
            ...attention,
            appearances: attention.appearances + 1,
            newCount: attention.newCount + (isNew ? 1 : 0),
            reviewCount: attention.reviewCount + (isNew ? 0 : 1),
            lastShownAt: nowUtc,
            snoozedUntil: null,
            pausedUntil: null,
          },
          statusMessage: '已在注意力预算内显示一张到期卡；窗口使用不抢焦点路径。',
        }));
        void platform.resizeWindow('compact');
      },
      Math.min(delay, 2_147_000_000),
    );
    return () => window.clearTimeout(timeout);
  }, [currentSense.id, state]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences.theme;
    document.documentElement.dataset.windowMode = state.onboardingComplete
      ? state.windowMode
      : 'expanded';
    document.documentElement.lang = state.preferences.locale;
  }, [
    state.onboardingComplete,
    state.preferences.theme,
    state.preferences.locale,
    state.windowMode,
  ]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      )
        return;
      if (event.key === 'Escape' && detailSense !== null) {
        setDetailSense(null);
        return;
      }
      if (state.windowMode !== 'compact' || !state.revealed) return;
      const mapping: Readonly<Record<string, ProductFeedback>> = {
        '1': 'forgotten',
        '2': 'fuzzy',
        '3': 'remembered',
        '4': 'too-easy',
      };
      const feedback = mapping[event.key];
      if (feedback !== undefined)
        setState((previous) =>
          applyFeedbackToState(
            previous,
            currentSense,
            questionType,
            feedback,
            new Date().toISOString(),
          ),
        );
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentSense, detailSense, questionType, state.revealed, state.windowMode]);

  const setWindowMode = (mode: AppState['windowMode']) => {
    setState((previous) => ({ ...previous, windowMode: mode }));
    void platform.resizeWindow(mode);
  };
  const next = () =>
    setState((previous) => ({
      ...previous,
      currentSenseIndex: previous.currentSenseIndex + 1,
      revealed: false,
      statusMessage: '已按确定性队列选择下一张卡。',
    }));
  const snooze = (minutes: number) => {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    setState((previous) => ({
      ...previous,
      windowMode: 'dot',
      revealed: false,
      attention: { ...previous.attention, snoozedUntil: until },
      statusMessage: `已暂停 ${minutes} 分钟；关闭没有删除任何学习记录。`,
    }));
    void platform.snooze(until);
    void platform.resizeWindow('dot');
  };
  const handleFeedback = (feedback: ProductFeedback) => {
    const nowUtc = new Date().toISOString();
    const previousFsrs =
      state.fsrsCards[currentSense.id] ??
      initialFsrsCard(nowUtc, state.preferences.targetRetention);
    setState((previous) =>
      applyFeedbackToState(previous, currentSense, questionType, feedback, nowUtc),
    );
    void platform.scheduleReview(previousFsrs, nowUtc, feedback).then((schedule) => {
      if (schedule !== null) {
        setState((previous) =>
          applyFsrsScheduleToState(previous, currentSense.id, schedule),
        );
      }
    });
  };
  const updatePreferences = (preferences: UserPreferences) =>
    setState((previous) => ({ ...previous, preferences }));
  const toggleStage = (stage: Stage) =>
    setState((previous) => {
      const selected = new Set(previous.preferences.selectedStages);
      if (selected.has(stage)) selected.delete(stage);
      else selected.add(stage);
      return {
        ...previous,
        preferences: { ...previous.preferences, selectedStages: [...selected] },
        currentSenseIndex: 0,
        statusMessage: '模块选择已更新；共享义项和既有进度均保留。',
      };
    });

  if (!state.onboardingComplete) {
    return (
      <Onboarding
        initial={state.preferences}
        onComplete={(preferences) => {
          setState((previous) => ({
            ...previous,
            onboardingComplete: true,
            preferences,
            windowMode: 'compact',
            statusMessage: '设置完成；所有数据默认保存在本机。',
          }));
          void platform.setTopmost(preferences.topmost);
          void platform.resizeWindow('compact');
        }}
      />
    );
  }

  if (state.windowMode === 'dot') {
    return (
      <DotView
        remaining={Math.max(
          0,
          state.preferences.dailyAppearances - state.attention.appearances,
        )}
        onOpen={() => setWindowMode('compact')}
        onContextMenu={() => snooze(60)}
      />
    );
  }

  if (state.windowMode === 'compact') {
    const mastery =
      state.mastery[currentSense.id] ??
      learningDirections.map((direction) => initialMastery(direction));
    const fusedSense = fused.find((item) => item.sense.id === currentSense.id);
    const overlap =
      fusedSense?.memberships.map((item) => item.stage).join(' + ') ?? 'custom';
    return (
      <main
        className={
          platform.isNative() ? 'compact-stage native-compact-stage' : 'compact-stage'
        }
        id="main-content"
      >
        <CompactCard
          key={`${currentSense.id}:${questionType}`}
          sense={currentSense}
          questionType={questionType}
          preferences={state.preferences}
          mastery={mastery}
          prefersReducedMotion={reducedMotion}
          revealed={state.revealed}
          whyNow={`${overlap} 模块中的该义项已到期；今日预算剩余 ${Math.max(0, state.preferences.dailyAppearances - state.attention.appearances)} 次。`}
          rescue={state.rescueSenseIds.includes(currentSense.id)}
          position={position}
          onPosition={(nextPosition) =>
            setState((previous) => ({
              ...previous,
              positionsByDisplay: {
                ...previous.positionsByDisplay,
                [displayKey()]: nextPosition,
              },
            }))
          }
          onReveal={() => setState((previous) => ({ ...previous, revealed: true }))}
          onFeedback={handleFeedback}
          onConfusion={(targetLemma) => {
            const target = fused.find((item) => item.sense.lemma === targetLemma)?.sense;
            if (target !== undefined)
              setState((previous) =>
                addConfusionToState(
                  previous,
                  currentSense.id,
                  target.id,
                  new Date().toISOString(),
                ),
              );
          }}
          onNext={next}
          onSnooze={snooze}
          onExpand={() => setWindowMode('expanded')}
          onOpenSettings={() => {
            setState((previous) => ({
              ...previous,
              windowMode: 'expanded',
              page: 'settings',
              statusMessage: '已打开完整设置；小屏快捷设置会自动保留。',
            }));
            void platform.resizeWindow('expanded');
          }}
          onMinimize={() => setWindowMode('dot')}
          onPreferences={updatePreferences}
          onSizeChange={resizeNativeCompactWindow}
        />
      </main>
    );
  }

  const reviewedSenseIds = new Set(state.reviewEvents.map((event) => event.senseId));
  return (
    <main className="expanded-shell" id="main-content">
      <Sidebar
        page={state.page}
        onPage={(page) => setState((previous) => ({ ...previous, page }))}
        onCompact={() => setWindowMode('compact')}
      />
      <div className="content-shell">
        {state.page === 'today' && (
          <Dashboard
            state={state}
            currentSense={currentSense}
            fused={fused}
            onStudy={() => setWindowMode('compact')}
            onOpenSense={setDetailSense}
            onDataSettings={() =>
              setState((previous) => ({ ...previous, page: 'settings' }))
            }
          />
        )}
        {state.page === 'modules' && (
          <ModulesPage
            packs={
              state.importedSenses.length === 0
                ? demoPacks
                : [...demoPacks, userPack(state.importedSenses)]
            }
            fused={fused}
            selected={state.preferences.selectedStages}
            reviewedSenseIds={reviewedSenseIds}
            onToggle={toggleStage}
            onSettings={() => setState((previous) => ({ ...previous, page: 'settings' }))}
          />
        )}
        {state.page === 'confusions' && (
          <ConfusionsPage
            senses={fused.map((item) => item.sense)}
            edges={state.confusions}
          />
        )}
        {state.page === 'library' && (
          <LibraryPage
            fused={fused}
            deletedIds={state.deletedSenseIds}
            onOpen={setDetailSense}
          />
        )}
        {state.page === 'settings' && (
          <SettingsPage
            state={state}
            onPreferences={updatePreferences}
            onImport={(senses, report) =>
              setState((previous) => {
                const byIdentity = new Map(
                  previous.importedSenses.map((sense) => [sense.identityKey, sense]),
                );
                for (const sense of senses) byIdentity.set(sense.identityKey, sense);
                return {
                  ...previous,
                  importedSenses: [...byIdentity.values()],
                  importReports: [report, ...previous.importReports].slice(0, 30),
                  preferences: {
                    ...previous.preferences,
                    selectedStages: [
                      ...new Set([
                        ...previous.preferences.selectedStages,
                        'custom' as const,
                      ]),
                    ],
                  },
                  statusMessage: `导入成功：${senses.length} 个义项已原子提交。`,
                };
              })
            }
            onRestore={(contents) => {
              try {
                setState(restoreBackup(contents));
              } catch (error) {
                setState((previous) => ({
                  ...previous,
                  statusMessage: error instanceof Error ? error.message : String(error),
                }));
              }
            }}
            onDeleteAll={() => {
              void platform.deleteNativeData();
              clearState();
              setState(createCleanState());
            }}
          />
        )}
      </div>
      <div className="global-status" role="status">
        {state.statusMessage}
      </div>
      {detailSense !== null && (
        <WordDetail
          sense={detailSense}
          fused={fused.find((item) => item.sense.id === detailSense.id)}
          state={state}
          prefersReducedMotion={reducedMotion}
          onClose={() => setDetailSense(null)}
          onDelete={(senseId) => {
            setState((previous) => ({
              ...previous,
              deletedSenseIds: [...new Set([...previous.deletedSenseIds, senseId])],
              statusMessage: '已删除个人学习对象；词包内容和无关历史未受影响。',
            }));
            setDetailSense(null);
          }}
          onSaveNote={(senseId, note) =>
            setState((previous) => ({
              ...previous,
              notesBySense: { ...previous.notesBySense, [senseId]: note },
              statusMessage: '个人笔记已保存在本机。',
            }))
          }
          onCueVote={(senseId, cueType, vote) =>
            setState((previous) => rateCueInState(previous, senseId, cueType, vote))
          }
        />
      )}
    </main>
  );
}

function createCleanState(): AppState {
  const clean = loadState({ getItem: () => null });
  return { ...clean, statusMessage: '全部个人数据已删除；捆绑演示内容仍可重新开始使用。' };
}
