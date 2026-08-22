# Privacy notice

VocabSprite v0.1 is local-first and has no mandatory account. The application
stores settings, imported content, notes, review state, confusion edges, cue
feedback, attention budgets, and window positions on the user's device. The
native application stores its authoritative state in the application data
directory's SQLite database; the browser development preview uses localStorage.

No telemetry endpoint, advertising SDK, cloud synchronization, OCR, background
screenshot capture, or AI provider is implemented. `networkOptIn` and
`telemetryOptIn` are explicit future-facing preferences and default to false;
changing them in v0.1 does not initiate a connection.

The global lookup shortcut (`Ctrl+Shift+V`) opens a three-second, single-use
authorization gate. Clipboard text is read only after that action, is limited to
10,000 characters, is matched against local packs, and is not written to logs.
The application does not continuously monitor clipboard changes.

Users can export a full JSON backup and learning-event CSV from Settings. Delete
All requires two explicit actions and removes personal SQLite rows through
foreign-key cascades plus the browser preview state; bundled demonstration packs
remain so the application can start again. Operating-system backups may retain
historical copies outside the application's control.

Imported content remains the user's responsibility. Source and license/use-right
notes are required so the application does not imply redistribution rights.
