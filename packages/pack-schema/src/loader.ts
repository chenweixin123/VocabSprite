import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { VocabularyPack } from '@vocabsprite/domain';
import {
  catalogSchema,
  packManifestSchema,
  vocabularyPackSchema,
  wordSenseSchema,
} from './schema';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const canonicalJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

export const contentChecksum = (senses: unknown): string =>
  `sha256:${createHash('sha256').update(canonicalJson(senses), 'utf8').digest('hex')}`;

export function resolveInside(root: string, untrustedPath: string): string {
  if (isAbsolute(untrustedPath))
    throw new Error(`Absolute paths are not allowed: ${untrustedPath}`);
  const target = resolve(root, untrustedPath);
  const relation = relative(resolve(root), target);
  if (relation === '..' || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new Error(`Path escapes pack root: ${untrustedPath}`);
  }
  return target;
}

async function readBounded(path: string): Promise<string> {
  const data = await readFile(path);
  if (data.byteLength > MAX_IMPORT_BYTES) {
    throw new Error(`File exceeds ${MAX_IMPORT_BYTES} byte import limit: ${path}`);
  }
  return data.toString('utf8');
}

export async function loadPack(
  manifestPath: string,
  entriesPath: string,
): Promise<VocabularyPack> {
  const manifest = packManifestSchema.parse(JSON.parse(await readBounded(manifestPath)));
  const rawEntries: unknown = JSON.parse(await readBounded(entriesPath));
  const entryDocument = Array.isArray(rawEntries)
    ? { senses: rawEntries, aliases: {} }
    : (rawEntries as { senses?: unknown; aliases?: unknown });
  const senses = wordSenseSchema.array().parse(entryDocument.senses);
  const aliases = vocabularyPackSchema.shape.aliases.parse(entryDocument.aliases ?? {});
  const actualChecksum = contentChecksum(senses);
  if (manifest.checksum !== actualChecksum) {
    throw new Error(
      `Checksum mismatch for ${manifest.id}: expected ${manifest.checksum}, got ${actualChecksum}.`,
    );
  }
  return vocabularyPackSchema.parse({ manifest, senses, aliases });
}

export async function loadCatalog(catalogPath: string): Promise<readonly VocabularyPack[]> {
  const catalogRoot = dirname(resolve(catalogPath));
  const catalog = catalogSchema.parse(JSON.parse(await readBounded(catalogPath)));
  return Promise.all(
    catalog.packs.map(({ manifest, entries }) =>
      loadPack(resolveInside(catalogRoot, manifest), resolveInside(catalogRoot, entries)),
    ),
  );
}
