import { useState } from 'react';
import type { DirectionalMastery, FusedSense, WordSense } from '@vocabsprite/domain';
import { initialMastery, learningDirections } from '@vocabsprite/domain';
import { MotionWord } from '@vocabsprite/ui';
import { speakWord } from '../platform';
import type { AppState } from '../state/model';

const directionLabel = {
  'english-to-meaning': 'English → Meaning',
  'meaning-to-english': 'Meaning → English',
  'context-to-english': 'Context → English',
  'audio-to-english': 'Audio → English',
} as const;
const stagePercent = { acquire: 22, recognize: 48, recall: 74, use: 100 } as const;

interface WordDetailProps {
  readonly sense: WordSense;
  readonly fused: FusedSense | undefined;
  readonly state: AppState;
  readonly prefersReducedMotion: boolean;
  readonly onClose: () => void;
  readonly onDelete: (senseId: string) => void;
  readonly onSaveNote: (senseId: string, note: string) => void;
  readonly onCueVote: (
    senseId: string,
    cueType: 'visual' | 'sound' | 'morphology' | 'contrast',
    vote: 'effective' | 'confusing',
  ) => void;
}

export function WordDetail({
  sense,
  fused,
  state,
  prefersReducedMotion,
  onClose,
  onDelete,
  onSaveNote,
  onCueVote,
}: WordDetailProps) {
  const [deleteStep, setDeleteStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(state.notesBySense[sense.id] ?? '');
  const mastery: readonly DirectionalMastery[] =
    state.mastery[sense.id] ??
    learningDirections.map((direction) => initialMastery(direction));
  const history = state.reviewEvents
    .filter((event) => event.senseId === sense.id)
    .slice(0, 8);
  const confusionEdges = state.confusions.filter(
    (edge) => edge.sourceSenseId === sense.id || edge.targetSenseId === sense.id,
  );
  const scheduleAnchor = history[0]?.reviewedAtUtc ?? '2026-08-18T00:00:00.000Z';
  const nextDate = new Date(Date.parse(scheduleAnchor) + 86_400_000 * 2);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="word-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-detail-title"
      >
        <header className="detail-titlebar">
          <div>
            <p className="eyebrow">Sense detail · {sense.id}</p>
            <h1 id="word-detail-title">
              <MotionWord
                recipe={sense.motion}
                motionSetting={state.preferences.motion}
                prefersReducedMotion={prefersReducedMotion}
              >
                {sense.lemma}
              </MotionWord>
            </h1>
            <p>
              {sense.partOfSpeech} · {sense.senseKey.replaceAll('-', ' ')}
            </p>
          </div>
          <div className="detail-title-actions">
            <button
              type="button"
              onClick={() => speakWord(sense.lemma, state.preferences.speechRate)}
              aria-label={`播放 ${sense.lemma} 的美式发音`}
            >
              US ◖
            </button>
            <button
              type="button"
              onClick={() => speakWord(sense.lemma, state.preferences.speechRate * 0.92)}
              aria-label={`播放 ${sense.lemma} 的英式发音`}
            >
              UK ◖
            </button>
            <button
              type="button"
              className="close-detail"
              onClick={onClose}
              aria-label="关闭详情"
            >
              ×
            </button>
          </div>
        </header>
        <div className="detail-scroll">
          <section className="definition-hero">
            <div>
              <span>{sense.definitionZh}</span>
              <p>{sense.definitionEn}</p>
            </div>
            {sense.visualAssetId !== undefined && (
              <img
                src={`/assets/scenes/${sense.visualAssetId}.svg`}
                alt={`${sense.lemma} 的本地原创场景`}
              />
            )}
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h2>例句与搭配</h2>
              <span>原创演示内容</span>
            </div>
            {sense.examples.map((example) => (
              <blockquote key={example.id}>
                <strong>{example.text}</strong>
                <span>{example.translation}</span>
              </blockquote>
            ))}
            <div className="chip-list">
              {sense.collocations.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
          <section className="detail-two-columns">
            <article className="detail-section">
              <div className="section-heading">
                <h2>词义关系</h2>
              </div>
              <dl>
                <div>
                  <dt>近义差异</dt>
                  <dd>
                    {sense.synonyms.length > 0
                      ? sense.synonyms.join(' / ')
                      : '演示词包未提供近义替换；避免凭空推断。'}
                  </dd>
                </div>
                <div>
                  <dt>反义词</dt>
                  <dd>
                    {sense.antonyms.length > 0
                      ? sense.antonyms.join(' / ')
                      : '暂无经过核验的反义词。'}
                  </dd>
                </div>
                <div>
                  <dt>易混词</dt>
                  <dd>
                    {sense.confusables.length > 0
                      ? sense.confusables.join(' / ')
                      : '暂无内置易混词。'}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="detail-section">
              <div className="section-heading">
                <h2>词根与词族</h2>
              </div>
              <ul>
                {sense.morphology.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>核心事实来自词包；助记不会覆盖正式释义。</li>
              </ul>
            </article>
          </section>
          <section className="detail-section mastery-directions">
            <div className="section-heading">
              <div>
                <h2>四方向掌握</h2>
                <p>某一方向失败只回退该方向。</p>
              </div>
              <span>目标保留率 {Math.round(state.preferences.targetRetention * 100)}%</span>
            </div>
            {mastery.map((item) => (
              <div className="direction-row" key={item.direction}>
                <div>
                  <strong>{directionLabel[item.direction]}</strong>
                  <small>{item.reason}</small>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${stagePercent[item.stage]}%` }} />
                </div>
                <b>{item.stage}</b>
              </div>
            ))}
          </section>
          <section className="detail-two-columns">
            <article className="detail-section cue-detail">
              <div className="section-heading">
                <h2>当前助记线索</h2>
                <span>
                  {state.rescueSenseIds.includes(sense.id) ? 'Memory Rescue' : '常规配方'}
                </span>
              </div>
              {sense.cues.length === 0 ? (
                <p>暂无专用助记，使用平静通用过渡。</p>
              ) : (
                sense.cues.map((cue) => (
                  <div className="cue-item" key={cue.id}>
                    <span>{cue.type}</span>
                    <p>{cue.text}</p>
                    <button
                      type="button"
                      onClick={() => onCueVote(sense.id, cue.type, 'effective')}
                    >
                      很有效
                    </button>
                    <button
                      type="button"
                      onClick={() => onCueVote(sense.id, cue.type, 'confusing')}
                    >
                      让我更混乱
                    </button>
                  </div>
                ))
              )}
            </article>
            <article className="detail-section">
              <div className="section-heading">
                <h2>为什么出现</h2>
              </div>
              <p>
                {state.rescueSenseIds.includes(sense.id)
                  ? '连续两次没有想起，系统改用过去更有效且尚未充分尝试的线索。'
                  : '当前方向到期，属于已选择模块，且今日注意力预算仍有余量。'}
              </p>
              <dl>
                <div>
                  <dt>下次计划</dt>
                  <dd>{nextDate.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>所属模块</dt>
                  <dd>
                    {fused?.memberships.map((item) => item.stage).join(' · ') ?? '自定义'}
                  </dd>
                </div>
              </dl>
            </article>
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h2>个人易混记录</h2>
              <span>{confusionEdges.length} 条边</span>
            </div>
            {confusionEdges.length === 0 ? (
              <p>尚无针对该义项的实际错答边。</p>
            ) : (
              confusionEdges.map((edge) => (
                <p key={`${edge.sourceSenseId}-${edge.targetSenseId}`}>
                  权重 {edge.weight.toFixed(1)} · {edge.count} 次 ·{' '}
                  {new Date(edge.lastSeenAt).toLocaleString()}
                </p>
              ))
            )}
          </section>
          <section className="detail-section">
            <div className="section-heading">
              <h2>复习历史</h2>
              <span>全部时间以 UTC 存储</span>
            </div>
            {history.length === 0 ? (
              <p>还没有复习记录。</p>
            ) : (
              <ol className="history-list">
                {history.map((event) => (
                  <li key={event.id}>
                    <time>{new Date(event.reviewedAtUtc).toLocaleString()}</time>
                    <strong>{event.feedback}</strong>
                    <span>
                      {event.direction} → {event.stageAfter}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="detail-section edit-section">
            <div className="section-heading">
              <h2>个人笔记与管理</h2>
            </div>
            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onSaveNote(sense.id, note);
                  setEditing(false);
                }}
              >
                <label>
                  个人笔记
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    placeholder="仅保存在本机；不会改写词包事实"
                  />
                </label>
                <button type="submit" className="primary-button">
                  保存笔记
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditing(false)}
                >
                  取消
                </button>
              </form>
            ) : (
              <>
                <p>{state.notesBySense[sense.id] || '尚未添加个人笔记。'}</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(true)}
                >
                  编辑个人笔记
                </button>
              </>
            )}
            {deleteStep === 0 ? (
              <button
                type="button"
                className="delete-sense"
                onClick={() => setDeleteStep(1)}
              >
                删除这个学习义项…
              </button>
            ) : (
              <div className="confirm-delete">
                <span>只删除个人学习对象，不修改捆绑词包；需要二次确认。</span>
                <button type="button" onClick={() => setDeleteStep(0)}>
                  取消
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDelete(sense.id)}
                >
                  确认删除
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
