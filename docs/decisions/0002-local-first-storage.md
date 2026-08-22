# ADR 0002: SQLite authority with a browser development adapter

Status: accepted — 2026-08-18

## Decision

The installed application stores content and user state in a migrated SQLite
database accessed by Tauri commands. Browser development and Playwright use a
versioned local-storage repository implementing the same operations.

No adapter performs network requests. Import is parsed and validated before a
single transaction writes any records. Export deliberately excludes secrets.

## Consequences

The UI remains demonstrable without native tooling, while native builds retain
transactional storage. Browser storage is a development fallback, not a claim
of SQLite equivalence.
