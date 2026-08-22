# VocabSprite implementation plan

Status: active. Updated: 2026-08-18.

## Delivery rules

- Preserve the invariants in `AGENTS.md`; privacy, stable sense identity, and user-data safety are release blockers.
- Keep a runnable vertical slice after every phase.
- Treat automated checks as evidence, not as a substitute for manual desktop checks.
- Record unavailable platform checks explicitly; never claim a Windows package exists until it is built.

## Architecture

VocabSprite is a pnpm workspace and Cargo workspace. Pure domain rules live in
`packages/domain`; pack parsing and command-line tools live in
`packages/pack-schema`; reusable presentation code lives in `packages/ui`.
The React application is in `apps/desktop`, and Tauri commands are a narrow
adapter over the Rust crates in `crates/`.

Content records and user learning records are separate. Stable string IDs are
derived by pack authors and survive pack upgrades. SQLite is the authoritative
desktop store; the web development build uses a local-storage adapter with the
same repository contract.

## Phases and acceptance evidence

1. **Repository and decisions** — workspace manifests, CI skeleton, license,
   ADRs, and this plan. Evidence: install, lint, typecheck, skeleton builds.
2. **Content and fusion** — schemas, safe import/diff/validation, seven demo
   packs, migration, fusion and upgrade tests. Evidence: pack CLI and tests.
3. **Learning engine** — FSRS adapter, deterministic queue, four-direction
   scaffold, confusion edges, cue effectiveness, rescue and budgets. Evidence:
   TypeScript and Rust unit tests with injected clocks/seeds.
4. **Desktop vertical slice** — onboarding, module selection, dashboard,
   compact/expanded/dot states, tray and no-focus show path. Evidence: component,
   E2E, Rust and manual smoke tests.
5. **Motion and assets** — twelve data-driven recipes, twenty original SVGs,
   reduced-motion and fallback behavior. Evidence: recipe/component tests and
   asset metadata validation.
6. **Data portability and hardening** — CSV/JSON preview and atomic import,
   backup/export/delete, accessibility, CSP/capabilities, performance fixture.
7. **Release audit** — execute `CODEX_REVIEW_PROMPT.md`, repair P0/P1 issues,
   rerun every documented command, and publish an evidence-based audit report.

## Main risks

- A native Windows package requires Rust MSVC and Windows build tools. The web
  slice remains independently testable, but native release readiness is blocked
  until `pnpm tauri:build` succeeds.
- Demo content is original and intentionally small; module entry points do not
  imply official examination-board coverage.
- Web Speech voices and full-screen detection vary by OS. Both features fail
  closed without polling or network access.
