import { describe, expect, it } from 'vitest';
import { demoPacks } from '../src/data/demo';
import {
  MAX_BROWSER_IMPORT_BYTES,
  previewBrowserCsv,
  previewBrowserJsonPack,
} from '../src/import/browserImport';

const csv = `lemma,partOfSpeech,senseKey,definitionZh,definitionEn,example,translation
harbor,noun,sheltered-water,港湾,a sheltered area of water,The boat rested in the harbor.,小船停在港湾里。
`;

describe('browser import dry run', () => {
  it('previews CSV without mutating application state', () => {
    const preview = previewBrowserCsv(csv, 'test-source');
    expect(preview.senses).toHaveLength(1);
    expect(preview.senses[0]?.identityKey).toBe('harbor|noun|sheltered-water');
  });

  it('validates a checksummed VocabSprite JSON pack', async () => {
    const pack = demoPacks[0];
    if (pack === undefined) throw new Error('demo fixture missing');
    const preview = await previewBrowserJsonPack(JSON.stringify(pack));
    expect(preview.senses).toHaveLength(15);
  });

  it('rejects executable HTML before preview', () => {
    const malicious = csv.replace('港湾', '<script>alert(1)</script>');
    expect(() => previewBrowserCsv(malicious, 'test-source')).toThrow('不允许');
  });

  it('rejects an oversized browser import before parsing', () => {
    expect(() =>
      previewBrowserCsv('x'.repeat(MAX_BROWSER_IMPORT_BYTES + 1), 'test-source'),
    ).toThrow('5 MiB');
  });
});
