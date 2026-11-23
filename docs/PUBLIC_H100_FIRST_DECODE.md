# First decoded public Hopper evidence: RS-WGMMA vs transposed memdesc

Evidence status: **THIRD_PARTY_UNVERIFIED**, verified upstream Git blob bytes, successfully decoded with the vendor's Nsight Compute 2026.2.0 CLI on a CPU-only GitHub runner. This is **NOT** a re-execution on an H100; upstream labels the device H100/SM90.

* Source: [smartxiaohuolong/triton-tle-attention-optimization-demo](https://github.com/smartxiaohuolong/triton-tle-attention-optimization-demo), pinned revision `53fcfbf0c11430ca9db23f8d90c4ec71b686efc8`
* [Actual CLI decode run #45095035273](https://github.com/hippoley/GPU-Uncooked/actions/runs/45095035273), with raw CSV, stderr, 2 original `.ncu-rep` reports, extracted JSON and SHA-256 in the Actions artifact
* RS source SHA-256: `9306945be3a48e7df590a319c3360df0e24f7d64e2aca8eaaa3993c8159fcc65`
* Memdesc source SHA-256: `e2845164a11721415d780e94e61bc41ce2833829b91695b8bec2778cf5adb424`
* Both report CSV streams contain **80 per-section metric records**, one reported launch with ID `0`, `CC=9.0`, grid `(512, 1, 1)` and block `(128, 1, 1)`

## Values read from the actual reports (not fixtures)

| Nsight section · metric | Unit | RS-WGMMA | Memdesc |
|---|---|---:|---:|
| GPU Speed Of Light Throughput · Duration | ns | 61056 | 38816 |
| GPU Speed Of Light Throughput · Elapsed Cycles | cycle | 96471 | 61160 |
| Launch Statistics · Registers Per Thread | register/thread | 124 | 80 |
| Launch Statistics · Dynamic Shared Memory Per Block | byte/block | 46656 | 38592 |
| Occupancy · Theoretical Active Warps per SM | warp | 16 | 20 |
| Occupancy · Theoretical Occupancy | % | 25 | 31.25 |
| Occupancy · Achieved Occupancy | % | 21.74 | 25.11 |
| Compute Workload Analysis · Executed Ipc Active | inst/cycle | 0.83 | 1.18 |
| Compute Workload Analysis · Issue Slots Busy | % | 20.88 | 29.55 |
| Warp State Statistics · Warp Cycles Per Executed Instruction | cycle | 16.78 | 13.88 |
| Memory Workload Analysis · L1/TEX Hit Rate | % | 35.85 | 36.39 |
| Memory Workload Analysis · L2 Hit Rate | % | 7.97 | 6.69 |
| GPU Speed Of Light Throughput · DRAM Throughput | % | 34.21 | 53.77 |
| Memory Workload Analysis · Memory Throughput | byte/s | 1145823899371.07 | 1801945589447.65 |

The reported duration ratio is `61056 / 38816 ≈ 1.573`; the second reported duration is about 36.4% shorter.

**Crucial negative observation:** the `Kernel Name` column in *both* reports is
`fp8_kvpertensor_tle_splitk_v52_cluster8_paged_vtranspose_log2_kernel`.
The reports have different duration/resource values, but their filenames and README alone do **not** establish that different SASS images were executed. Do not assert code-level causality until binary/SASS/source identity is checked independently.

Other necessary limits:

* Single sampled profiled launch per report; no variance/repeatability measurement here.
* Despite same problem description, similar grid and block, different register allocation and dynamic shared memory do not establish that the only change is the memdesc optimization.
* Occupancy increase is consistent with increased available residency, but it is not evidence that occupancy caused the full speed difference.
* Reported DRAM throughput percentages are not absolute HBM transferred bytes; mixed Nsight sections/units must not be merged.
* Any user-generated, source-code-driven visualization must label animation as reconstruction, not a cycle-exact physical trace.

## Next verification

Extract SASS/source views from the pinned `full_source_cleaned` reports using NVIDIA `ncu --import ... --page source --print-source sass` when supported. Compare instruction listings, not merely demangled Kernel Names. Then validate whether the two upstream implementations actually compile to distinct instruction sequences.

This file is a curated index of actual archived vendor-decoded *third-party* report values. The original report bytes and raw decoded CSV remain in the GitHub Actions artifact.
