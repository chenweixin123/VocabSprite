# VocabSprite

An offline-first, Windows-focused ambient vocabulary learner. VocabSprite keeps a
small, draggable card near a desktop corner, merges overlapping curriculum packs
by **word sense**, gives meaning a restrained visual motion, builds a personal
confusion graph, and gradually removes scaffolding as recall improves.

![VocabSprite dashboard](docs/screenshots/03-dashboard.png)

> VocabSprite is a development codename. Trademark, domain, and app-store name
> searches are still required before a public product release.

## Why it is different

- **Quiet desktop presence** — a transparent Compact card that follows its selected
  size and content, with quick controls for size, color, opacity, motion, and topmost
  behavior; Expanded and Dot modes remain one click away, and close means snooze,
  never delete.
- **Curriculum Fusion** — Primary, Junior, Senior, CET-4, CET-6, Postgraduate,
  and Custom modules share progress for the same sense while preserving distinct
  senses of the same spelling.
- **Meaning in Motion** — 12 reusable, bounded motion recipes plus calm fallback,
  reduced-motion support, and 20 original local SVG scenes.
- **Personal Confusion Graph** — explicit wrong-word answers strengthen local,
  capped and decaying edges that can trigger contrast cards.
- **Scaffold Fading** — English→meaning, meaning→English, context→English, and
  audio→English progress independently through acquire, recognize, recall, and use.

AI is not required. The complete core loop works locally, without an account and
without network access.

Compact cards offer Small, Standard, and Large layouts plus four color choices. An
optional “give me a hint” mode defaults off and reveals only a first letter, length,
part of speech, or collocation cue rather than the answer itself.

Onboarding keeps conservative quick-range sliders while offering explicit custom
limits (1–1,000 new words and 1–5,000 reviews). The separate ambient-card budget
prevents a large study plan from becoming a large interruption budget.

## Status and scope

This repository is a release-candidate implementation for Windows 10/11, not an
official examination vocabulary product. The seven module entry points contain
**original demonstration packs** (15 entries each), not complete or official
lists from an examination board. macOS and Linux are source-compatible targets
but their tray, autostart, global-shortcut, and no-focus behavior have not been
manually qualified.

The browser/Vite build is a development preview backed by `localStorage`. The
Tauri desktop build uses SQLite and the Rust FSRS adapter. FSRS scheduling is
therefore exercised in the native desktop path; browser preview feedback still
demonstrates scaffold transitions but does not claim to reproduce FSRS.

## Quick start

Prerequisites:

- Node.js 22 or newer and Corepack;
- pnpm 10.19.0 (declared in `package.json`);
- for native development: Rust stable, MSVC C++ Build Tools, Windows SDK, and
  WebView2.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:1420`. For the native application:

```powershell
pnpm tauri:dev
```

The first-run flow selects multiple modules, attention limits, quiet hours,
desktop placement, motion, and an optional local placement check. No sign-in or
network permission is requested.

## Engineering commands

```text
pnpm install --frozen-lockfile  install the locked workspace
pnpm dev                        run the browser development preview
pnpm tauri:dev                  run the native Tauri application
pnpm lint                       ESLint with zero warnings
pnpm format:check               verify Prettier formatting
pnpm typecheck                  strict TypeScript checks
pnpm test                       Vitest unit/component/integration tests
pnpm test:e2e                   Playwright browser journeys
pnpm test:rust                  Cargo workspace tests
pnpm pack:validate              validate all catalog packs and checksums
pnpm assets:validate            validate local SVG safety/provenance
pnpm pack:diff -- <old-manifest> <old-entries> <new-manifest> <new-entries>
pnpm benchmark                  run the 10k-sense/100k-review fixture
pnpm build                      build all web packages
pnpm tauri:build                build Windows bundles
pnpm screenshots                reproduce documentation screenshots
```

Rust release checks:

```powershell
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## Data and privacy

- No mandatory account, telemetry endpoint, analytics SDK, OCR, screenshotting,
  or background clipboard listener exists.
- Clipboard text is read once only inside a three-second authorization window
  opened by the explicit `Ctrl+Shift+V` global shortcut. Its contents are not logged.
- Network and telemetry preferences default off. v0.1 has no network provider,
  so turning the future-provider preference on still sends nothing.
- Imports are size-bounded, previewed, schema-checked, script/HTML-rejected, and
  committed only after confirmation. Native storage operations use transactions.
- Export-all and two-step delete-all controls are in Settings. Bundled content is
  separate from personal learning data.

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), and
[the threat model](docs/threat-model.md).

## Import and export

The UI accepts mapped UTF-8 CSV and schema-version-1 VocabSprite JSON Packs with
a dry-run preview. The CLI validates split manifest/entries catalogs and reports
pack diffs. The app exports a full VocabSprite JSON backup, learning-event CSV,
and custom-pack JSON. Basic Anki-style delimited text can be normalized to the
documented CSV template; binary `.apkg` import/export is **not implemented**.

See [the pack format](docs/pack-format.md) and
[content licensing](docs/content-licensing.md).

## Architecture and learning model

- [Architecture](docs/architecture.md)
- [Learning model and claim boundaries](docs/learning-model.md)
- [Accessibility](docs/accessibility.md)
- [60-second demo](docs/demo-script.md)
- [Performance procedure and results](docs/performance.md)
- [FAQ](docs/faq.md) and [roadmap](docs/roadmap.md)

## Relationship to Anki and other general flashcard tools

Anki and similar systems are flexible general-purpose study tools. VocabSprite is
not a replacement or a claim of superiority: it focuses on a narrower workflow—
ambient desktop vocabulary practice, curriculum sense fusion, direction-specific
scaffolding, and local confusion relationships. Exportable data and documented
formats are intentional so users can choose the tool that fits them.

## Contributing and license

Code is licensed under AGPL-3.0-or-later; bundled original demonstration content
and SVG metadata declare their own CC0-1.0 terms. User imports retain the rights
specified by their owners. Read [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.
