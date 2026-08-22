import { useMemo, useState } from 'react';
import type { ConfusionEdge, WordSense } from '@vocabsprite/domain';
import { confusionPairLemmas } from '../data/demo';

interface ConfusionsPageProps {
  readonly senses: readonly WordSense[];
  readonly edges: readonly ConfusionEdge[];
}

export function ConfusionsPage({ senses, edges }: ConfusionsPageProps) {
  const [selectedPair, setSelectedPair] = useState(0);
  const pair = confusionPairLemmas[selectedPair] ??
    confusionPairLemmas[0] ?? ['adapt', 'adopt'];
  const pairSenses = pair
    .map((lemma) => senses.find((sense) => sense.lemma === lemma))
    .filter((sense): sense is WordSense => sense !== undefined);
  const idByLemma = useMemo(
    () => new Map(senses.map((sense) => [sense.lemma, sense.id])),
    [senses],
  );
  const realWeight = edges
    .filter((edge) => pair.some((lemma) => idByLemma.get(lemma) === edge.sourceSenseId))
    .reduce((sum, edge) => sum + edge.weight, 0);
  return (
    <div className="page confusions-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Personal Confusion Graph</p>
          <h1>个人易混词图谱</h1>
          <p>图中的实线来自你的实际错答；演示虚线表示词包提供的拼写、语义或形态关系。</p>
        </div>
        <div className="graph-legend">
          <span>
            <i className="actual" />
            实际错答
          </span>
          <span>
            <i className="suggested" />
            内容关系
          </span>
        </div>
      </header>
      <section className="graph-layout">
        <article className="panel graph-canvas">
          <svg viewBox="0 0 760 430" role="img" aria-label="个人易混词关系图">
            <defs>
              <filter id="shadow">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodOpacity=".12" />
              </filter>
            </defs>
            {confusionPairLemmas.map((words, pairIndex) => {
              const angle =
                (pairIndex / confusionPairLemmas.length) * Math.PI * 2 - Math.PI / 2;
              const groupX = 380 + Math.cos(angle) * 235;
              const groupY = 215 + Math.sin(angle) * 140;
              return (
                <g
                  key={words.join('-')}
                  onClick={() => setSelectedPair(pairIndex)}
                  className={
                    selectedPair === pairIndex ? 'graph-group active' : 'graph-group'
                  }
                  role="button"
                  tabIndex={0}
                >
                  {words.map((word, wordIndex) => {
                    const offset = (wordIndex - (words.length - 1) / 2) * 86;
                    return (
                      <g key={word} transform={`translate(${groupX + offset},${groupY})`}>
                        <circle
                          r={selectedPair === pairIndex ? 42 : 34}
                          filter="url(#shadow)"
                        />
                        <text textAnchor="middle" dominantBaseline="central">
                          {word}
                        </text>
                      </g>
                    );
                  })}
                  {words.slice(1).map((word, wordIndex) => (
                    <line
                      key={word}
                      x1={groupX + (wordIndex - (words.length - 1) / 2) * 86}
                      y1={groupY}
                      x2={groupX + (wordIndex + 1 - (words.length - 1) / 2) * 86}
                      y2={groupY}
                      className={realWeight > 0 ? 'actual-edge' : 'suggested-edge'}
                    />
                  ))}
                </g>
              );
            })}
          </svg>
          <div className="graph-hint">点击词对查看差异、搭配和本机错误历史</div>
        </article>
        <aside className="panel pair-detail">
          <p className="eyebrow">当前词组</p>
          <h2>{pair.join(' / ')}</h2>
          <div className="pair-words">
            {pairSenses.map((sense) => (
              <article key={sense.id}>
                <header>
                  <strong>{sense.lemma}</strong>
                  <span>{sense.partOfSpeech}</span>
                </header>
                <p>{sense.definitionZh}</p>
                <small>{sense.definitionEn}</small>
                <blockquote>{sense.examples[0]?.text}</blockquote>
                <b>{sense.collocations[0]}</b>
              </article>
            ))}
          </div>
          <div className="difference-note">
            <strong>辨析抓手</strong>
            <p>先看词性与句法位置，再核对动作对象。不要只依赖相似拼写。</p>
          </div>
          <div className="error-history">
            <header>
              <strong>你的错误历史</strong>
              <span>
                {
                  edges.filter((edge) =>
                    pairSenses.some((sense) => sense.id === edge.sourceSenseId),
                  ).length
                }{' '}
                条边
              </span>
            </header>
            {edges.filter((edge) =>
              pairSenses.some((sense) => sense.id === edge.sourceSenseId),
            ).length === 0 ? (
              <p>尚无实际错答记录；这里展示的是可练习的内置演示对。</p>
            ) : (
              edges
                .filter((edge) =>
                  pairSenses.some((sense) => sense.id === edge.sourceSenseId),
                )
                .map((edge) => (
                  <p key={`${edge.sourceSenseId}-${edge.targetSenseId}`}>
                    权重 {edge.weight.toFixed(1)} · {edge.count} 次 · 最近{' '}
                    {new Date(edge.lastSeenAt).toLocaleString()}
                  </p>
                ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
