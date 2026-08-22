# ADR 0003: Wrap FSRS behind a learning-core adapter

Status: accepted — 2026-08-18

## Decision

Use the license-compatible Rust `fsrs` crate behind `crates/learning-core`.
Persist FSRS state and immutable review events separately from product-facing
stages. Queue policy combines due time with budgets, confusion and rescue using
deterministic tie-breaking; it never replaces FSRS interval computation.

## Consequences

Crate API changes are isolated. Product labels map explicitly to FSRS ratings,
and UTC instants cross the adapter boundary. The renderer may preview queues but
native review commits are authoritative.
