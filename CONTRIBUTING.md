# Contributing

VocabSprite accepts focused changes that preserve the invariants in `AGENTS.md`.
In particular: close means snooze; no focus stealing; no clipboard read before an
explicit shortcut; no network without opt-in; stable sense IDs and progress must
survive pack upgrades; and AI must not become a core dependency.

## Development

1. Install Node 22+, pnpm 10.19.0, Rust stable, and platform prerequisites.
2. Run `pnpm install --frozen-lockfile`.
3. Make the smallest coherent change and add tests at the relevant boundary.
4. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
   `pnpm test:rust`, `pnpm pack:validate`, and `pnpm assets:validate`.
5. For UI changes, run `pnpm test:e2e` and update reproducible screenshots only
   when the intended appearance changes.

Do not weaken assertions to make CI green. Document an unavailable platform check
and supply bounded alternative evidence rather than claiming it passed.

## Content contributions

Every sense needs a stable semantic identity, original/naturally written examples,
source, license, coverage, and official-status metadata. Do not copy proprietary
dictionaries or imply that a demo pack is an official exam list. New images require
asset ID, author, license, purpose, and a local safe SVG.

## Architecture decisions

Changes to storage authority, identity/fusion, scheduling, desktop security, or the
core stack require an ADR in `docs/decisions/`. Keep domain rules out of React and
Tauri presentation adapters.
