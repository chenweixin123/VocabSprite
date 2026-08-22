# AGENTS.md

## Product invariant

VocabSprite is an offline-first ambient desktop vocabulary learner. Preserve these invariants:

- The compact card must not steal focus when it appears.
- Closing a card means snooze, never delete.
- No clipboard access before an explicit user shortcut.
- No network request without explicit opt-in.
- Core learning works without AI.
- Learning state is attached to stable word-sense/card identities.
- Overlapping packs merge memberships without duplicating the same sense.
- Same spelling with different senses must not be merged blindly.
- Pack updates must preserve user progress.
- Content provenance and license metadata are mandatory.
- Community-compatible packs must not be labeled official.
- Reduced-motion mode must disable nonessential motion.
- Never weaken tests merely to make CI green.

## Engineering commands

Keep these commands working and update README if names change:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:rust
pnpm pack:validate
pnpm build
pnpm tauri:build
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## Code style

- TypeScript strict mode.
- Avoid `any`; document unavoidable exceptions.
- Rust errors must carry context and must not expose sensitive user content.
- Domain rules belong in domain/core modules, not React components.
- UI must not contain hard-coded word-specific learning logic.
- All timestamps are stored in UTC.
- Database changes require migrations and tests.
- Stable content IDs must not be database auto-increment IDs.
- Prefer deterministic algorithms; inject clock and random seed in tests.
- Keep Tauri permissions minimal.
- Sanitize imported and rendered content.
- Never log clipboard contents, API keys, or full private source context.

## Content rules

- Do not copy commercial word books, dictionary definitions, or example sentences.
- Bundled demo definitions and examples must be original or clearly licensed.
- Every pack and asset requires source, license, coverage, and attribution metadata.
- Reject packs with missing provenance.
- Mark demo/community packs accurately.
- AI-generated content is auxiliary and must be labeled unverified until accepted by a user.

## Review rules

Prioritize:

1. user-data loss;
2. privacy or permission violations;
3. pack fusion identity errors;
4. scheduler/timezone errors;
5. focus-stealing desktop behavior;
6. accessibility regressions;
7. unlicensed content;
8. misleading README claims;
9. performance regressions.

Before declaring a change complete, run the narrow tests for that area and the relevant repository-wide checks.
