import type { FusedSense, Stage, VocabularyPack } from '@vocabsprite/domain';

const stageMeta: Readonly<
  Record<Stage, { readonly title: string; readonly icon: string; readonly focus: string }>
> = {
  primary: { title: '小学基础', icon: '●', focus: '图片、发音与核心义' },
  junior: { title: '初中核心', icon: '◆', focus: '拼写、搭配与情境' },
  senior: { title: '高中核心', icon: '▲', focus: '多义词与词性转换' },
  cet4: { title: 'CET-4', icon: '4', focus: '常用学术与生活语境' },
  cet6: { title: 'CET-6', icon: '6', focus: '抽象义与近义辨析' },
  postgraduate: { title: '考研英语', icon: '研', focus: '熟词生义与词族' },
  custom: { title: '自定义词包', icon: '+', focus: '合法拥有的 CSV / JSON' },
};

interface ModulesPageProps {
  readonly packs: readonly VocabularyPack[];
  readonly fused: readonly FusedSense[];
  readonly selected: readonly Stage[];
  readonly reviewedSenseIds: ReadonlySet<string>;
  readonly onToggle: (stage: Stage) => void;
  readonly onSettings: () => void;
}

export function ModulesPage({
  packs,
  fused,
  selected,
  reviewedSenseIds,
  onToggle,
  onSettings,
}: ModulesPageProps) {
  return (
    <div className="page modules-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Curriculum Fusion</p>
          <h1>学习模块</h1>
          <p>选择多个模块时，相同词义只生成一个学习对象；已有进度会跨模块继承。</p>
        </div>
        <button type="button" className="secondary-button" onClick={onSettings}>
          导入自定义词包
        </button>
      </header>
      <div className="fusion-summary">
        <div>
          <span className="fusion-orb">◎</span>
          <div>
            <strong>{selected.length} 个模块已启用</strong>
            <p>
              {
                fused.filter((item) =>
                  item.memberships.some((membership) =>
                    selected.includes(membership.stage),
                  ),
                ).length
              }{' '}
              个融合后义项 · {packs.reduce((sum, pack) => sum + pack.senses.length, 0)}{' '}
              个原始模块条目
            </p>
          </div>
        </div>
        <p>
          <span>桥接模式已开启</span> 优先补齐高阶模块依赖但尚未掌握的基础义项。
        </p>
      </div>
      <section className="module-card-grid">
        {packs.map((pack) => {
          const meta = stageMeta[pack.manifest.stage];
          const isSelected = selected.includes(pack.manifest.stage);
          const relevant = fused.filter((item) =>
            item.memberships.some((membership) => membership.packId === pack.manifest.id),
          );
          const learned = relevant.filter((item) =>
            reviewedSenseIds.has(item.sense.id),
          ).length;
          const percent =
            relevant.length === 0 ? 0 : Math.round((learned / relevant.length) * 100);
          const overlaps = relevant.filter((item) => item.memberships.length > 1).length;
          return (
            <article
              className={isSelected ? 'module-card selected' : 'module-card'}
              key={pack.manifest.id}
            >
              <header>
                <span className={`module-symbol stage-${pack.manifest.stage}`}>
                  {meta.icon}
                </span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(pack.manifest.stage)}
                    aria-label={`${isSelected ? '停用' : '启用'}${meta.title}`}
                  />
                  <span />
                </label>
              </header>
              <h2>{meta.title}</h2>
              <p>{meta.focus}</p>
              <div className="module-meta">
                <span>{pack.senses.length} 个原创演示条目</span>
                <span>{overlaps} 个跨模块重叠</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${percent}%` }} />
              </div>
              <footer>
                <strong>{percent}%</strong>
                <span>
                  {learned} 已见 · {Math.max(0, relevant.length - learned)} 待学习
                </span>
              </footer>
              <details>
                <summary>来源与许可</summary>
                <p>
                  {pack.manifest.sourceName}
                  <br />
                  {pack.manifest.license} · {pack.manifest.coverage} ·{' '}
                  {pack.manifest.officialStatus}
                </p>
              </details>
            </article>
          );
        })}
      </section>
      <div className="truth-note">
        <strong>关于模块身份</strong>
        <p>
          这些入口与演示内容用于验证融合和学习闭环，不代表捆绑了任何考试机构的官方完整词表。所有捆绑内容均为
          VocabSprite 原创演示内容，标记为 community-compatible。
        </p>
      </div>
    </div>
  );
}
