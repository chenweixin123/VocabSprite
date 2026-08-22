import { createIdentityKey, stableId } from '@vocabsprite/domain';
import type {
  CueType,
  MnemonicCue,
  MotionKind,
  PartOfSpeech,
  WordSense,
} from '@vocabsprite/domain';

export const MAX_BROWSER_IMPORT_BYTES = 5 * 1024 * 1024;
const parts: readonly PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'pronoun',
  'interjection',
];
export const browserImportFields = [
  'lemma',
  'partOfSpeech',
  'senseKey',
  'definitionZh',
  'definitionEn',
  'example',
  'translation',
] as const;
export type BrowserImportField = (typeof browserImportFields)[number];

function safeText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error(`${field} 不能为空。`);
  if (trimmed.length > 2_000) throw new Error(`${field} 超过长度限制。`);
  if (/<\/?(?:script|iframe|object|embed)\b|javascript\s*:/i.test(trimmed)) {
    throw new Error(`${field} 含有不允许的可执行或嵌入内容。`);
  }
  return trimmed;
}

const stableIdPattern = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
const motionKinds: readonly MotionKind[] = [
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
];
const cueTypes: readonly CueType[] = ['visual', 'sound', 'morphology', 'contrast'];

function recordOf(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${field} 必须是对象。`);
  return value as Record<string, unknown>;
}

function stringOf(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`${field} 必须是字符串。`);
  return safeText(value, field);
}

function idOf(value: unknown, field: string): string {
  const id = stringOf(value, field);
  if (!stableIdPattern.test(id)) throw new Error(`${field} 不是稳定 ID。`);
  return id;
}

function stringArrayOf(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error(`${field} 必须是至多 20 项的数组。`);
  return value.map((item, index) => stringOf(item, `${field}[${index}]`));
}

function senseOf(value: unknown, index: number): WordSense {
  const item = recordOf(value, `senses[${index}]`);
  const lemma = stringOf(item.lemma, `senses[${index}].lemma`);
  const partOfSpeech = stringOf(
    item.partOfSpeech,
    `senses[${index}].partOfSpeech`,
  ) as PartOfSpeech;
  if (!parts.includes(partOfSpeech))
    throw new Error(`senses[${index}].partOfSpeech 不受支持。`);
  const senseKey = idOf(item.senseKey, `senses[${index}].senseKey`);
  const identityKey = stringOf(item.identityKey, `senses[${index}].identityKey`);
  if (identityKey !== createIdentityKey(lemma, partOfSpeech, senseKey))
    throw new Error(`senses[${index}] 的 identityKey 与词形/词性/义项键不一致。`);

  if (
    !Array.isArray(item.examples) ||
    item.examples.length === 0 ||
    item.examples.length > 10
  )
    throw new Error(`senses[${index}].examples 必须有 1 到 10 项。`);
  const examples = item.examples.map((rawExample, exampleIndex) => {
    const example = recordOf(rawExample, `senses[${index}].examples[${exampleIndex}]`);
    const sourceValue = stringOf(
      example.source,
      `senses[${index}].examples[${exampleIndex}].source`,
    );
    if (sourceValue !== 'original' && sourceValue !== 'user')
      throw new Error(`senses[${index}].examples[${exampleIndex}].source 不受支持。`);
    const source = sourceValue === 'original' ? ('original' as const) : ('user' as const);
    return {
      id: idOf(example.id, `senses[${index}].examples[${exampleIndex}].id`),
      text: stringOf(example.text, `senses[${index}].examples[${exampleIndex}].text`),
      translation: stringOf(
        example.translation,
        `senses[${index}].examples[${exampleIndex}].translation`,
      ),
      source,
    };
  });

  if (!Array.isArray(item.cues) || item.cues.length > 12)
    throw new Error(`senses[${index}].cues 必须是至多 12 项的数组。`);
  const cues: readonly MnemonicCue[] = item.cues.map((rawCue, cueIndex) => {
    const cue = recordOf(rawCue, `senses[${index}].cues[${cueIndex}]`);
    const type = stringOf(cue.type, `senses[${index}].cues[${cueIndex}].type`) as CueType;
    if (!cueTypes.includes(type))
      throw new Error(`senses[${index}].cues[${cueIndex}].type 不受支持。`);
    if (typeof cue.verified !== 'boolean')
      throw new Error(`senses[${index}].cues[${cueIndex}].verified 必须是布尔值。`);
    return {
      id: idOf(cue.id, `senses[${index}].cues[${cueIndex}].id`),
      type,
      text: stringOf(cue.text, `senses[${index}].cues[${cueIndex}].text`),
      verified: cue.verified,
    };
  });

  const motion = recordOf(item.motion, `senses[${index}].motion`);
  const kind = stringOf(motion.kind, `senses[${index}].motion.kind`) as MotionKind;
  if (!motionKinds.includes(kind))
    throw new Error(`senses[${index}].motion.kind 不受支持。`);
  if (motion.intensity !== 'low' && motion.intensity !== 'standard')
    throw new Error(`senses[${index}].motion.intensity 不受支持。`);
  if (
    typeof motion.durationMs !== 'number' ||
    !Number.isInteger(motion.durationMs) ||
    motion.durationMs < 150 ||
    motion.durationMs > 3000
  )
    throw new Error(`senses[${index}].motion.durationMs 超出范围。`);
  if (motion.iterationCount !== 1 && motion.iterationCount !== 2)
    throw new Error(`senses[${index}].motion.iterationCount 不受支持。`);

  const visualAssetId =
    item.visualAssetId === undefined
      ? undefined
      : idOf(item.visualAssetId, `senses[${index}].visualAssetId`);
  return {
    id: idOf(item.id, `senses[${index}].id`),
    identityKey,
    lexemeId: idOf(item.lexemeId, `senses[${index}].lexemeId`),
    lemma,
    partOfSpeech,
    senseKey,
    definitionZh: stringOf(item.definitionZh, `senses[${index}].definitionZh`),
    definitionEn: stringOf(item.definitionEn, `senses[${index}].definitionEn`),
    examples,
    collocations: stringArrayOf(item.collocations, `senses[${index}].collocations`),
    synonyms: stringArrayOf(item.synonyms, `senses[${index}].synonyms`),
    antonyms: stringArrayOf(item.antonyms, `senses[${index}].antonyms`),
    confusables: stringArrayOf(item.confusables, `senses[${index}].confusables`),
    morphology: stringArrayOf(item.morphology, `senses[${index}].morphology`),
    cues,
    motion: {
      kind,
      intensity: motion.intensity,
      durationMs: motion.durationMs,
      iterationCount: motion.iterationCount,
    },
    ...(visualAssetId === undefined ? {} : { visualAssetId }),
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function rowsOf(csv: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index] ?? '';
    const next = csv[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((item) => item.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new Error('CSV 引号没有闭合。');
  row.push(field);
  if (row.some((item) => item.trim() !== '')) rows.push(row);
  return rows;
}

export interface BrowserImportPreview {
  readonly senses: readonly WordSense[];
  readonly duplicates: readonly string[];
  readonly summary: string;
}

export function inspectBrowserCsv(csv: string): readonly string[] {
  if (new Blob([csv]).size > MAX_BROWSER_IMPORT_BYTES)
    throw new Error('导入文件超过 5 MiB 限制。');
  return rowsOf(csv.replace(/^\uFEFF/, ''))[0]?.map((value) => value.trim()) ?? [];
}

export function previewBrowserCsv(
  csv: string,
  sourceName: string,
  mapping: Partial<Readonly<Record<BrowserImportField, string>>> = {},
): BrowserImportPreview {
  if (new Blob([csv]).size > MAX_BROWSER_IMPORT_BYTES)
    throw new Error('导入文件超过 5 MiB 限制。');
  const rows = rowsOf(csv.replace(/^\uFEFF/, ''));
  const headers = rows[0]?.map((value) => value.trim());
  if (headers === undefined) throw new Error('CSV 为空。');
  for (const field of browserImportFields) {
    const mapped = mapping[field] ?? field;
    if (!headers.includes(mapped)) throw new Error(`字段 ${field} 尚未映射到有效列。`);
  }
  const valueAt = (row: readonly string[], field: BrowserImportField): string =>
    row[headers.indexOf(mapping[field] ?? field)] ?? '';
  const raw = rows.slice(1).map((row, index) => {
    const lemma = safeText(valueAt(row, 'lemma'), 'lemma');
    const part = safeText(valueAt(row, 'partOfSpeech'), 'partOfSpeech') as PartOfSpeech;
    if (!parts.includes(part)) throw new Error(`第 ${index + 2} 行词性不受支持：${part}`);
    const senseKey = safeText(valueAt(row, 'senseKey'), 'senseKey')
      .toLocaleLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-');
    const identityKey = createIdentityKey(lemma, part, senseKey);
    return {
      id: stableId('sense', identityKey),
      identityKey,
      lexemeId: stableId('lexeme', lemma.toLocaleLowerCase()),
      lemma,
      partOfSpeech: part,
      senseKey,
      definitionZh: safeText(valueAt(row, 'definitionZh'), 'definitionZh'),
      definitionEn: safeText(valueAt(row, 'definitionEn'), 'definitionEn'),
      examples: [
        {
          id: stableId('example', `${sourceName}:${identityKey}`),
          text: safeText(valueAt(row, 'example'), 'example'),
          translation: safeText(valueAt(row, 'translation'), 'translation'),
          source: 'user' as const,
        },
      ],
      collocations: [],
      synonyms: [],
      antonyms: [],
      confusables: [],
      morphology: [],
      cues: [],
      motion: {
        kind: 'calm' as const,
        intensity: 'low' as const,
        durationMs: 400,
        iterationCount: 1 as const,
      },
    };
  });
  const duplicates = raw
    .filter(
      (sense, index) =>
        raw.findIndex((other) => other.identityKey === sense.identityKey) < index,
    )
    .map((sense) => sense.identityKey);
  const senses = raw.filter(
    (sense, index) =>
      raw.findIndex((other) => other.identityKey === sense.identityKey) === index,
  );
  return {
    senses,
    duplicates,
    summary: `${senses.length} 个有效义项，${duplicates.length} 个文件内重复项。`,
  };
}

export async function previewBrowserJsonPack(json: string): Promise<BrowserImportPreview> {
  if (new Blob([json]).size > MAX_BROWSER_IMPORT_BYTES)
    throw new Error('导入文件超过 5 MiB 限制。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON 语法无效。');
  }
  const document = recordOf(parsed, 'JSON pack');
  const manifest =
    document.manifest === undefined ? undefined : recordOf(document.manifest, 'manifest');
  const schemaVersion = manifest?.schemaVersion ?? document.schemaVersion;
  if (schemaVersion !== 1) throw new Error('仅支持 schemaVersion 1。');
  if (!Array.isArray(document.senses) || document.senses.length === 0)
    throw new Error('JSON pack 缺少 senses。');
  if (document.senses.length > 50_000) throw new Error('JSON pack 的义项数量超过限制。');
  if (manifest !== undefined) {
    stringOf(manifest.sourceName, 'manifest.sourceName');
    stringOf(manifest.license, 'manifest.license');
    const expected = stringOf(manifest.checksum, 'manifest.checksum');
    if (!/^sha256:[a-f0-9]{64}$/.test(expected))
      throw new Error('manifest.checksum 格式无效。');
    const canonical = `${JSON.stringify(document.senses, null, 2)}\n`;
    const actual = `sha256:${await sha256(canonical)}`;
    if (actual !== expected) throw new Error('JSON pack checksum 不一致。');
  }
  const raw = document.senses.map((item, index) => senseOf(item, index));
  const duplicates = raw
    .filter(
      (sense, index) =>
        raw.findIndex((other) => other.identityKey === sense.identityKey) < index,
    )
    .map((sense) => sense.identityKey);
  const senses = raw.filter(
    (sense, index) =>
      raw.findIndex((other) => other.identityKey === sense.identityKey) === index,
  );
  return {
    senses,
    duplicates,
    summary: `${senses.length} 个有效 JSON 义项，${duplicates.length} 个文件内重复项；schema 与 checksum（如提供）已验证。`,
  };
}
