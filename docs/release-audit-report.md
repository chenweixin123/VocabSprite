# VocabSprite v0.1.0 release audit report

Date: 2026-08-22
Scope: complete working tree, Windows Tauri executable, MSI/NSIS installers, and
the assembled release-candidate ZIP
Verdict: **approved for controlled preview; not approved as an unrestricted public
release**

No open P0 or P1 defect is known in the exercised core learning loop. The final ZIP
can be extracted, both installers can install and uninstall, and the installed native
application can create a responsive window and initialize a valid local database on
the audited host. This is bounded release evidence, not a guarantee that the software
contains no bugs.

Public release is held for owner-controlled and manual qualification work: all Windows
binaries are unsigned, the compact-window transparency could not receive an unlocked
desktop visual sign-off while the audit desktop was locked, and clean Windows 10/11,
accessibility, display-scaling, multi-monitor, tray, autostart, and sleep/resume matrices
have not been executed.

## Environment and audit boundary

- Windows Server 2022 Datacenter 10.0.20348, AMD EPYC 7K62 VM, 2 logical processors,
  4 GiB RAM.
- Node 24.19.0 and the repository-declared pnpm 10.19.0. A final
  `pnpm install --frozen-lockfile` recreated all 276 packages from `pnpm-lock.yaml`.
- Rust/Cargo 1.97.1 stable, MSVC, Visual Studio Build Tools, and Windows SDK.
- Browser journeys used Playwright Chromium against the same production React UI.
  Native installation, process/window creation, SQLite initialization, and outbound
  connection sampling used the packaged Tauri application.
- The Windows desktop was locked during native visual inspection. Computer Use captured
  the Windows lock screen and then stopped without input, as required by its safety
  workflow. Process inspection still verified a responsive titled native window, but
  transparent rounded edges require an unlocked visual recheck.

## Defects found and fixed in the final audit

### 2026-08-22 compact quick-settings follow-up

1. **The compact title bar had no direct settings entry, so frequent card adjustments
   required expanding the full application.** A named gear button now opens an in-flow
   quick-settings region with Small (304 px), Standard (336 px), and Large (400 px)
   card widths; Violet, Blue, Green, and Amber palettes; 72–100% opacity; Off/Low/Standard
   motion; and topmost behavior. Every control is keyboard labelled, selected size/color
   buttons expose pressed state, and high-contrast mode overrides decorative palettes.
2. **Native compact resizing tracked only content height and could not follow a chosen
   card width.** The ResizeObserver now reports both dimensions, including scroll height;
   the native command rejects non-finite input, ignores late Dot measurements, and clamps
   width and height to the monitor work area. Short native cards scroll internally while
   retaining a sticky title bar. Browser regressions verify exact 304/400 px widths and
   no horizontal overflow at 360 x 520.
3. **Learners who want a cue before revealing had no optional self-service mode.** The
   new hint preference defaults off. Once explicitly enabled, a separate button reveals
   only a first letter, word length, part of speech, or collocation cue; it does not show
   the answer. Same-schema snapshots merge safe Standard/Violet/disabled defaults, with
   direct migration and non-answer regression coverage.
4. **Release artifacts needed to be rebuilt after the native size bridge changed.** The
   executable, NSIS, MSI, five-file ZIP, checksums, release README, and screenshots were
   regenerated. Both installers were run from the newly extracted ZIP; each installed,
   launched a responsive native window with six WebView2 descendants and zero console
   descendants, and uninstalled with zero remaining registration, install directory, or
   VocabSprite process.

### 2026-08-22 compact-card and onboarding follow-up

1. **The compact card occupied a fixed 360 x 560 native window with an opaque root
   background, leaving a large light rectangle around a much shorter card.** The native
   window is now transparent, its undecorated rectangular shadow is disabled, and a
   `ResizeObserver` sends the actual card height through a bounded native command. The
   command ignores late Dot-mode measurements and clamps growth to the monitor work
   area, leaving only a 12 px transparent margin around the card.
2. **Onboarding capped its quick sliders at 30 new words and 100 reviews with no explicit
   high-volume path.** Each control now has a keyboard-labelled Custom button and number
   input. Guarded limits are 1–1,000 new words and 1–5,000 reviews; Settings, persisted
   state, and backup validation share the same bounds. A 640 x 420 browser regression
   enters 120/450, completes onboarding, verifies persistence, and checks horizontal
   overflow.
3. **A persisted Compact state could report its height before the native shell switched
   out of decorated startup geometry, then incorrectly suppress the identical retry.**
   Window-resize transitions now invalidate the reported-height cache and force one
   idempotent retry. A component regression reproduces this same-height startup path.
4. **Release artifacts were stale after these native changes.** The executable, NSIS,
   MSI, and five-file ZIP were rebuilt. Each installer was run directly from the final
   ZIP extraction and completed install, responsive native launch, zero-console-child,
   and uninstall checks, leaving zero registrations and processes.

### 2026-08-21 window follow-up

1. **The expanded borderless window could extend below a short desktop and expose only
   its horizontal resize edges.** Expanded/onboarding mode now uses the standard Windows
   frame, starts at 1080 x 680, applies a 640 x 420 minimum, fits itself to the current
   monitor work area with a visible inset, and recenters after compact-to-expanded
   transitions. Compact and Dot modes remain frameless ambient surfaces.
2. **The release executable used the Windows console subsystem.** The release entry point
   now selects the Windows GUI subsystem. The rebuilt PE header is `WINDOWS_GUI (2)`;
   direct, MSI-installed, and NSIS-installed launches each created a responsive native
   window with one WebView2 child and zero `conhost.exe` children.
3. **Tray Open and Pause could change native window geometry without changing the React
   window mode.** Tray Open now emits an explicit event that restores the Today page in
   expanded mode; Pause switches both native and UI state to Dot mode.
4. **Short expanded windows could hide the bottom of the sidebar and a fixed status
   message could intercept clicks.** The sidebar now scrolls independently and the
   status surface is pointer-transparent. A 1024 x 420 regression verifies that the
   bottom compact-card entry remains reachable without horizontal clipping.

### Earlier release audit

1. **Corrupted persisted state could crash startup or restore.** A snapshot could have
   the expected top-level schema version while containing invalid nested arrays, maps,
   records, preferences, or dates. A centralized normalizer now validates all persisted
   fields, discards unsafe values, preserves valid values, and falls back to defaults.
   Regression tests cover corrupted local state and backup restore.
2. **The native WebView2 process contacted the configured loopback proxy during cold
   launch.** The frontend made no off-origin request, but WebView2 background services
   still opened a TCP connection. Supported WebView2 background-network suppression
   flags were added to Tauri configuration. A rebuilt application, launched with a new
   WebView profile, showed zero outbound TCP connections across the application and all
   WebView2 child processes during 25 seconds of sampling.
3. **Speech fallback did not cover all unavailable-engine shapes.** The platform adapter
   now handles an absent speech-synthesis object and an absent utterance constructor,
   keeps the visible pronunciation fallback, and has regression coverage.
4. **The repository license file was a placeholder.** It was replaced with the complete
   official AGPL-3.0 text and the full license is included in the release ZIP.
5. Generated Tauri schemas were normalized with the project formatter after the final
   native build. No production behavior changed in this formatting step.

Earlier implementation and review also hardened pack size/path/markup/checksum checks,
transactional native imports, SQLite migration and cascade behavior, minimal Tauri
capabilities/CSP, one-shot clipboard authorization, compact-card screen clamping,
stable sense fusion, FSRS timestamp/rating mapping, and explicit two-step data deletion.
No test was removed, skipped, or weakened to obtain a green result.

## Final verification results

| Area                     | Executed evidence                                                           | Result and boundary                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locked dependencies      | 2026-08-21 `pnpm 10.19.0 install --frozen-lockfile` carried forward         | 276 packages recreated from the committed lock file; the 2026-08-22 follow-up did not rewrite dependency lock files.                                                                                                                                                                                                                                                                     |
| Static gates             | Prettier check, TypeScript project build, ESLint                            | Passed with no formatting differences, lint warnings, or type errors after the final Tauri schema generation.                                                                                                                                                                                                                                                                            |
| TypeScript tests         | `pnpm test`                                                                 | 12 files, 81 tests passed; 0 failed. Compact quick settings, opt-in non-answer hints, old-snapshot preference migration, custom limits, backup bounds, and persisted-Compact startup size retry have direct regression coverage.                                                                                                                                                         |
| Browser release journeys | `pnpm test:e2e`                                                             | 10/10 passed (9 Chromium journeys plus 1 reproducible screenshot run): onboarding, custom high-volume limits at 640 x 420, compact settings at 360 x 520, exact 304/400 px card widths, color/opacity/motion/hint persistence, six question modes, feedback, offline behavior, navigation, import/export/backup, responsive/reduced-motion UI, corrupt state, deletion, and screenshots. |
| Rust quality             | `cargo fmt --all --check`; strict all-target/all-feature Clippy             | Passed; Clippy treated warnings as errors.                                                                                                                                                                                                                                                                                                                                               |
| Rust tests               | `cargo test --workspace`                                                    | 22 tests passed; 0 failed. Compact height and width tests cover the three selected widths, content tracking, minimum dimensions, work-area clamping, and non-finite input. The localized MSVC import-library linker message was informational.                                                                                                                                           |
| Packs and assets         | `pnpm pack:validate`; `pnpm assets:validate`                                | 7 packs, 105 demo entries, 96 fused identities; 20 original local SVG assets passed provenance checks.                                                                                                                                                                                                                                                                                   |
| Production web build     | production Vite build                                                       | Passed; JS 400.03 kB (115.97 kB gzip), CSS 42.13 kB (8.94 kB gzip).                                                                                                                                                                                                                                                                                                                      |
| JavaScript advisories    | 2026-08-21 `pnpm audit --prod` carried forward                              | No known production vulnerabilities.                                                                                                                                                                                                                                                                                                                                                     |
| Rust advisories          | 2026-08-21 RustSec `cargo-audit` 0.22.2 carried forward                     | 0 known vulnerabilities. It reported 16 unmaintained and 1 unsound informational warnings across the all-platform lock graph. The unsound `glib 0.18.5` and legacy GTK warnings are absent from the Windows target graph; five unmaintained `unic-*` crates remain through `urlpattern -> tauri-utils`. Yanked-package checking was excluded from the final JSON run.                    |
| Synthetic performance    | 2026-08-21 benchmark carried forward                                        | 10,000-item queue: 80.83 ms; 100,000-review JSON round trip: 145.62 ms; 9,677,791 bytes; 49.01 MiB heap. Both five-second guards passed.                                                                                                                                                                                                                                                 |
| ZIP integrity            | Extracted the 2026-08-22 ZIP and recomputed included installer hashes       | Exactly 5 expected files; both installer hashes matched `SHA256SUMS.txt`; no missing or extra file. The extraction used `artifacts/qa/zip-quick-settings-20260822`.                                                                                                                                                                                                                      |
| MSI                      | Install, native launch, and uninstall directly from the extracted final ZIP | Install/uninstall returned 0; version 0.1.0; installed PE subsystem 2; responsive titled window; six WebView2 descendants and zero console children; uninstall registration and program directory removed.                                                                                                                                                                               |
| NSIS                     | Install, native launch, and uninstall directly from the extracted final ZIP | Install/uninstall returned 0; version 0.1.0; installed PE subsystem 2; responsive titled window; six WebView2 descendants and zero console children; install directory and registration removed. User data was preserved by uninstall as designed.                                                                                                                                       |
| Native storage           | 2026-08-21 packaged database integrity check carried forward                | `integrity_check=ok`, schema migration 1, 29 tables, and one initialized user.                                                                                                                                                                                                                                                                                                           |
| Native network           | 2026-08-21 cold-launch connection sample carried forward                    | 0 outbound TCP connections after the background-network fix. This is an observation window, not a proof for every future feature or OS state.                                                                                                                                                                                                                                            |
| Cleanup                  | Registry/process check after installer tests                                | 0 VocabSprite uninstall registrations and 0 VocabSprite processes remained.                                                                                                                                                                                                                                                                                                              |

## Release artifacts

| Artifact                                                                |     Bytes | SHA-256                                                            | Signature |
| ----------------------------------------------------------------------- | --------: | ------------------------------------------------------------------ | --------- |
| `target/release/vocabsprite-desktop.exe`                                | 9,884,672 | `53429B61C593955919D0B7A27F9821C81C62A962CD04FBCA286B5BB8A59BF842` | NotSigned |
| `target/release/bundle/nsis/VocabSprite_0.1.0_x64-setup.exe`            | 2,739,597 | `5BC7E4BD229E9DD46AAB541D715494491C4A82A8A1CEE37C717126F687558310` | NotSigned |
| `target/release/bundle/msi/VocabSprite_0.1.0_x64_en-US.msi`             | 3,907,584 | `05348CD329E2E338D1568AE70CAB6F98EF8B18285A86EAAB0128F2A658689E85` | NotSigned |
| `artifacts/release/VocabSprite_0.1.0_windows_x64_release-candidate.zip` | 6,435,593 | `A6C6D2A7E566E6AA96C5DA76292E6BCAFEDF7BAA6D59284039D8E4DBF0973D54` | Container |

The ZIP contains exactly:

- `VocabSprite_0.1.0_x64-setup.exe`
- `VocabSprite_0.1.0_x64_en-US.msi`
- `README.txt`
- `SHA256SUMS.txt`
- `LICENSE.txt`

## Remaining limitations and release blockers

1. **Unsigned distribution:** Windows reports an unknown publisher and SmartScreen may
   warn. Authenticode signing is required before an unrestricted public Windows release.
2. **Manual native matrix incomplete:** the locked audit desktop prevented an unlocked
   visual sign-off of the transparent compact-card edges, the three native card widths,
   the new quick-settings panel, and a native pointer/keyboard walkthrough. Chromium
   screenshots and journeys passed, and packaged native processes/windows were healthy,
   but Narrator, forced colors, 200% scaling, clean Windows 10/11/WebView2, multiple
   monitors, tray/autostart, sleep/resume, and upgrade-over-old-version behavior also
   remain unqualified.
3. **Supply-chain maintenance risk:** five indirect `unic-*` crates in the Windows Tauri
   dependency graph are marked unmaintained. No known vulnerability was reported, but
   this is not equivalent to actively maintained code and should be monitored upstream.
4. **Persistence technical debt:** v0.1 still uses a bounded JSON snapshot as the UI's
   authoritative SQLite payload while normalized tables cover native domain operations.
5. **Content and platform scope:** the seven bundled packs are small original demos, not
   complete official exam lists. `.apkg`, sync, network AI providers, and macOS/Linux
   parity are intentionally out of scope.
6. **Owner-controlled release work:** publisher identity, trademark/store-name clearance,
   production repository URLs, and a real security contact cannot be completed by code
   alone.

## Recommendation

The final ZIP is suitable for internal testing, contributors, or a clearly labeled
unsigned preview. Do not describe it as defect-free, and do not publish it as the final
general-audience Windows release until code signing and the unlocked clean-machine
Windows matrix are complete. After those checks, re-hash the signed artifacts and build
a new ZIP; signing changes the executable and installer hashes.
