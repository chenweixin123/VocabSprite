# FAQ

## Are the CET or postgraduate packs official/full lists?

No. They are original 15-entry demonstration packs used to prove product behavior.
The manifests say `coverage: demo` and `officialStatus: community-compatible`.

## Does the app require AI, an account, or the internet?

No. v0.1 has no AI/network provider or login. All core learning is local.

## Why do two modules show fewer learning objects than their raw total?

The same semantic sense is fused across memberships. Different senses of the same
spelling remain separate. Progress attaches to the fused sense/card, not a module row.

## Is closing a card destructive?

No. Window close and the Compact × control snooze. Individual deletion lives in the
detail view with confirmation; delete-all requires a separate two-step Settings flow.

## Can I import Anki `.apkg`?

Not in v0.1. Normalize delimited text to the documented CSV or export a VocabSprite
JSON Pack. Binary `.apkg` import/export is a roadmap item only after safe parsing.

## Why does the browser preview not show a new FSRS due time?

The real adapter is Rust and runs in Tauri. The browser preview validates UI/domain
behavior but deliberately does not pretend to reproduce native FSRS.

## What happens when speech or a scene is unavailable?

Learning continues with a visible text fallback. Voice names are never assumed to
exist on every machine.
