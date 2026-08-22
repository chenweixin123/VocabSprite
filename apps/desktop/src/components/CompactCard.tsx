import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DirectionalMastery, WordSense } from '@vocabsprite/domain';
import { MotionWord } from '@vocabsprite/ui';
import { platform, speakWord } from '../platform';
import type {
  CompactCardColor,
  CompactCardSize,
  ProductFeedback,
  QuestionType,
  UserPreferences,
} from '../state/model';
import { questionDirection } from '../state/model';
import { clampCardPosition } from './cardPosition';
import { Icon } from './Icon';

const stageLabel = {
  acquire: '获取',
  recognize: '识别',
  recall: '回忆',
  use: '运用',
} as const;
const typeLabel: Readonly<Record<QuestionType, string>> = {
  'word-meaning': '单词 → 含义',
  'meaning-word': '含义 → 单词',
  'sentence-gap': '情境 → 单词',
  'confusion-choice': '易混词辨析',
  'audio-word': '听音辨词',
  'visual-word': '图景 → 单词',
};

interface CompactCardProps {
  readonly sense: WordSense;
  readonly questionType: QuestionType;
  readonly preferences: UserPreferences;
  readonly mastery: readonly DirectionalMastery[];
  readonly prefersReducedMotion: boolean;
  readonly revealed: boolean;
  readonly whyNow: string;
  readonly rescue: boolean;
  readonly position: { readonly x: number; readonly y: number };
  readonly onPosition: (position: { readonly x: number; readonly y: number }) => void;
  readonly onReveal: () => void;
  readonly onFeedback: (feedback: ProductFeedback) => void;
  readonly onConfusion: (targetLemma: string) => void;
  readonly onNext: () => void;
  readonly onSnooze: (minutes: number) => void;
  readonly onExpand: () => void;
  readonly onOpenSettings: () => void;
  readonly onMinimize: () => void;
  readonly onPreferences: (preferences: UserPreferences) => void;
  readonly onSizeChange?: (size: {
    readonly width: number;
    readonly height: number;
  }) => void;
}

const compactCardSizes: readonly {
  readonly value: CompactCardSize;
  readonly label: string;
}[] = [
  { value: 'small', label: '紧凑' },
  { value: 'standard', label: '标准' },
  { value: 'large', label: '宽大' },
];

const compactCardColors: readonly {
  readonly value: CompactCardColor;
  readonly label: string;
}[] = [
  { value: 'violet', label: '经典紫' },
  { value: 'blue', label: '海盐蓝' },
  { value: 'green', label: '薄荷绿' },
  { value: 'amber', label: '暖杏色' },
];

function buildQuestionHint(sense: WordSense, type: QuestionType): string {
  if (type === 'word-meaning') {
    const collocation = sense.collocations[0];
    return collocation === undefined
      ? `先从词性 ${sense.partOfSpeech} 和当前语境入手，不直接看答案。`
      : `看看常见搭配“${collocation}”，再从语境联想核心义。`;
  }
  if (type === 'confusion-choice')
    return `先比较选项的词性与句中作用；本义项的词性是 ${sense.partOfSpeech}。`;
  const letters = Array.from(sense.lemma);
  const firstLetter = letters[0]?.toLocaleUpperCase('en-US') ?? '?';
  return `首字母是“${firstLetter}”，共 ${letters.length} 个字母；词性是 ${sense.partOfSpeech}。`;
}

function Prompt({
  sense,
  type,
  revealed,
}: {
  readonly sense: WordSense;
  readonly type: QuestionType;
  readonly revealed: boolean;
}) {
  const example = sense.examples[0];
  const gap = example?.text.replace(new RegExp(`\\b${sense.lemma}\\b`, 'i'), '_____') ?? '';
  if (type === 'word-meaning')
    return <p className="question-line">想一想它在这里的核心含义。</p>;
  if (type === 'meaning-word')
    return (
      <>
        <p className="meaning-prompt">{sense.definitionZh}</p>
        <p className="question-line">说出对应的英文单词。</p>
      </>
    );
  if (type === 'sentence-gap')
    return <blockquote className="gap-sentence">{gap}</blockquote>;
  if (type === 'confusion-choice')
    return (
      <>
        <blockquote className="gap-sentence">{gap}</blockquote>
        <p className="question-line">哪个词放在这里最准确？</p>
      </>
    );
  if (type === 'audio-word')
    return <p className="question-line">点击播放，再说出你听到的词。</p>;
  if (type === 'visual-word')
    return <p className="question-line">用这个场景唤起英文表达。</p>;
  return revealed ? <p>{sense.definitionZh}</p> : null;
}

export function CompactCard(props: CompactCardProps) {
  const { sense, questionType, preferences, onSizeChange } = props;
  const [answer, setAnswer] = useState('');
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [failedVisualAsset, setFailedVisualAsset] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const lastReportedSize = useRef({ width: 0, height: 0 });
  const lastDragPosition = useRef<{ x: number; y: number } | null>(null);
  const [dragOrigin, setDragOrigin] = useState<{
    readonly pointerX: number;
    readonly pointerY: number;
    readonly cardX: number;
    readonly cardY: number;
    readonly cardWidth: number;
    readonly cardHeight: number;
  } | null>(null);
  const direction = questionDirection[questionType];
  const questionHint = useMemo(
    () => buildQuestionHint(sense, questionType),
    [questionType, sense],
  );
  const visualFailed = failedVisualAsset === sense.visualAssetId;
  const directionMastery = props.mastery.find((item) => item.direction === direction);
  const choices = useMemo(
    () =>
      [
        sense.lemma,
        ...(sense.confusables.length > 0 ? [sense.confusables[0] ?? ''] : ['effect']),
      ].sort(),
    [sense],
  );

  useEffect(() => {
    const card = cardRef.current;
    if (card === null || onSizeChange === undefined) return;
    let animationFrame = 0;
    const reportSize = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        // Twelve transparent pixels above and below retain the rounded card shadow
        // without leaving a large invisible window that blocks desktop clicks.
        const bounds = card.getBoundingClientRect();
        const nextSize = {
          width: Math.ceil(bounds.width + 24),
          height: Math.ceil(Math.max(bounds.height, card.scrollHeight) + 24),
        };
        if (
          nextSize.width === lastReportedSize.current.width &&
          nextSize.height === lastReportedSize.current.height
        )
          return;
        lastReportedSize.current = nextSize;
        onSizeChange(nextSize);
      });
    };
    reportSize();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reportSize);
    observer?.observe(card);
    const reportAfterWindowResize = () => {
      // A persisted Compact state can render before the native shell has switched
      // from its decorated startup geometry. Force one retry after that transition,
      // even when the card's own content size has not changed.
      lastReportedSize.current = { width: 0, height: 0 };
      reportSize();
    };
    window.addEventListener('resize', reportAfterWindowResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      window.removeEventListener('resize', reportAfterWindowResize);
    };
  }, [onSizeChange]);

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      (event.target as HTMLElement).closest(
        'button,input,select,a,label,.compact-settings-panel',
      ) !== null
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    lastDragPosition.current = props.position;
    setDragOrigin({
      pointerX: event.clientX,
      pointerY: event.clientY,
      cardX: props.position.x,
      cardY: props.position.y,
      cardWidth: bounds.width,
      cardHeight: bounds.height,
    });
  };
  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragOrigin === null) return;
    const position = clampCardPosition(
      {
        x: dragOrigin.cardX + event.clientX - dragOrigin.pointerX,
        y: dragOrigin.cardY + event.clientY - dragOrigin.pointerY,
      },
      { width: window.innerWidth, height: window.innerHeight },
      { width: dragOrigin.cardWidth, height: dragOrigin.cardHeight },
    );
    lastDragPosition.current = position;
    props.onPosition(position);
  };
  const endDrag = () => {
    const position = lastDragPosition.current ?? props.position;
    setDragOrigin(null);
    lastDragPosition.current = null;
    void platform.savePosition(`${screen.width}x${screen.height}`, position.x, position.y);
  };

  const answerCorrect =
    answer.trim().localeCompare(sense.lemma, undefined, { sensitivity: 'base' }) === 0;
  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => props.onPreferences({ ...preferences, [key]: value });

  return (
    <article
      ref={cardRef}
      className="compact-card"
      data-size={preferences.compactCardSize}
      data-color={preferences.compactCardColor}
      aria-label={`${sense.lemma} 学习卡`}
      style={{
        left: props.position.x,
        top: props.position.y,
        opacity: preferences.opacity,
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
    >
      <header className="card-titlebar" data-tauri-drag-region>
        <div className="card-context">
          <span className="sprite-dot" aria-hidden="true" />
          <span>{typeLabel[questionType]}</span>
          <span>·</span>
          <span className="stage-pill">
            {stageLabel[directionMastery?.stage ?? 'acquire']}
          </span>
        </div>
        <div className="window-actions">
          <button
            type="button"
            aria-label={settingsOpen ? '关闭卡片快捷设置' : '打开卡片快捷设置'}
            aria-expanded={settingsOpen}
            title="卡片快捷设置"
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen((open) => !open);
            }}
          >
            ⚙
          </button>
          <button
            type="button"
            aria-label="最小化为圆点"
            title="最小化为圆点"
            onClick={props.onMinimize}
          >
            —
          </button>
          <button
            type="button"
            aria-label="展开详细面板"
            title="展开"
            onClick={props.onExpand}
          >
            ↗
          </button>
          <button
            type="button"
            aria-label="关闭并稍后再出现"
            title="关闭等于稍后再来"
            onClick={() => props.onSnooze(15)}
          >
            ×
          </button>
        </div>
      </header>
      {settingsOpen ? (
        <section className="compact-settings-panel" aria-label="卡片快捷设置">
          <div className="compact-settings-heading">
            <div>
              <strong>卡片快捷设置</strong>
              <small>更改会立即保存到本机</small>
            </div>
            <button
              type="button"
              className="compact-settings-done"
              onClick={() => setSettingsOpen(false)}
            >
              完成
            </button>
          </div>
          <div className="compact-setting-group">
            <span className="compact-setting-label">卡片大小</span>
            <div className="compact-segmented" role="group" aria-label="卡片大小">
              {compactCardSizes.map((size) => (
                <button
                  type="button"
                  key={size.value}
                  aria-pressed={preferences.compactCardSize === size.value}
                  onClick={() => updatePreference('compactCardSize', size.value)}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
          <div className="compact-setting-group">
            <span className="compact-setting-label">卡片配色</span>
            <div className="compact-color-options" role="group" aria-label="卡片配色">
              {compactCardColors.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  className={`compact-color-option color-${color.value}`}
                  aria-label={color.label}
                  aria-pressed={preferences.compactCardColor === color.value}
                  onClick={() => updatePreference('compactCardColor', color.value)}
                >
                  <span aria-hidden="true" />
                  {color.label}
                </button>
              ))}
            </div>
          </div>
          <label className="compact-range-setting">
            <span>
              <b>透明度</b>
              <small>{Math.round(preferences.opacity * 100)}%</small>
            </span>
            <input
              aria-label="卡片透明度"
              type="range"
              min="0.72"
              max="1"
              step="0.01"
              value={preferences.opacity}
              onChange={(event) => {
                const opacity = Number(event.target.value);
                updatePreference('opacity', opacity);
                void platform.setOpacity(opacity);
              }}
            />
          </label>
          <label className="compact-select-setting">
            <span>
              <b>动态模式</b>
              <small>系统减少动态设置始终优先</small>
            </span>
            <select
              aria-label="卡片动态模式"
              value={preferences.motion}
              onChange={(event) =>
                updatePreference('motion', event.target.value as UserPreferences['motion'])
              }
            >
              <option value="off">关闭</option>
              <option value="low">柔和</option>
              <option value="standard">标准</option>
            </select>
          </label>
          <label className="compact-switch-setting">
            <span>
              <b>想不起来时显示“提示”按钮</b>
              <small>默认关闭；提示不会直接显示答案</small>
            </span>
            <input
              aria-label="想不起来时提供提示"
              type="checkbox"
              checked={preferences.hintEnabled}
              onChange={(event) => updatePreference('hintEnabled', event.target.checked)}
            />
          </label>
          <label className="compact-switch-setting">
            <span>
              <b>保持置顶</b>
              <small>不会主动抢走键盘焦点</small>
            </span>
            <input
              aria-label="小屏卡片保持置顶"
              type="checkbox"
              checked={preferences.topmost}
              onChange={(event) => {
                updatePreference('topmost', event.target.checked);
                void platform.setTopmost(event.target.checked);
              }}
            />
          </label>
          <button
            type="button"
            className="compact-full-settings"
            onClick={props.onOpenSettings}
          >
            打开全部设置 <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : (
        <>
          <div className="compact-body">
            {props.rescue && (
              <div className="rescue-banner">
                <span aria-hidden="true">↻</span> 本次换一种方法，因为你连续两次没有想起。
              </div>
            )}
            <div className="word-row">
              <div>
                {questionType === 'word-meaning' || props.revealed ? (
                  <h1>
                    <MotionWord
                      recipe={sense.motion}
                      motionSetting={preferences.motion}
                      prefersReducedMotion={props.prefersReducedMotion}
                    >
                      {sense.lemma}
                    </MotionWord>
                  </h1>
                ) : (
                  <h1 className="masked-word" aria-label="待回忆单词">
                    ••••••
                  </h1>
                )}
                <span className="phonetic">
                  {sense.partOfSpeech} · {sense.senseKey.replaceAll('-', ' ')}
                </span>
              </div>
              <button
                className="sound-button"
                type="button"
                aria-label={`播放 ${sense.lemma} 的发音`}
                onClick={() =>
                  setVoiceAvailable(
                    speakWord(sense.lemma, preferences.speechRate, preferences.speechVoice),
                  )
                }
              >
                <Icon>◖</Icon>
                <span>发音</span>
              </button>
            </div>
            {!voiceAvailable && (
              <p className="soft-warning" role="status">
                未找到可用英语语音；你仍可继续学习。
              </p>
            )}
            {questionType === 'visual-word' &&
              sense.visualAssetId !== undefined &&
              !visualFailed && (
                <img
                  className="card-scene"
                  src={`/assets/scenes/${sense.visualAssetId}.svg`}
                  alt={`${sense.lemma} 的原创助记场景`}
                  loading="lazy"
                  onError={() => setFailedVisualAsset(sense.visualAssetId ?? null)}
                />
              )}
            {questionType === 'visual-word' &&
              (sense.visualAssetId === undefined || visualFailed) && (
                <div className="scene-fallback" role="img" aria-label="本地图景不可用">
                  <span aria-hidden="true">◇</span>
                  <p>用一句自己的话想象这个词的场景。</p>
                </div>
              )}
            <Prompt sense={sense} type={questionType} revealed={props.revealed} />
            {!props.revealed && preferences.hintEnabled && !hintShown && (
              <button
                className="hint-button"
                type="button"
                onClick={() => setHintShown(true)}
              >
                <span aria-hidden="true">◇</span> 给我一点提示
              </button>
            )}
            {!props.revealed && preferences.hintEnabled && hintShown && (
              <div className="hint-panel" role="status" aria-live="polite">
                <span aria-hidden="true">◇</span>
                <p>{questionHint}</p>
              </div>
            )}
            {!props.revealed && questionType === 'confusion-choice' && (
              <div className="choice-row">
                {choices.map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    className="choice-button"
                    onClick={() => {
                      setAnswer(choice);
                      props.onReveal();
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
            {!props.revealed &&
              ['meaning-word', 'sentence-gap', 'audio-word', 'visual-word'].includes(
                questionType,
              ) && (
                <form
                  className="recall-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    props.onReveal();
                  }}
                >
                  <label>
                    <span className="sr-only">输入英文答案</span>
                    <input
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder="点击这里后输入答案"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <button className="primary-button" type="submit">
                    检查
                  </button>
                </form>
              )}
            {!props.revealed && questionType === 'word-meaning' && (
              <button className="reveal-button" type="button" onClick={props.onReveal}>
                显示答案
              </button>
            )}
            {props.revealed && (
              <div className="answer-panel" aria-live="polite">
                <div className="answer-heading">
                  <span
                    className={
                      answer.length === 0
                        ? 'answer-neutral'
                        : answerCorrect
                          ? 'answer-correct'
                          : 'answer-wrong'
                    }
                  >
                    {answer.length === 0
                      ? '核心义'
                      : answerCorrect
                        ? '✓ 回忆正确'
                        : '答案对照'}
                  </span>
                  <strong>{sense.definitionZh}</strong>
                </div>
                <p>{sense.definitionEn}</p>
                <p className="example">
                  <span>{sense.examples[0]?.text}</span>
                  <small>{sense.examples[0]?.translation}</small>
                </p>
              </div>
            )}
            <details className="why-now">
              <summary>为什么现在出现？</summary>
              <p>{props.whyNow}</p>
            </details>
          </div>
          <footer className="card-footer">
            {props.revealed ? (
              <>
                <div className="feedback-row" aria-label="复习反馈">
                  <button type="button" onClick={() => props.onFeedback('forgotten')}>
                    <span>忘记</span>
                    <kbd>1</kbd>
                  </button>
                  <button type="button" onClick={() => props.onFeedback('fuzzy')}>
                    <span>模糊</span>
                    <kbd>2</kbd>
                  </button>
                  <button type="button" onClick={() => props.onFeedback('remembered')}>
                    <span>记得</span>
                    <kbd>3</kbd>
                  </button>
                  <button type="button" onClick={() => props.onFeedback('too-easy')}>
                    <span>太简单</span>
                    <kbd>4</kbd>
                  </button>
                </div>
                {sense.confusables.length > 0 && (
                  <div className="confusion-quick">
                    <span>我错成了：</span>
                    {sense.confusables.map((word) => (
                      <button
                        type="button"
                        key={word}
                        onClick={() => props.onConfusion(word)}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className="next-button"
                  type="button"
                  onClick={() => {
                    setAnswer('');
                    props.onNext();
                  }}
                >
                  下一张 <span aria-hidden="true">→</span>
                </button>
              </>
            ) : (
              <div className="budget-mini">
                <span>今日注意力预算</span>
                <strong>还有 {Math.max(0, preferences.dailyAppearances - 1)} 次</strong>
              </div>
            )}
          </footer>
        </>
      )}
      {menuOpen && (
        <div className="context-menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
          <button role="menuitem" type="button" onClick={() => props.onSnooze(15)}>
            暂停 15 分钟
          </button>
          <button role="menuitem" type="button" onClick={() => props.onSnooze(60)}>
            暂停 1 小时
          </button>
          <button role="menuitem" type="button" onClick={props.onNext}>
            下一个词
          </button>
          <button role="menuitem" type="button" onClick={props.onExpand}>
            打开主页
          </button>
          <button role="menuitem" type="button" onClick={() => void platform.exit()}>
            退出
          </button>
        </div>
      )}
    </article>
  );
}
