import type { PackConflict, VocabularyPack, WordSense } from '@vocabsprite/domain';
import { createIdentityKey, fusePacks, stableId } from '@vocabsprite/domain';
import { packManifestSchema, wordSenseSchema } from './schema';
import { contentChecksum } from './loader';

export interface ImportPreview {
  readonly pack: VocabularyPack;
  readonly duplicates: readonly string[];
  readonly conflicts: readonly PackConflict[];
}

function parseCsvRows(input: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? '';
    const next = input[index + 1];
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
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  row.push(field);
  if (row.some((item) => item.trim() !== '')) rows.push(row);
  return rows;
}

const requiredColumns = [
  'lemma',
  'partOfSpeech',
  'senseKey',
  'definitionZh',
  'definitionEn',
  'example',
  'translation',
] as const;

export function parseCsvSenses(csv: string, packId: string): readonly WordSense[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ''));
  const header = rows[0]?.map((cell) => cell.trim());
  if (header === undefined) throw new Error('CSV is empty.');
  for (const column of requiredColumns) {
    if (!header.includes(column))
      throw new Error(`CSV is missing required column: ${column}`);
  }
  const indexOf = (column: string): number => header.indexOf(column);
  return rows.slice(1).map((row, rowIndex) => {
    const cell = (column: string): string => row[indexOf(column)]?.trim() ?? '';
    const lemma = cell('lemma');
    const partOfSpeech = cell('partOfSpeech');
    const senseKey = cell('senseKey');
    const identityKey = createIdentityKey(
      lemma,
      wordSenseSchema.shape.partOfSpeech.parse(partOfSpeech),
      senseKey,
    );
    const id = stableId('sense', identityKey);
    return wordSenseSchema.parse({
      id,
      identityKey,
      lexemeId: stableId('lexeme', lemma.toLocaleLowerCase('en-US')),
      lemma,
      partOfSpeech,
      senseKey,
      definitionZh: cell('definitionZh'),
      definitionEn: cell('definitionEn'),
      examples: [
        {
          id: stableId('example', `${packId}:${rowIndex}:${identityKey}`),
          text: cell('example'),
          translation: cell('translation'),
          source: 'user',
        },
      ],
      collocations: [],
      synonyms: [],
      antonyms: [],
      confusables: [],
      morphology: [],
      cues: [],
      motion: { kind: 'calm', intensity: 'low', durationMs: 400, iterationCount: 1 },
    });
  });
}

export function previewImport(
  draftManifest: Omit<VocabularyPack['manifest'], 'checksum'>,
  senses: readonly WordSense[],
  existing: readonly VocabularyPack[],
): ImportPreview {
  const duplicates = senses
    .filter(
      (sense, index) =>
        senses.findIndex((other) => other.identityKey === sense.identityKey) < index,
    )
    .map((sense) => sense.identityKey);
  const uniqueSenses = senses.filter(
    (sense, index) =>
      senses.findIndex((other) => other.identityKey === sense.identityKey) === index,
  );
  const manifest = packManifestSchema.parse({
    ...draftManifest,
    checksum: contentChecksum(uniqueSenses),
  });
  const pack: VocabularyPack = { manifest, senses: uniqueSenses, aliases: {} };
  const conflicts = fusePacks([...existing, pack]).conflicts.filter((conflict) =>
    conflict.packIds.includes(pack.manifest.id),
  );
  return { pack, duplicates, conflicts };
}
