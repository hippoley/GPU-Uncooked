# EP00 → EP01: First real hardware contact

**Status: source implemented; CPU-side unit tests only. No 4090 or A100 benchmark evidence yet.**

## EP00: read-only inventory

```bash
python3 hardware/inventory.py --output results/ep00-host-a.json
```

Review results before public release: UUID, hostnames and topology may be sensitive. Confirm machine operator permission before any workload.

## EP01: CUDA single-GPU probes

Prerequisites: nvcc, compatible GPU driver, approved otherwise-idle GPU and testing window. Run **one device**, never all available GPUs by default.

For RTX 4090 (Ada SM 8.9):
```bash
nvcc -O3 -std=c++17 -arch=sm_89 -o ep01 experiments/ep01_roofline.cu
./ep01 --device 0 --mib 32 --warmup 5 --repeats 20 | tee ep01-4090.json
```

For A100 (Ampere SM 8.0), compile separately on A100's host:
```bash
nvcc -O3 -std=c++17 -arch=sm_80 -o ep01 experiments/ep01_roofline.cu
./ep01 --device 0 --mib 32 --warmup 5 --repeats 20 | tee ep01-a100.json
```

The GPU index is **host-local**. Verify it with nvidia-smi on every host. The program allocates three --mib-sized arrays only on the selected device; it does not change clocks, power, MIG or network settings.

## What the output does and does not mean

- Vector addition has idealized 12 bytes/element (two reads, one write). Reported GB/s is *effective kernel traffic*, **not** a measured DRAM bandwidth counter.
- The FMA dependency-chain benchmark is **not** peak compute TFLOP/s and does not target Tensor Cores.
- Event timing averages kernel launches. Multiple independent runs plus distributions and Nsight counters are necessary before public claims.
- Correctness currently samples the first output element only. This is a smoke check, not complete numerical verification.
- Match workloads, precision and environment when comparing RTX 4090 and A100. 4090 does not support NVLink; A100 topology must be discovered.

## Open blockers

1. 4090 topology and A100 SKU/count unknown.
2. No CUDA compilation or GPU runs verified yet.
3. No independent repeats, complete correctness sweep or profiler counters.
4. No application-level inference speedup demonstrated.

**Next:** add arithmetic intensity sweep, multiple independent trials, full correctness validation and structured performance receipts before calling EP01 verified.
