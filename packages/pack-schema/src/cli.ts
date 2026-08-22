#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { diffPacks } from './diff';
import { previewImport, parseCsvSenses } from './importer';
import { canonicalJson, loadCatalog, loadPack, MAX_IMPORT_BYTES } from './loader';

const usage = `VocabSprite pack tools

  validate <catalog.json>
  diff <old-manifest.json> <old-entries.json> <new-manifest.json> <new-entries.json>
  import <source.csv> <output.json> <pack-id> <title> [stage]
`;

export async function runPackCli(arguments_: readonly string[]): Promise<number> {
  const withoutLeadingSeparator = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const [command, ...rawArguments] = withoutLeadingSeparator;
  const argumentsList = rawArguments[0] === '--' ? rawArguments.slice(1) : rawArguments;
  if (command === 'validate') {
    const catalogPath = argumentsList[0];
    if (catalogPath === undefined) throw new Error(usage);
    const packs = await loadCatalog(resolve(catalogPath));
    const identities = new Set<string>();
    for (const pack of packs)
      for (const sense of pack.senses) identities.add(sense.identityKey);
    console.log(
      `Validated ${packs.length} packs, ${packs.reduce((sum, pack) => sum + pack.senses.length, 0)} entries, ${identities.size} fused identities.`,
    );
    return 0;
  }

  if (command === 'diff') {
    if (argumentsList.length !== 4) throw new Error(usage);
    const paths = argumentsList.map((path) => resolve(path));
    const before = await loadPack(paths[0] ?? '', paths[1] ?? '');
    const after = await loadPack(paths[2] ?? '', paths[3] ?? '');
    console.log(canonicalJson(diffPacks(before, after)));
    return 0;
  }

  if (command === 'import') {
    const [sourcePath, outputPath, packId, title, stage = 'custom'] = argumentsList;
    if (
      sourcePath === undefined ||
      outputPath === undefined ||
      packId === undefined ||
      title === undefined
    )
      throw new Error(usage);
    const source = await readFile(resolve(sourcePath));
    if (source.byteLength > MAX_IMPORT_BYTES)
      throw new Error('Import file exceeds the size limit.');
    const senses = parseCsvSenses(source.toString('utf8'), packId);
    const preview = previewImport(
      {
        schemaVersion: 1,
        id: packId,
        title,
        stage: stage as 'custom',
        version: '0.1.0',
        language: 'en',
        uiLocale: 'zh-CN',
        coverage: 'partial',
        officialStatus: 'user-created',
        sourceName: `User import: ${sourcePath.split(/[\\/]/).at(-1) ?? 'CSV'}`,
        sourceUrl: null,
        license: 'User-provided; redistribution rights not asserted',
        attribution: null,
      },
      senses,
      [],
    );
    await writeFile(resolve(outputPath), canonicalJson(preview.pack), { flag: 'wx' });
    console.log(
      `Dry-run preview accepted ${preview.pack.senses.length} entries with ${preview.duplicates.length} duplicates and ${preview.conflicts.length} conflicts; wrote ${outputPath}.`,
    );
    return preview.conflicts.length === 0 ? 0 : 2;
  }

  throw new Error(usage);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runPackCli(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
