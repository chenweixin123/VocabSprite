import { fusePacks } from '@vocabsprite/domain';
import type { PackManifest, VocabularyPack, WordSense } from '@vocabsprite/domain';
import primaryManifestJson from '../../../../packs/primary-demo/manifest.json';
import primaryEntriesJson from '../../../../packs/primary-demo/entries.json';
import juniorManifestJson from '../../../../packs/junior-demo/manifest.json';
import juniorEntriesJson from '../../../../packs/junior-demo/entries.json';
import seniorManifestJson from '../../../../packs/senior-demo/manifest.json';
import seniorEntriesJson from '../../../../packs/senior-demo/entries.json';
import cet4ManifestJson from '../../../../packs/cet4-demo/manifest.json';
import cet4EntriesJson from '../../../../packs/cet4-demo/entries.json';
import cet6ManifestJson from '../../../../packs/cet6-demo/manifest.json';
import cet6EntriesJson from '../../../../packs/cet6-demo/entries.json';
import postgraduateManifestJson from '../../../../packs/postgraduate-demo/manifest.json';
import postgraduateEntriesJson from '../../../../packs/postgraduate-demo/entries.json';
import customManifestJson from '../../../../packs/custom-template/manifest.json';
import customEntriesJson from '../../../../packs/custom-template/entries.json';

interface EntryDocument {
  readonly senses: readonly WordSense[];
  readonly aliases: Readonly<Record<string, string>>;
}

const asPack = (manifest: unknown, entries: unknown): VocabularyPack => ({
  manifest: manifest as PackManifest,
  senses: (entries as EntryDocument).senses,
  aliases: (entries as EntryDocument).aliases,
});

export const demoPacks: readonly VocabularyPack[] = [
  asPack(primaryManifestJson, primaryEntriesJson),
  asPack(juniorManifestJson, juniorEntriesJson),
  asPack(seniorManifestJson, seniorEntriesJson),
  asPack(cet4ManifestJson, cet4EntriesJson),
  asPack(cet6ManifestJson, cet6EntriesJson),
  asPack(postgraduateManifestJson, postgraduateEntriesJson),
  asPack(customManifestJson, customEntriesJson),
];

export const fusedDemo = fusePacks(demoPacks);

export const demoSenses = fusedDemo.senses.map((item) => item.sense);

export const confusionPairLemmas: readonly (readonly string[])[] = [
  ['adapt', 'adopt'],
  ['affect', 'effect'],
  ['assure', 'ensure', 'insure'],
  ['complement', 'compliment'],
  ['principal', 'principle'],
  ['conscious', 'conscience'],
];
