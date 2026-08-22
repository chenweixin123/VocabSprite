import type {
  FusedSense,
  PackConflict,
  PackMembership,
  VocabularyPack,
  WordSense,
} from './types';

export interface FusionResult {
  readonly senses: readonly FusedSense[];
  readonly conflicts: readonly PackConflict[];
  readonly aliasToSenseId: Readonly<Record<string, string>>;
}

const comparableContent = (sense: WordSense): string =>
  JSON.stringify({
    lemma: sense.lemma,
    partOfSpeech: sense.partOfSpeech,
    definitionZh: sense.definitionZh,
    definitionEn: sense.definitionEn,
  });

export function fusePacks(packs: readonly VocabularyPack[]): FusionResult {
  const byIdentity = new Map<string, { sense: WordSense; memberships: PackMembership[] }>();
  const conflicts: PackConflict[] = [];
  const ids = new Map<string, string>();
  const aliases = new Map<string, string>();

  for (const pack of [...packs].sort((a, b) =>
    a.manifest.id.localeCompare(b.manifest.id),
  )) {
    for (const sense of pack.senses) {
      const knownIdentity = ids.get(sense.id);
      if (knownIdentity !== undefined && knownIdentity !== sense.identityKey) {
        conflicts.push({
          code: 'DUPLICATE_ID',
          identityKey: sense.identityKey,
          packIds: [pack.manifest.id],
          detail: `Stable id ${sense.id} is also bound to ${knownIdentity}.`,
        });
        continue;
      }
      ids.set(sense.id, sense.identityKey);

      const membership: PackMembership = {
        senseId: sense.id,
        packId: pack.manifest.id,
        stage: pack.manifest.stage,
        packVersion: pack.manifest.version,
      };
      const current = byIdentity.get(sense.identityKey);
      if (current === undefined) {
        byIdentity.set(sense.identityKey, { sense, memberships: [membership] });
      } else {
        if (comparableContent(current.sense) !== comparableContent(sense)) {
          conflicts.push({
            code: 'IDENTITY_CONTENT_MISMATCH',
            identityKey: sense.identityKey,
            packIds: [...current.memberships.map((item) => item.packId), pack.manifest.id],
            detail: 'The same semantic identity carries incompatible core content.',
          });
        }
        current.memberships.push({ ...membership, senseId: current.sense.id });
      }
    }

    for (const [oldId, newId] of Object.entries(pack.aliases)) {
      const existing = aliases.get(oldId);
      if (existing !== undefined && existing !== newId) {
        conflicts.push({
          code: 'ALIAS_COLLISION',
          identityKey: oldId,
          packIds: [pack.manifest.id],
          detail: `Alias ${oldId} maps to both ${existing} and ${newId}.`,
        });
      } else {
        aliases.set(oldId, newId);
      }
    }
  }

  return {
    senses: [...byIdentity.values()]
      .map(({ sense, memberships }) => ({
        sense,
        memberships: memberships.sort((a, b) => a.packId.localeCompare(b.packId)),
      }))
      .sort((a, b) => a.sense.id.localeCompare(b.sense.id)),
    conflicts,
    aliasToSenseId: Object.fromEntries(aliases),
  };
}

export function resolveProgressSenseId(
  storedSenseId: string,
  aliases: Readonly<Record<string, string>>,
): string {
  const visited = new Set<string>();
  let current = storedSenseId;
  let next = aliases[current];
  while (next !== undefined) {
    if (visited.has(current)) throw new Error(`Alias cycle detected at ${current}.`);
    visited.add(current);
    current = next;
    next = aliases[current];
  }
  return current;
}

export function removePackMembership(
  fused: readonly FusedSense[],
  packId: string,
): readonly FusedSense[] {
  return fused
    .map((item) => ({
      ...item,
      memberships: item.memberships.filter((membership) => membership.packId !== packId),
    }))
    .filter((item) => item.memberships.length > 0);
}
