# VocabSprite pack format

## Catalog layout

Bundled/CLI packs use three bounded JSON documents:

```text
packs/catalog.json
packs/<pack-id>/manifest.json
packs/<pack-id>/entries.json
```

Catalog paths must be relative and remain inside the catalog root. Absolute paths
and `..` traversal are rejected before reads. Each file is limited to 5 MiB. Archive
extraction is deliberately absent in v0.1, eliminating zip-bomb extraction; a future
archive importer must add entry-count, expanded-byte, ratio, and path checks first.

## Manifest

Required fields are `schemaVersion`, stable `id`, `title`, one of seven `stage`
values, semantic `version`, `language: en`, `uiLocale: zh-CN`, `coverage`,
`officialStatus`, `sourceName`, nullable `sourceUrl`, non-empty `license`, nullable
`attribution`, and `checksum`.

`checksum` is SHA-256 over canonical senses JSON:

```text
JSON.stringify(senses, null, 2) + "\n"
```

The entries document is `{ "senses": [...], "aliases": {...} }`. For checksum
purposes only the `senses` array is hashed.

## Stable sense identity

Every entry requires:

- stable `id` and `lexemeId` (not database integers);
- `identityKey = normalized lemma | partOfSpeech | normalized senseKey`;
- Chinese and English definitions;
- 1–10 original/user-labelled examples;
- bounded collocations, relations, morphology, cues;
- one bounded motion recipe and optional local visual asset ID.

Authors must keep an identity stable across wording corrections. If a semantic
identity really changes, create a new sense and, where safe, place the explicit old
ID → new ID mapping in `aliases`. The diff CLI reports additions, removals, updates,
alias changes, and conflicts before installation.

## User CSV

UTF-8 CSV uses a header row. The UI maps these logical columns:

```csv
lemma,partOfSpeech,senseKey,definitionZh,definitionEn,example,translation
harbor,noun,sheltered-water,港湾,a sheltered area of water,The boat rested in the harbor.,小船停在港湾里。
```

Preview is a dry run: it validates fields, derives stable local IDs, reports file
duplicates and existing-identity overlap, and makes no state change. Confirmation
commits the complete preview as one state update. Source and license/use-right notes
are mandatory.

## Browser JSON Pack

The UI accepts one JSON object containing `schemaVersion: 1` and `senses`, or a full
`{ manifest, senses, aliases }` pack. Full packs require source, license, and checksum.
Executable/embedded HTML, unsupported types, inconsistent identity keys, oversized
arrays, and checksum mismatch are rejected. Exported custom-pack JSON can be
re-imported after validation.

Binary Anki `.apkg` is outside v0.1. Delimited Anki text can be normalized to CSV;
no HTML is executed.
