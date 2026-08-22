import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { VocabularyPack } from '@vocabsprite/domain';
import { runPackCli } from '../src/cli';
import {
  contentChecksum,
  diffPacks,
  loadPack,
  packManifestSchema,
  parseCsvSenses,
  previewImport,
  resolveInside,
} from '../src';

const csv = `lemma,partOfSpeech,senseKey,definitionZh,definitionEn,example,translation
adapt,verb,change-to-fit,调整以适应,to change for a new situation,We adapt the plan.,我们调整计划。
"effect",noun,result,结果,a result of an action,"The change had a clear effect.",这一改变产生了明显效果。
`;

describe('safe pack pipeline', () => {
  it('accepts pnpm standard separator arguments', async () => {
    await expect(runPackCli(['validate', '--', 'packs/catalog.json'])).resolves.toBe(0);
  });

  it('parses CSV and round-trips a validated JSON pack', async () => {
    const senses = parseCsvSenses(csv, 'user.demo');
    expect(senses).toHaveLength(2);
    const preview = previewImport(
      {
        schemaVersion: 1,
        id: 'user.demo',
        title: 'User demo',
        stage: 'custom',
        version: '0.1.0',
        language: 'en',
        uiLocale: 'zh-CN',
        coverage: 'partial',
        officialStatus: 'user-created',
        sourceName: 'Test fixture',
        sourceUrl: null,
        license: 'CC0-1.0',
        attribution: null,
      },
      senses,
      [],
    );
    const directory = await mkdtemp(join(tmpdir(), 'vocabsprite-pack-'));
    const manifestPath = join(directory, 'manifest.json');
    const entriesPath = join(directory, 'entries.json');
    await writeFile(manifestPath, JSON.stringify(preview.pack.manifest));
    await writeFile(
      entriesPath,
      JSON.stringify({ senses: preview.pack.senses, aliases: {} }),
    );
    const loaded = await loadPack(manifestPath, entriesPath);
    expect(loaded.senses.map((sense) => sense.lemma)).toEqual(['adapt', 'effect']);
  });

  it('rejects path traversal and absolute paths', () => {
    expect(() => resolveInside('C:\\packs', '..\\secret.json')).toThrow('escapes');
    expect(() => resolveInside('C:\\packs', 'C:\\secret.json')).toThrow('Absolute');
  });

  it('rejects missing provenance and checksum mismatches', async () => {
    const senses = parseCsvSenses(csv, 'user.demo');
    const directory = await mkdtemp(join(tmpdir(), 'vocabsprite-invalid-'));
    const manifestPath = join(directory, 'manifest.json');
    const entriesPath = join(directory, 'entries.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        id: 'user.demo',
        title: 'User demo',
        stage: 'custom',
        version: '0.1.0',
        language: 'en',
        uiLocale: 'zh-CN',
        coverage: 'partial',
        officialStatus: 'user-created',
        sourceName: 'Test fixture',
        sourceUrl: null,
        license: 'CC0-1.0',
        attribution: null,
        checksum: `sha256:${'0'.repeat(64)}`,
      }),
    );
    await writeFile(entriesPath, JSON.stringify({ senses, aliases: {} }));
    await expect(loadPack(manifestPath, entriesPath)).rejects.toThrow('Checksum mismatch');
  });

  it('rejects a manifest without an explicit license', () => {
    expect(
      packManifestSchema.safeParse({
        schemaVersion: 1,
        id: 'user.no-license',
        title: 'No license',
        stage: 'custom',
        version: '0.1.0',
        language: 'en',
        uiLocale: 'zh-CN',
        coverage: 'partial',
        officialStatus: 'user-created',
        sourceName: 'Test fixture',
        sourceUrl: null,
        attribution: null,
        checksum: `sha256:${'0'.repeat(64)}`,
      }).success,
    ).toBe(false);
  });

  it('reports duplicates in dry-run previews', () => {
    const [first] = parseCsvSenses(csv, 'user.demo');
    expect(first).toBeDefined();
    const preview = previewImport(
      {
        schemaVersion: 1,
        id: 'user.demo',
        title: 'User demo',
        stage: 'custom',
        version: '0.1.0',
        language: 'en',
        uiLocale: 'zh-CN',
        coverage: 'partial',
        officialStatus: 'user-created',
        sourceName: 'Test fixture',
        sourceUrl: null,
        license: 'CC0-1.0',
        attribution: null,
      },
      [first!, first!],
      [],
    );
    expect(preview.duplicates).toEqual([first?.identityKey]);
    expect(preview.pack.senses).toHaveLength(1);
  });

  it('diffs pack upgrades without losing alias declarations', () => {
    const senses = parseCsvSenses(csv, 'user.demo');
    const manifest = {
      schemaVersion: 1 as const,
      id: 'user.demo',
      title: 'User demo',
      stage: 'custom' as const,
      version: '0.1.0',
      language: 'en' as const,
      uiLocale: 'zh-CN' as const,
      coverage: 'partial' as const,
      officialStatus: 'user-created' as const,
      sourceName: 'Test fixture',
      sourceUrl: null,
      license: 'CC0-1.0',
      attribution: null,
      checksum: contentChecksum(senses),
    };
    const before: VocabularyPack = { manifest, senses: [senses[0]!], aliases: {} };
    const after: VocabularyPack = {
      manifest: { ...manifest, version: '0.2.0' },
      senses,
      aliases: { 'sense.legacy': senses[0]!.id },
    };
    expect(diffPacks(before, after)).toMatchObject({
      added: [senses[1]!.id],
      removed: [],
      aliased: { 'sense.legacy': senses[0]!.id },
    });
  });
});

void createHash;
