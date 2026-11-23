# Hopper SASS Difference · First Real Source-Linked Execution Evidence

**Status:** `THIRD_PARTY_UNVERIFIED`. No independent H100 execution, no full-cycle trace, no direct proof of causal optimization.

## What was actually inspected?

Four upstream `.ncu-rep` binary files were pinned by upstream Git blob SHA-1. NVIDIA Nsight Compute **2026.2** was installed on a CPU-only GitHub Actions runner to read the reports. It did not reexecute CUDA.

**Primary source:** [successful Nsight full-source decode + SASS difference run #45096310906](https://github.com/hippoley/GPU-Uncooked/actions/runs/45096310906).

The full-source reports contain **different real Kernel names**:
- `rswgmma_uniform4096_kernel`
- `memdesc_transpose_uniform4096_kernel`

The original two short reports both have the same `fp8_kvpertensor_tle_splitk_v52_cluster8_paged_vtranspose_log2_kernel` name. **Do not combine their durations with the full-source SASS differences.**

## Numbers from the same two full-source reports

| Observable | RS-WGMMA full-source | Memdesc full-source |
|---|---:|---:|
| Duration (ns) | 60,864 | 41,184 |
| Registers per thread | 118 | 80 |
| Static SASS instruction lines | 1,488 | 1,440 |
| Sum of reported per-address Instructions Executed | 7,640,064 | 6,978,048 |
| QGMMA executions | 131,072 | 131,072 |
| STS executions | 1,229,824 | 181,248 |
| PRMT executions | 17,152 | 803,584 |
| LDS executions | 1,250,304 | 1,250,304 |
| FFMA executions | 227,328 | 227,328 |
| LDG executions | 34,816 | 34,816 |

The reported Duration ratio is approximately **1.478×**. Relative to RS, Memdesc reports around **32.34% shorter duration**, but both durations are single third-party profiled samples.

**Differential:** STS reports 1,048,576 fewer executed instructions; PRMT reports 786,432 additional executed instructions; QGMMA counts match. This supports a testable hypothesis involving replacing shared-memory stores with register permutation in the data preparation path. It does **not** by itself prove which instruction, scheduling condition or cache effect determines runtime.

Notice that Hopper uses **`QGMMA.64x8x32.F32.E4M3.E4M3`** in the saved SASS listing. Searching only for `WGMMA` or `HMMA` would miss this relevant instruction family.

## Evidence semantics

- A displayed SASS line is an assembly listing, **not** a transistor-level trace.
- `Instructions Executed` is an aggregated profiler counter, **not** nanoseconds, instruction latency, or per-thread cycle history.
- Source reports are vendor-decoded third-party files. Their file bytes and decoder identity were verified; GPU device provenance was asserted by the upstream author and not independently attested.
- Different Kernel symbols and SASS opcode distributions do not prove controlled single-variable experimental conditions.
- The report does not independently bind the original `gather.cu` sample from GPU-Uncooked to these kernels.

## Reproduce the analysis

On a machine with NVIDIA Nsight Compute 2026.2, run the explicit workflow `.github/workflows/public-h100-offline-decode.yml`, or download its successful artifact. It contains the four pinned report binaries, their Source CSVs, original metrics, and `full-source-sass-diff.json`.

The parser is `tools/diff_public_h100_sass.py` and can be invoked with:

```bash
python3 tools/diff_public_h100_sass.py \
  --left sass-rswg-full/source.stdout.csv \
  --right sass-memdesc-full/source.stdout.csv \
  --output full-source-sass-diff.json
```

Material Lab includes a read-only six-opcode curated view with these same counts. The complete 64-opcode difference table stays in the archived CI artifact. Third-party values remain `THIRD_PARTY_UNVERIFIED`.
