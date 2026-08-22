# Security policy

## Supported version

Security fixes target the current `0.1.x` development line. This repository is
not yet a signed production release.

## Reporting

Do not open a public issue containing private vocabulary, clipboard content,
database files, API keys, or exploit details. Contact the repository maintainer
through the private security-reporting channel configured by the eventual host.
Until a public host exists, keep a minimal reproducer locally and disclose only
non-sensitive metadata. A release must add a concrete private contact before it
is labeled production-ready.

Include the affected commit, platform, impact, reproduction steps, and whether a
malicious pack or local user action is required. Never attach a real user database.

## Security boundaries

- CSP has no wildcard script source and Tauri capabilities expose only required
  event/window operations; no shell or HTTP plugin is enabled.
- Imports are capped at 5 MiB, reject traversal in catalog paths, validate stable
  IDs/schema/checksum, and reject executable/embedded HTML.
- Clipboard access is shortcut-gated, time-limited, single-use, length-limited,
  and content-free in logs.
- SQLite migrations enable foreign keys and use transactions for pack import,
  review commit, and personal-data deletion.
- The project does not promise protection from an administrator who can read the
  user's profile, memory, or operating-system backups.

See [docs/threat-model.md](docs/threat-model.md) for assumptions and residual risk.
