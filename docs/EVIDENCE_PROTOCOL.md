# Evidence protocol v0.1

A performance claim is an experimental claim, not a screenshot.

## Required metadata
- Unique experiment ID, UTC timestamp, responsible operator and exact git commit
- Host OS/kernel, CUDA/runtime, NVIDIA driver, GPU model/SKU, UUID, PCIe topology
- Power cap, clocks, MIG state (when applicable), persistence/configuration changes
- Device utilization and whether any other workload shared the hardware
- Framework, compiler, precision, workload/input distribution and correctness tolerance
- Warm-up count, repetitions, measurement method, random seeds and raw outputs

## Method
1. State a prediction **before** seeing measurements.
2. Confirm operator approval before any load; inventory and topology queries are read-only.
3. Capture baseline, then run a single GPU in an isolated window.
4. Use device-side timing with synchronization; distinguish launch overhead from steady-state kernel time.
5. Report median, p10/p90 or distribution and sample count. Include latency units and effective throughput formula.
6. Compare like with like. A100 and 4090 differ in memory, precision modes and available libraries; mark any unmatched configuration.
7. Verify numerical correctness against a reference implementation, not only timing.
8. Collect profiler data when the interpretation depends on cache misses, occupancy, stalls, or bandwidth.
9. Run end-to-end validation before claiming any useful optimization.
10. Publish negative outcomes and failure conditions.

## Receipt format
```yaml
id: gpu-kitchen-ep01-example
status: planned # planned|simulated|measured|reproduced|rejected
hypothesis: "A memory-bound kernel scales with effective bandwidth"
hardware:
  model: unknown
  sku: unknown
  topology: unknown
software:
  git_sha: unknown
  driver: unknown
  cuda: unknown
workload:
  description: unknown
  precision: unknown
correctness:
  method: unknown
  max_error: null
measurement:
  repetitions: 0
  median_ms: null
  p10_ms: null
  p90_ms: null
artifacts:
  raw_data: null
  command: null
limitations:
  - "No physical GPU results yet"
```

## Acceptance checks
- Data files do not silently mix 4090 and A100 results.
- No synthetic or CPU-only CI run changes a status to `measured`.
- Six GPUs are not treated as one address space or one memory pool.
- Results with severe thermal or competing-workload interference are flagged.
- Run scripts require explicit selection of devices and never default to all available GPUs.

## Safety
Production/shared server capacity is valuable. Do not change clocks, power caps, MIG configuration, driver, or network settings without explicit operator approval; never run full-system stress tests by default.
