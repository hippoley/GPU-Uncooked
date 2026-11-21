# GPU Execution Accounting Engine · first independent accounting slice

Goal: reconcile a CUDA source-level prediction with a compiler artifact and an
attributable real device observation. **Do not infer SASS issue counts, cache
traffic, or physical location from source statements.**

## What this commit delivers

- Source ledger: exact `gather<<<1,32>>>` launch, logical source/target
  float32 bytes, 32-byte aligned theoretical regions for strides 1/4/8,
  zero source-level FP32 FLOPs.
- Resource calculator: bound on active blocks and warp occupancy from supplied
  SM limits and compiler-reported register usage, with explicit allocation
  granularity assumptions.
- Roofline calculator: idealized min(compute, HBM bandwidth × operational
  intensity). Not a prediction for tiny or cache-resident kernels.
- A quarantined ingestion shape for **unverified** externally reported metrics.
  It *never* upgrades to measured status. The browser only renders a derived
  accounting ledger; no hardware-counter numbers are displayed as actual.
- Node tests and Chromium checks.

## Three separate evidentiary layers

| Ledger column | Status now | What can promote it? |
|---|---|---|
| logical lane index, byte offsets, output values | DERIVED | deterministic source trace |
| SASS instruction listing and registers/thread | UNKNOWN | source- and binary-pinned nvcc/ptxas/cuobjdump receipts |
| per-kernel Nsight counters, latency and stalls | UNKNOWN | scoped execution with pinned GPU UUID, calibrated methodology, raw profiler output, independent witness |
| precise physical routes and transistor geometry | UNKNOWN | requires evidence unavailable from ordinary Nsight counters |

`REPORTED_UNVERIFIED` explicitly means *someone supplied a claim*, not that
a GPU measurement has been independently validated. A SHA-256 digest proves
only integrity relative to a supplied manifest.

## Useful negative knowledge

1. `gather<<<1,32>>>` has one block / one warp. H100 peak specifications
   cannot be attributed to this kernel.
2. 32 source-level index multiplications are not 32 SASS multiplication
   instructions, nor necessarily 32 execution-pipeline issues.
3. 4/16/32 theoretical source-address regions are not guaranteed DRAM
   transactions; the destination remains four aligned regions.
4. `Occupancy = activeWarps / maxWarps` estimates resident capacity, *not*
   average issue utilization or speed. Register quantum/port pressure and
   hidden scheduling can make a theoretical upper bound optimistic.
5. A 32B-area arithmetic model can coexist with unaligned actual bases;
   this experiment explicitly assumes independently aligned src and dst.

## Acceptance command

```sh
node --test tests/material-execution-accounting.test.mjs
```

Do not put test fixtures through the true-GPU-measurement promotion path.

## Static SASS inspection (next verified input boundary)

The Material Lab receipt inspector can now parse a `cuobjdump --dump-sass`
listing for the single unambiguous `gather` kernel and show **static listing**
length, opcode families, and per-opcode counts. This requires an imported
receipt-view JSON with an actual SASS listing; synthetic CI fixtures are
clearly fixtures and do not prove that H100 has been used.

The inspector deliberately reports:
- static function instruction rows: `REPORTED_UNVERIFIED`
- dynamic instruction execution / per-warp issue count: `UNKNOWN`
- register consumption: `UNKNOWN` until a compiler resource report is bound
- elapsed cycles, stall breakdown, L1/L2 sectors and DRAM bytes: `UNKNOWN`

A real SASS listing contains static instructions, including control and exit
operations. Branching, predication, warp scheduling and reuse mean it is
incorrect to multiply static rows by 32 lanes or by the grid size to claim
dynamic execution counts. Not every static instruction may be executed.

Run the focused tests with:

```sh
node --test tests/material-sass-inspector.test.mjs \
  tests/material-execution-accounting.test.mjs
```

**Still missing:** capture a genuine GPU-targeted binary + ptxas registers
from a device-specific build; reliably associate disassembly and raw Nsight
profiles with exactly that binary, one launch, and a published experiment
configuration. This first parser is not the final evidence-binding protocol.

## Next real-hardware gate

Build a larger multi-CTA controlled benchmark separately from
`gather.cu`, repeat device-side timing and correctness checks, capture
`ptxas -v` resource reports plus PTX/SASS. Obtain per-kernel Nsight output
with explicit metric availability checks and comparability metadata.
Only then calculate observed/derived deltas and keep cache/DRAM ratios
separate from physical-path hypotheses.
