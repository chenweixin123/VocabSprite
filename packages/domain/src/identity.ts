import type { PartOfSpeech } from './types';

const normalize = (value: string): string =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replaceAll(/\s+/g, ' ');

export function createIdentityKey(
  lemma: string,
  partOfSpeech: PartOfSpeech,
  senseKey: string,
): string {
  return `${normalize(lemma)}|${partOfSpeech}|${normalize(senseKey)}`;
}

export function stableId(namespace: string, identityKey: string): string {
  const input = `${namespace}:${identityKey}`;
  let high = 0x811c9dc5;
  let low = 0x01000193;
  for (const character of input) {
    const code = character.codePointAt(0) ?? 0;
    high = Math.imul(high ^ code, 0x01000193) >>> 0;
    low = Math.imul(low ^ (code >>> 8), 0x85ebca6b) >>> 0;
  }
  return `${namespace}.${high.toString(16).padStart(8, '0')}${low
    .toString(16)
    .padStart(8, '0')}`;
}
