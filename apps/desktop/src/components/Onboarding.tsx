import { useMemo, useState } from 'react';
import { stages } from '@vocabsprite/domain';
import type { Stage } from '@vocabsprite/domain';
import { DAILY_NEW_LIMIT_MAX, DAILY_REVIEW_LIMIT_MAX } from '../state/model';
import type { UserPreferences } from '../state/model';

const stageLabels: Readonly<Record<Stage, { title: string; note: string }>> = {
  primary: { title: '小学基础', note: '图片、发音与短句优先' },
  junior: { title: '初中核心', note: '拼写、搭配与基础语境' },
  senior: { title: '高中核心', note: '多义词与词性转换' },
  cet4: { title: 'CET-4', note: '生活与常用学术语境' },
  cet6: { title: 'CET-6', note: '抽象义与近义辨析' },
  postgraduate: { title: '考研英语', note: '熟词生义与长句语境' },
  custom: { title: '自定义词包', note: '导入合法拥有的 CSV / JSON' },
};

interface OnboardingProps {
  readonly initial: UserPreferences;
  readonly onComplete: (preferences: UserPreferences) => void;
}

interface LimitPickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly presetMinimum: number;
  readonly presetMaximum: number;
  readonly customMaximum: number;
  readonly onChange: (value: number) => void;
}

function LimitPicker({
  id,
  label,
  value,
  presetMinimum,
  presetMaximum,
  customMaximum,
  onChange,
}: LimitPickerProps) {
  const [custom, setCustom] = useState(value > presetMaximum);
  const [draft, setDraft] = useState(String(value));
  const parsedDraft = Number(draft);
  const draftValid =
    draft.trim() !== '' &&
    Number.isSafeInteger(parsedDraft) &&
    parsedDraft >= 1 &&
    parsedDraft <= customMaximum;
  const helpId = `${id}-help`;

  return (
    <div className="budget-limit-card">
      <div className="budget-limit-heading">
        <label htmlFor={custom ? `${id}-custom` : `${id}-preset`}>{label}</label>
        <output htmlFor={custom ? `${id}-custom` : `${id}-preset`}>{value}</output>
      </div>
      {custom ? (
        <label className="custom-limit-field" htmlFor={`${id}-custom`}>
          <span>输入自定义数量</span>
          <input
            id={`${id}-custom`}
            type="number"
            inputMode="numeric"
            min="1"
            max={customMaximum}
            step="1"
            value={draft}
            aria-label={`${label}自定义数量`}
            aria-describedby={helpId}
            aria-invalid={!draftValid}
            onChange={(event) => {
              const nextDraft = event.target.value;
              const nextValue = Number(nextDraft);
              setDraft(nextDraft);
              if (
                nextDraft.trim() !== '' &&
                Number.isSafeInteger(nextValue) &&
                nextValue >= 1 &&
                nextValue <= customMaximum
              )
                onChange(nextValue);
            }}
            onBlur={() => {
              if (!draftValid) setDraft(String(value));
            }}
          />
          <small id={helpId}>可填 1–{customMaximum.toLocaleString('zh-CN')} 的整数</small>
        </label>
      ) : (
        <input
          id={`${id}-preset`}
          type="range"
          min={presetMinimum}
          max={presetMaximum}
          value={Math.min(presetMaximum, Math.max(presetMinimum, value))}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setDraft(String(nextValue));
            onChange(nextValue);
          }}
        />
      )}
      <button
        className="custom-limit-toggle"
        type="button"
        aria-label={custom ? `使用${label}常用范围` : `自定义${label}`}
        aria-expanded={custom}
        onClick={() => {
          if (custom) {
            const nextValue = Math.min(presetMaximum, Math.max(presetMinimum, value));
            setDraft(String(nextValue));
            onChange(nextValue);
          } else {
            setDraft(String(value));
          }
          setCustom((current) => !current);
        }}
      >
        {custom ? '使用常用范围' : '自定义'}
      </button>
    </div>
  );
}

export function Onboarding({ initial, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState(initial);
  const [placementKnown, setPlacementKnown] = useState(false);
  const placementQuestions = useMemo(
    () => [
      'adapt',
      'effect',
      'principle',
      'maintain',
      'contrast',
      'stable',
      'journey',
      'protect',
      'infer',
      'respond',
    ],
    [],
  );

  const toggleStage = (stage: Stage) => {
    const selected = new Set(preferences.selectedStages);
    if (selected.has(stage)) selected.delete(stage);
    else selected.add(stage);
    setPreferences({ ...preferences, selectedStages: [...selected] });
  };

  return (
    <main className="onboarding-shell" id="main-content">
      <div className="brand-lockup">
        <span className="sprite-mark" aria-hidden="true">
          V
        </span>
        <div>
          <strong>VocabSprite</strong>
          <small>桌角单词精灵</small>
        </div>
      </div>
      <div className="step-dots" aria-label={`首次设置，第 ${step + 1} 步，共 6 步`}>
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={index <= step ? 'active' : ''} />
        ))}
      </div>
      <section className="onboarding-card">
        {step === 0 && (
          <>
            <p className="eyebrow">欢迎</p>
            <h1>让单词出现得刚刚好。</h1>
            <p className="lede">
              没有账号，没有云端依赖。你的词包、复习记录、图片缓存与设置默认只留在这台设备。
            </p>
            <label className="field">
              界面语言
              <select
                value={preferences.locale}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    locale: event.target.value as 'zh-CN' | 'en',
                  })
                }
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="privacy-promise">
              <span aria-hidden="true">⌂</span>
              <div>
                <strong>离线优先</strong>
                <p>未明确选择前，不访问网络；AI 默认关闭，核心学习不依赖 AI。</p>
              </div>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <p className="eyebrow">学习目标 · 可多选</p>
            <h1>你想从哪里开始？</h1>
            <p>相同词义只学一次；同一拼写的不同义项会分别保留。</p>
            <div className="module-grid onboarding-modules">
              {stages.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  className={
                    preferences.selectedStages.includes(stage)
                      ? 'module-option selected'
                      : 'module-option'
                  }
                  onClick={() => toggleStage(stage)}
                  aria-pressed={preferences.selectedStages.includes(stage)}
                >
                  <strong>{stageLabels[stage].title}</strong>
                  <small>{stageLabels[stage].note}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="eyebrow">注意力预算</p>
            <h1>今天，打扰到这里为止。</h1>
            <p className="budget-hint">常用范围可直接拖动；学习量较大时可选择自定义。</p>
            <div className="range-grid">
              <LimitPicker
                id="daily-new-limit"
                label="每日新词"
                value={preferences.dailyNewLimit}
                presetMinimum={1}
                presetMaximum={30}
                customMaximum={DAILY_NEW_LIMIT_MAX}
                onChange={(dailyNewLimit) =>
                  setPreferences({ ...preferences, dailyNewLimit })
                }
              />
              <LimitPicker
                id="daily-review-limit"
                label="每日复习"
                value={preferences.dailyReviewLimit}
                presetMinimum={5}
                presetMaximum={100}
                customMaximum={DAILY_REVIEW_LIMIT_MAX}
                onChange={(dailyReviewLimit) =>
                  setPreferences({ ...preferences, dailyReviewLimit })
                }
              />
              <label>
                最多弹卡 <output>{preferences.dailyAppearances}</output>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={preferences.dailyAppearances}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      dailyAppearances: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="inline-fields">
              <label>
                安静开始
                <input
                  type="time"
                  value={preferences.quietStart}
                  onChange={(event) =>
                    setPreferences({ ...preferences, quietStart: event.target.value })
                  }
                />
              </label>
              <label>
                安静结束
                <input
                  type="time"
                  value={preferences.quietEnd}
                  onChange={(event) =>
                    setPreferences({ ...preferences, quietEnd: event.target.value })
                  }
                />
              </label>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <p className="eyebrow">桌面卡片</p>
            <h1>放在不挡事的角落。</h1>
            <fieldset>
              <legend>出现位置</legend>
              <div className="corner-picker">
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
                  (corner) => (
                    <button
                      type="button"
                      aria-label={corner}
                      aria-pressed={preferences.cardCorner === corner}
                      className={
                        preferences.cardCorner === corner ? 'corner active' : 'corner'
                      }
                      onClick={() => setPreferences({ ...preferences, cardCorner: corner })}
                      key={corner}
                    >
                      <span />
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <label className="switch-row">
              <span>
                <strong>卡片置顶</strong>
                <small>可随时在设置里关闭</small>
              </span>
              <input
                type="checkbox"
                checked={preferences.topmost}
                onChange={(event) =>
                  setPreferences({ ...preferences, topmost: event.target.checked })
                }
              />
            </label>
            <label className="field">
              动态强度
              <select
                value={preferences.motion}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    motion: event.target.value as UserPreferences['motion'],
                  })
                }
              >
                <option value="off">关闭动态效果</option>
                <option value="low">低强度</option>
                <option value="standard">标准强度</option>
              </select>
            </label>
          </>
        )}
        {step === 4 && (
          <>
            <p className="eyebrow">快速摸底 · 可跳过</p>
            <h1>先跳过你已经很熟的词。</h1>
            <div className="placement-strip">
              {placementQuestions.map((word, index) => (
                <span
                  key={word}
                  className={index < (placementKnown ? 7 : 3) ? 'known' : ''}
                >
                  {word}
                </span>
              ))}
            </div>
            <p>这是本地演示摸底；选择可以撤销，不会一次点击就把全部方向标记为掌握。</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPlacementKnown((value) => !value)}
            >
              {placementKnown ? '撤销本次摸底选择' : '标记前七个为已识别'}
            </button>
          </>
        )}
        {step === 5 && (
          <>
            <p className="eyebrow">准备完成</p>
            <h1>第一张卡会说明自己为什么出现。</h1>
            <ul className="ready-list">
              <li>
                <span>✓</span> 已选择 {preferences.selectedStages.length}{' '}
                个模块，重叠义项自动融合
              </li>
              <li>
                <span>✓</span> 每日最多 {preferences.dailyAppearances} 次环境式弹卡
              </li>
              <li>
                <span>✓</span> 关闭卡片表示稍后再来，不会删除学习记录
              </li>
              <li>
                <span>✓</span> 所有数据默认保存在本机
              </li>
            </ul>
          </>
        )}
        <footer className="onboarding-actions">
          <button
            type="button"
            className="text-button"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            上一步
          </button>
          {step < 5 ? (
            <button
              type="button"
              className="primary-button"
              disabled={step === 1 && preferences.selectedStages.length === 0}
              onClick={() => setStep((value) => Math.min(5, value + 1))}
            >
              继续 <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => onComplete(preferences)}
            >
              显示第一张卡 <span aria-hidden="true">→</span>
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
