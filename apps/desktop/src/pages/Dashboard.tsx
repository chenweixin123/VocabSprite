import type { FusedSense, Stage, WordSense } from '@vocabsprite/domain';
import type { AppState } from '../state/model';

const stageTitles: Readonly<Record<Stage, string>> = {
  primary: '小学基础',
  junior: '初中核心',
  senior: '高中核心',
  cet4: 'CET-4',
  cet6: 'CET-6',
  postgraduate: '考研英语',
  custom: '自定义',
};

interface DashboardProps {
  readonly state: AppState;
  readonly currentSense: WordSense;
  readonly fused: readonly FusedSense[];
  readonly onStudy: () => void;
  readonly onOpenSense: (sense: WordSense) => void;
  readonly onDataSettings: () => void;
}

export function Dashboard({
  state,
  currentSense,
  fused,
  onStudy,
  onOpenSense,
  onDataSettings,
}: DashboardProps) {
  const today = new Date();
  const localDay = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayEvents = state.reviewEvents.filter(
    (event) => localDay(new Date(event.reviewedAtUtc)) === localDay(today),
  );
  const todayNew = new Set(todayEvents.map((event) => event.senseId)).size;
  const reviewDays = new Set(
    state.reviewEvents.map((event) => localDay(new Date(event.reviewedAtUtc))),
  );
  const streakCursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!reviewDays.has(localDay(streakCursor)))
    streakCursor.setDate(streakCursor.getDate() - 1);
  let streak = 0;
  while (reviewDays.has(localDay(streakCursor))) {
    streak += 1;
    streakCursor.setDate(streakCursor.getDate() - 1);
  }
  const reviewedIds = new Set(state.reviewEvents.map((event) => event.senseId));
  const stages = state.preferences.selectedStages;
  const stageStats = stages.map((stage) => {
    const senses = fused.filter((item) =>
      item.memberships.some((membership) => membership.stage === stage),
    );
    const learned = senses.filter((item) => reviewedIds.has(item.sense.id)).length;
    const recognizedInStage = senses.filter((item) =>
      state.mastery[item.sense.id]?.some((direction) => direction.stage !== 'acquire'),
    ).length;
    return {
      stage,
      total: senses.length,
      learned,
      recognized: recognizedInStage,
      percent: senses.length === 0 ? 0 : Math.round((learned / senses.length) * 100),
    };
  });
  const masteredDirections = Object.values(state.mastery).flat();
  const recognized = masteredDirections.filter((item) => item.stage !== 'acquire').length;
  const recallable = masteredDirections.filter(
    (item) => item.stage === 'recall' || item.stage === 'use',
  ).length;
  const usable = masteredDirections.filter((item) => item.stage === 'use').length;
  const topConfusion = [...state.confusions].sort((a, b) => b.weight - a.weight)[0];
  const senseById = new Map(fused.map((item) => [item.sense.id, item.sense]));
  const currentFsrs = state.fsrsCards[currentSense.id];
  const nextWeek = today.getTime() + 7 * 86_400_000;
  const upcomingReviews = Object.values(state.fsrsCards).filter(
    (card) => Date.parse(card.dueAt) <= nextWeek,
  ).length;
  const recentRescue = state.reviewEvents.find((event) =>
    state.rescueSenseIds.includes(event.senseId),
  );

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            本地时间 ·{' '}
            {new Intl.DateTimeFormat('zh-CN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}
          </p>
          <h1>今天，稳稳记住几个词。</h1>
          <p>队列由到期程度、模块、注意力预算和你的易混记录共同决定。</p>
        </div>
        <button className="primary-button study-now" type="button" onClick={onStudy}>
          <span className="sprite-dot" />
          开始本轮学习 <span>→</span>
        </button>
      </header>
      <section className="metric-grid" aria-label="今日学习统计">
        <article>
          <span className="metric-icon violet">＋</span>
          <div>
            <small>今日新学</small>
            <strong>{todayNew}</strong>
            <p>上限 {state.preferences.dailyNewLimit}</p>
          </div>
        </article>
        <article>
          <span className="metric-icon blue">↻</span>
          <div>
            <small>今日复习</small>
            <strong>{todayEvents.length}</strong>
            <p>计划 {state.preferences.dailyReviewLimit}</p>
          </div>
        </article>
        <article>
          <span className="metric-icon amber">◔</span>
          <div>
            <small>注意力预算</small>
            <strong>
              {Math.max(
                0,
                state.preferences.dailyAppearances - state.attention.appearances,
              )}
            </strong>
            <p>今日剩余次数</p>
          </div>
        </article>
        <article>
          <span className="metric-icon green">↗</span>
          <div>
            <small>连续学习</small>
            <strong>
              {streak}
              <em> 天</em>
            </strong>
            <p>从第一条本地记录算起</p>
          </div>
        </article>
      </section>
      <section className="dashboard-columns">
        <div className="dashboard-main">
          <article className="panel next-card-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">下一张 · 为什么现在出现</p>
                <h2>{currentSense.lemma}</h2>
              </div>
              <span className="stage-chip">{currentSense.partOfSpeech}</span>
            </div>
            <p className="next-definition">{currentSense.definitionZh}</p>
            <p>
              {state.rescueSenseIds.includes(currentSense.id)
                ? '连续遗忘触发 Memory Rescue；本次优先切换助记通道。'
                : currentFsrs === undefined
                  ? '这是当前预算内的新义项；首次反馈后由原生 FSRS 计算间隔。'
                  : `FSRS 到期时间：${new Intl.DateTimeFormat('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(currentFsrs.dueAt))}。`}
            </p>
            <div className="next-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onOpenSense(currentSense)}
              >
                查看详情
              </button>
              <button type="button" className="primary-button" onClick={onStudy}>
                现在复习
              </button>
            </div>
          </article>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">模块融合进度</p>
                <h2>一次学习，多处继承</h2>
              </div>
              <span className="explain-badge">同义项自动去重</span>
            </div>
            <div className="module-progress-list">
              {stageStats.map((item) => (
                <div className="module-progress" key={item.stage}>
                  <div>
                    <strong>{stageTitles[item.stage]}</strong>
                    <span>
                      主动见过 {item.learned} · 可识别 {item.recognized} / {item.total}
                    </span>
                  </div>
                  <div
                    className="progress-track"
                    aria-label={`${stageTitles[item.stage]} ${item.percent}%`}
                  >
                    <span style={{ width: `${item.percent}%` }} />
                  </div>
                  <b>{item.percent}%</b>
                </div>
              ))}
            </div>
          </article>
          <article className="panel mastery-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">不是一个含混的“词汇量”</p>
                <h2>五层掌握视图</h2>
              </div>
            </div>
            <div className="mastery-levels">
              {[
                ['已见', reviewedIds.size],
                ['可识别', recognized],
                ['可回忆', recallable],
                ['可运用', usable],
                ['成熟', Math.floor(usable / 2)],
              ].map(([label, value], index) => (
                <div key={String(label)}>
                  <span className={`level-dot level-${index}`} />
                  <strong>{value}</strong>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
        <aside className="dashboard-side">
          <article className="panel budget-panel">
            <div
              className="radial-budget"
              style={
                {
                  '--budget': `${Math.max(8, 100 - (state.attention.appearances / state.preferences.dailyAppearances) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {Math.max(
                    0,
                    state.preferences.dailyAppearances - state.attention.appearances,
                  )}
                </strong>
                <small>次剩余</small>
              </div>
            </div>
            <h3>环境式注意力预算</h3>
            <p>
              最短间隔 {state.preferences.minimumIntervalMinutes} 分钟
              <br />
              安静时段 {state.preferences.quietStart}—{state.preferences.quietEnd}
            </p>
          </article>
          <article className="panel confusion-peek">
            <div className="panel-heading">
              <h3>最常混淆</h3>
              <span>个人图谱</span>
            </div>
            {topConfusion === undefined ? (
              <div className="empty-mini">
                <span>⌁</span>
                <p>答错成另一个词时，具体关系会出现在这里。</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const source = senseById.get(topConfusion.sourceSenseId);
                  if (source) onOpenSense(source);
                }}
              >
                <strong>
                  {senseById.get(topConfusion.sourceSenseId)?.lemma ?? '词义 A'}{' '}
                  <span>↔</span>{' '}
                  {senseById.get(topConfusion.targetSenseId)?.lemma ?? '词义 B'}
                </strong>
                <small>
                  权重 {topConfusion.weight.toFixed(1)} · {topConfusion.count} 次
                </small>
              </button>
            )}
          </article>
          <article className="panel cue-panel">
            <div className="panel-heading">
              <h3>助记画像</h3>
              <span>本机统计</span>
            </div>
            {state.cueEffectiveness.length === 0 ? (
              <p>给助记评价后，这里会显示最有效的线索类型。</p>
            ) : (
              <>
                <strong>
                  {
                    [...state.cueEffectiveness].sort(
                      (a, b) => b.successes / b.attempts - a.successes / a.attempts,
                    )[0]?.cueType
                  }
                </strong>
                <p>目前对你最有效；救援时优先考虑未充分尝试且效果好的通道。</p>
              </>
            )}
          </article>
          <article className="panel workload-panel">
            <div className="panel-heading">
              <h3>即将到来的负担</h3>
              <span>FSRS · 7 天</span>
            </div>
            <strong>{upcomingReviews} 张</strong>
            <p>
              {recentRescue === undefined
                ? '最近没有待处理的 Memory Rescue。'
                : `${senseById.get(recentRescue.senseId)?.lemma ?? '某义项'} 最近触发了 Memory Rescue。`}
            </p>
            <button type="button" className="secondary-button" onClick={onDataSettings}>
              导出或备份数据
            </button>
          </article>
        </aside>
      </section>
    </div>
  );
}
