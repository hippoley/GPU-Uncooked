# Inside CUDA — Evidence-First 1:1 Contract (v0.1)

> Status: **specification only**. This document is not evidence that an NVIDIA GPU has run the experiment. Do not mark the 3D viewer hardware-validated until receipts are independently inspected.

## Product promise

A visitor can enter a computer and inspect how a **specific CUDA program, specific input, generated machine code, measured execution, and documented hardware architecture** relate. Every selectable 3D object and path must carry a provenance reference. A beautiful scene with no corresponding evidence is not a hardware fact.

**1:1 means traceable identity within the observable layer**, not an invented exact transistor placement, timing trace, or internal L1/L2/HBM route.

## Three disjoint evidence classes

| Class | Permitted claim | Required provenance | Prohibited shortcut |
|---|---|---|---|
| `MEASURED` | Actual device, program output, disassembly, supported counter | immutable run receipt, machine/tool versions, raw file hashes, command | Never use browser calculations or CUDA event time as hardware counters |
| `DERIVED` | CUDA address/index calculation, predicted aligned sector coverage | source hash, equation, assumptions, architecture docs | Never say a predicted sector count was profiled |
| `ILLUSTRATIVE` | Spatial placement, expanded logic blocks, artistic materials | caption naming the unsupported physical assertion | Never imply exact die-level position or signal path |

`UNKNOWN` must stay visible. A `MEASURED` badge must not propagate automatically to child geometry, scheduler timeline, or paths derived from the measurement.

## Physical architecture identity

- Identify **exact SKU and form factor**: e.g. H100 SXM versus H100 PCIe, not generic “H100.” Different SKUs have different enabled resources.
- Record module/package/die distinction; a logical block diagram is **not** a floorplan.
- Model public counts and hierarchy with primary-source citations and versioned assumptions. Preserve the distinction between total GH100 design resources and enabled units of a particular SKU.
- A physical coordinate or dimension is `MEASURED` or source-backed only if its corresponding layout/measurement is available and licensed. Otherwise use `ILLUSTRATIVE` with a visibly separate logical-space view.
- Do not infer a unique physical SM, cache bank, HBM stack, register or transistor from a lane ID or a warp number.

## First acceptance experiment: gather stride 1 / 4 / 8

Authoritative kernel: `playground/material-lab/gather.cu` at a pinned commit.

Input: 256 float32 values `src[i]=i+0.25`, one block of 32 threads, output `dst[lane]=src[lane*stride]`.

For each stride, the browser can **derive** 32 source element indices, byte **offsets relative to src** (not absolute GPU virtual addresses), output floats, and a set of 32-byte regions **relative to an assumed 32-byte-aligned base**.

Expected region counts under these assumptions: stride 1→4, 4→16, 8→32. They are not necessarily the same as Nsight's reported sectors, DRAM transactions, cache misses, or physical HBM reads. Actual placement and memory system behavior depend on device, compiler, caches, and launch context.

### Real GPU receipt minimum

For each approved target GPU and each stride:

1. Pin Git commit and SHA256 of `gather.cu`; capture exact `nvcc`, `ptxas`, `nvidia-smi`/driver and Nsight Compute versions, device SKU/UUID and compute capability.
2. Compile **for the detected target architecture** with logged flags; preserve `fatbin/cubin`, PTX and actual disassembled SASS, with SHA256 of every binary/text artifact. Do not write SASS by hand.
3. Run correctness checks and retain unedited stdout, stderr, exit code, command, timestamp and results. Collect warmup/repetition if timing is reported.
4. Capture raw Nsight Compute report (`.ncu-rep`) plus exported metrics, their supported names, units, collection configuration and versions. Record missing/unsupported counters as `UNKNOWN`, never zero.
5. Capture original profiler output separately from **predicted** sector counts and document any mismatch. Cache-sector counters and DRAM transactions answer different questions.
6. Preserve a hash manifest for all raw files and immutable run identifier; each visualization claim cites that identifier, source file and evidence type.

Example commands (adapt to detected hardware; do not claim completion without receipts):

```bash
nvidia-smi -L
nvcc --version
ncu --version
nvcc -O2 -lineinfo -arch=sm_80 -o gather gather.cu   # example ONLY: sm_80 for an A100 target
cuobjdump --dump-sass ./gather > gather.sass.txt
for s in 1 4 8; do ./gather "$s"; done
ncu --set full --export gather-stride8 --force-overwrite ./gather 8
```

Profiler permissions, available metrics, replay side effects, and target architecture must be checked before execution. Do **not** run `ncu --set full` automatically on a shared or production GPU.

### Presentation contract

The 3D viewer must read an evidence manifest rather than silently generate 'real' paths:

- Source panel: user-editable CUDA C++; generated PTX/SASS must link to a real compiler receipt.
- Memory panel: predicted index/offset/region coverage displays `DERIVED`, with visible base-alignment assumption.
- Measurement panel: profiler metric, unit, GPU UUID, run ID, tool/version, report hash and context; if absent show **NOT MEASURED**.
- Physical panel: only sourced form factor, counts, dimensions and verified arrangement can carry `MEASURED`; otherwise mark `ILLUSTRATIVE`.
- The viewport must explicitly differentiate "logical execution edge" and "observed physical data movement." Never draw a uniquely observed per-lane L1→L2→HBM path based solely on aggregated counters.
- Any claim without a valid provenance record fails the evidence gate; screenshot/browser/Node CI passing does not upgrade claim status.

## Acceptance gates

| Gate | Evidence | Status at specification creation |
|---|---|---|
| G0 source and address behavior | Kernel + deterministic browser model | Present in PR #2; review needed |
| G1 reproducible GPU correctness | Per-stride device receipts on identified GPU | **NOT VERIFIED** |
| G2 machine code | PTX/SASS matching compiled binary and source | **NOT VERIFIED** |
| G3 real memory measurement | Raw NCU report, metrics, predicted-vs-measured comparison | **NOT VERIFIED** |
| G4 physical coordinates | Cited dimensions/layout per depicted object | **NOT VERIFIED** |
| G5 scene provenance | Every factual geometry/path maps to source or receipt, unknowns labeled | **NOT VERIFIED** |
| G6 independent replay | Other user reproduces same output on stated platform | **NOT VERIFIED** |

**Release rule:** no marketing claim "1:1 physical GPU" or "actual GPU internal path" while G4/G5 remain unverified. A measured experiment may be showcased with its limited scope if G1–G3 pass.

## Negative cases that must fail

- Fake `.ncu-rep`, missing or incompatible GPU UUID, mismatched source/binary hash.
- A derived count of 32 regions labeled as 32 measured DRAM reads.
- “SASS” text typed manually rather than disassembled from the recorded binary.
- An invented exact position of SM 31 or a physically accurate cache route without a published layout source.
- A pristine Chromium screenshot used to imply GPU execution.
