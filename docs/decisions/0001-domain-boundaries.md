# ADR 0001: Keep domain rules outside React and Tauri

Status: accepted — 2026-08-18

## Decision

Pack fusion, stable identity, scaffold transitions, attention budgets,
confusion weights, cue selection and deterministic queue ordering are pure
domain functions. React components consume these functions but cannot redefine
them. Native commands expose repositories and platform behavior only.

## Consequences

The rules can be tested without a window or database. TypeScript owns the
interactive model used by the renderer; Rust independently enforces persistence
and scheduling boundaries. Cross-language fixtures guard semantic drift.
