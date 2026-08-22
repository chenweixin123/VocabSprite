import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const assetRoot = resolve('apps/desktop/public/assets/scenes');
const publicRoot = resolve('apps/desktop/public');
const metadata = JSON.parse(await readFile(resolve(assetRoot, 'assets.json'), 'utf8'));
if (!Array.isArray(metadata)) throw new Error('assets.json must contain an asset array.');
if (metadata.length < 20) throw new Error('At least 20 local assets are required.');
const ids = new Set();
for (const asset of metadata) {
  if (ids.has(asset.assetId)) throw new Error(`Duplicate assetId: ${asset.assetId}`);
  ids.add(asset.assetId);
  for (const field of ['assetId', 'author', 'license', 'purpose', 'file']) {
    if (typeof asset[field] !== 'string' || asset[field].trim() === '') {
      throw new Error(`${asset.assetId ?? 'asset'} is missing ${field}.`);
    }
  }
  if (!/^assets\/scenes\/scene-[0-9]{2}\.svg$/.test(asset.file)) {
    throw new Error(`Unsafe asset path: ${asset.file}`);
  }
  const file = resolve(publicRoot, asset.file);
  const information = await stat(file);
  if (information.size > 200_000) throw new Error(`${asset.file} exceeds 200 KB.`);
  const svg = await readFile(file, 'utf8');
  if (/<script\b|<foreignObject\b|(?:href|src)\s*=\s*["']https?:/i.test(svg)) {
    throw new Error(`${asset.file} contains executable or remote content.`);
  }
}
console.log(`Validated ${ids.size} original local SVG assets with provenance.`);
