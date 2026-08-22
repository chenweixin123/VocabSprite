import type { VocabularyPack } from '@vocabsprite/domain';

export interface PackDiff {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
  readonly aliased: Readonly<Record<string, string>>;
}

export function diffPacks(before: VocabularyPack, after: VocabularyPack): PackDiff {
  if (before.manifest.id !== after.manifest.id)
    throw new Error('Pack ids must match for diff.');
  const oldById = new Map(before.senses.map((sense) => [sense.id, sense]));
  const newById = new Map(after.senses.map((sense) => [sense.id, sense]));
  return {
    added: [...newById.keys()].filter((id) => !oldById.has(id)).sort(),
    removed: [...oldById.keys()].filter((id) => !newById.has(id)).sort(),
    changed: [...newById.keys()]
      .filter(
        (id) =>
          oldById.has(id) &&
          JSON.stringify(oldById.get(id)) !== JSON.stringify(newById.get(id)),
      )
      .sort(),
    aliased: after.aliases,
  };
}
