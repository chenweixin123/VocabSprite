# Performance procedure and results

`pnpm benchmark` creates 10,000 deterministic sense candidates, builds a bounded
queue, then serializes and parses 100,000 compact review records. It reports elapsed
wall time, output counts, encoded bytes, and heap usage from the current machine. A
conservative local guard fails if either operation exceeds five seconds.

This synthetic fixture checks algorithmic/data-shape regressions; it does not measure
real Windows cold start, SQLite disk latency, animation frame rate, or idle CPU.
Release review also records production bundle size and performs a manual idle/cold-
show smoke check. Results are filled only by executed commands—never estimated.

## Latest local run

Executed on 2026-08-18 with Node 24.19.0 and the repository-declared pnpm 10.19.0
on Windows Server 2022 (build 20348), an AMD EPYC 7K62 VM limited to 2 logical
processors and 4 GiB RAM:

```text
pnpm benchmark
10,000-item deterministic queue: 80.83 ms (10,000 results)
100,000-review JSON round trip: 145.62 ms (100,000 results, 9,677,791 bytes)
heap used after fixture: 49.01 MiB
```

The production web build was 390.95 kB JavaScript (113.24 kB gzip) and 35.87 kB
CSS (7.94 kB gzip). All synthetic guards passed. These results are evidence for
the bounded in-memory algorithms and payload shape only; they are not a cold-start,
idle-CPU, animation-frame, SQLite disk, battery, or low-end-device benchmark.
