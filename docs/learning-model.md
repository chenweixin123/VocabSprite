# Learning model and evidence boundaries

## What is implemented

VocabSprite combines two distinct state machines:

1. **FSRS timing**: the Rust `learning-core` calls the upstream `fsrs` crate's
   `next_states` method with the persisted memory state, elapsed whole UTC days,
   desired retention (0.70–0.97), and an explicit four-way rating map.
2. **Directional scaffold**: four independently stored directions advance through
   acquire → recognize → recall → use. A failure changes only the attempted
   direction. Repeated failures can request Memory Rescue.

Product feedback maps to FSRS ratings as follows:

| Product label | FSRS rating | Scaffold interpretation                 |
| ------------- | ----------: | --------------------------------------- |
| forgotten     |   1 / Again | lapse in the current direction          |
| fuzzy         |    2 / Hard | partial success without over-promotion  |
| remembered    |    3 / Good | success in the current direction        |
| too easy      |    4 / Easy | stronger success, still direction-local |

The native command returns stability, difficulty, next due UTC time, interval days,
and rating; the React state persists that result. The deterministic queue then
combines overdue time, rescue priority, capped confusion weight, optional bridge
mode, module membership, daily new/review limits, and a day-key seed.

## Memory Rescue and cue fingerprint

Two consecutive lapses in one direction request rescue. Rescue selection is
deterministic: it prefers a cue type with better personal effectiveness and avoids
repeating an ineffective channel where alternatives exist. Cue votes are local
counts, not a probabilistic claim about cognition. Successful reviews clear the
current rescue flag; history remains in review events.

## Confusion graph

An edge is created only when the learner identifies the specific alternative they
used. Repeated mistakes increase a capped weight; elapsed time decays it without
going negative. Thresholded edges are eligible for contrast questions. Spelling,
semantic, morphology, and user-error relations are distinct kinds.

## Attention budget

Automatic appearance is blocked by focus mode, quiet hours (including overnight
ranges), snooze/pause deadlines, minimum interval, daily appearance/new/review
limits, or unknown fullscreen state when safe detection is enabled. A deliberate
user open bypasses appearance limits. Time-dependent functions accept explicit UTC
and local clocks in tests.

## Claim boundaries

- Unit and integration tests demonstrate deterministic transitions and invariants;
  they are not a clinical validation of learning efficacy.
- FSRS is truly integrated in the Tauri path. The browser preview cannot call Rust
  and therefore must not be used to validate interval values.
- The four scaffold stages are a product model, not a standardized proficiency test.
- The placement interaction is a reversible local demo, not a psychometrically
  calibrated assessment.
- Demo content quality is manually inspectable but does not establish official exam
  coverage.
