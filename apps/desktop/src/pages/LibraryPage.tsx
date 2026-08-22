import { useMemo, useState } from 'react';
import type { FusedSense, WordSense } from '@vocabsprite/domain';

interface LibraryPageProps {
  readonly fused: readonly FusedSense[];
  readonly deletedIds: readonly string[];
  readonly onOpen: (sense: WordSense) => void;
}

export function LibraryPage({ fused, deletedIds, onOpen }: LibraryPageProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () =>
      fused
        .filter(
          (item) =>
            !deletedIds.includes(item.sense.id) &&
            `${item.sense.lemma} ${item.sense.definitionZh} ${item.sense.definitionEn}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
        )
        .slice(0, 80),
    [fused, deletedIds, query],
  );
  return (
    <div className="page library-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sense-level library</p>
          <h1>词库</h1>
          <p>同一拼写的不同义项分开显示；稳定 ID 不依赖数据库自增值。</p>
        </div>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">搜索词库</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索英文、中文或释义"
          />
        </label>
      </header>
      <div className="library-table" role="table">
        <div className="library-row table-head" role="row">
          <span>单词 / 义项</span>
          <span>核心义</span>
          <span>模块归属</span>
          <span>动作</span>
        </div>
        {visible.map((item) => (
          <button
            className="library-row"
            role="row"
            type="button"
            key={item.sense.id}
            onClick={() => onOpen(item.sense)}
          >
            <span>
              <strong>{item.sense.lemma}</strong>
              <small>
                {item.sense.partOfSpeech} · {item.sense.senseKey}
              </small>
            </span>
            <span>
              {item.sense.definitionZh}
              <small>{item.sense.definitionEn}</small>
            </span>
            <span className="membership-list">
              {item.memberships.map((membership) => (
                <i key={membership.packId}>{membership.stage}</i>
              ))}
            </span>
            <span>查看 →</span>
          </button>
        ))}
      </div>
      <p className="table-foot">
        显示 {visible.length} / {fused.length - deletedIds.length}{' '}
        个融合义项。大型词库采用分页查询；演示构建仅加载本地小型内容。
      </p>
    </div>
  );
}
