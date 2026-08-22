# Roadmap

## v0.1 release blockers

- Complete automated Windows Tauri bundle and clean-machine smoke validation.
- Manual Narrator, high-contrast, 200% scaling, tray, no-focus, multi-monitor, sleep/
  resume, autostart, and WebView2 checks.
- Configure a real private security contact, repository URLs, signing identity, and
  trademark/domain/store-name clearance.

## Near term

- Move UI writes from the bounded state snapshot to fully normalized repository
  commands while retaining transactional backup compatibility.
- Add paginated history queries and an explicit upcoming-review workload chart.
- Add safe JSON multi-file selection and richer conflict resolution.
- Qualify macOS/Linux basics without promising parity before tests exist.

## Later, only with new threat/ADR review

- Optional encrypted sync or network content providers, still opt-in.
- Safe `.apkg` parsing without executing card HTML.
- Optional AI mnemonic provider with system key storage, provenance, unverified state,
  and explicit user confirmation. AI will remain non-core.
- Signed updates and store distribution after name clearance.
