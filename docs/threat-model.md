# Threat model

## Assets and trust boundaries

Protected assets are personal learning history, notes, custom vocabulary, settings,
clipboard text, and integrity of bundled/installed content. Trust boundaries are
local import files, clipboard access, the Tauri webview/command bridge, SQLite, and
operating-system window integrations.

The normal adversary can provide a malicious import or web-rendered string and can
induce ordinary user clicks. The model does not defend against a local administrator,
kernel malware, a compromised compiler/dependency registry, memory scraping, or an
attacker who already controls the user's account.

## Main threats and controls

| Threat                       | Control                                                                       | Residual risk                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Path traversal / huge import | root-contained resolution, 5 MiB limit, bounded arrays, no archive extraction | large valid packs can still consume review time                   |
| Script or SVG execution      | safe-text rejection, React escaping, local SVG validator, restrictive CSP     | future rich HTML would need a new review                          |
| Clipboard surveillance       | global shortcut, 3-second single-use gate, 10k-char cap, content-free logs    | clipboard manager/OS may retain content                           |
| Unintended network leak      | no HTTP plugin/provider, no remote assets/fonts, default opt-out              | dependencies during build require network                         |
| Tauri command abuse          | minimal capability, typed/validated commands, no shell permission             | a future plugin can widen scope                                   |
| Data loss on import/review   | SQLite transactions, stable IDs, backup export, failed-import tests           | OS/disk failure needs external backup                             |
| Accidental deletion          | details-only item deletion; two-step delete-all; close=snooze                 | confirmed delete is intentionally irreversible in-app             |
| Focus disruption             | non-focusable show path for ambient modes                                     | window-manager behavior still needs platform smoke tests          |
| Spoofed official content     | required provenance/license/official status; README disclaimers               | user-created metadata can be dishonest                            |
| Sensitive logs               | no clipboard/source value interpolation; bounded generic command errors       | Rust panic/backtrace may expose file paths, not content by design |

## Security release checks

Release review inspects CSP and capabilities, searches for HTTP/shell APIs and
secrets, runs malicious import fixtures, validates deletion cascades, tests clipboard
gate behavior, scans SVGs, and performs dependency review. Any network provider,
HTML renderer, OCR, screenshot API, archive extraction, or key storage is a new threat
model revision, not a minor implementation detail.
