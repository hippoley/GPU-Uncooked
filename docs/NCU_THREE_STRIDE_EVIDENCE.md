# First pinned GPU evidence comparison · three stride launches

This is a runbook for one *actual* GPU operator. There is **no real H100
capture committed** in this repository. A GitHub CI success on a CPU runner
is not equivalent to Nsight hardware evidence.

## Gate 0: source and binary integrity

On a Linux host with a CUDA-capable NVIDIA GPU, nvcc, cuobjdump, and Nsight
Compute (ncu), select its precise UUID:

```bash
nvidia-smi --query-gpu=uuid,name,compute_cap --format=csv,noheader
```

Follow the existing [GATHER_GPU_CAPTURE.md](GATHER_GPU_CAPTURE.md) to create a
fresh capture. Do not point to a folder somebody else prepopulated. Explicitly
approve executing CUDA code against your selected GPU:

```bash
python3 tools/capture-gather-receipt.py \
  --device GPU-YOUR-UUID \
  --output /tmp/gather-raw-001 \
  --execute
python3 tools/verify_gather_receipt.py /tmp/gather-raw-001
```

The verifier rejects missing/tampered files but **cannot independently
authenticate** the host, operator or device.

## Gate 1: three separate Nsight captures against one binary

```bash
python3 tools/capture_gather_ncu_series.py \
  --raw /tmp/gather-raw-001 \
  --output /tmp/gather-ncu-001 \
  --device GPU-YOUR-UUID \
  --execute
```

The tool checks the prior source manifest, binary digest, UUID and its own
explicit authorization. It invokes **exactly the same executable file** with
strides 1, 4, 8, one target kernel launch per process.

It asks for three raw counters:

- `l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum`
- `dram__bytes_read.sum`
- `dram__bytes_write.sum`

The GPU and profiler version may not support a requested metric or the
current user may lack performance-counter permission. An unsupported metric
is a **failed/incomplete capture**, not zero traffic. Profile collection can
replay kernels, perturb caches, and change observed durations.

The output directory must not preexist. It records original command line,
stdout, stderr, process exit code and a SHA-256 manifest. Profiling cannot
start without `--execute`.

## Gate 2: reject incomplete, mixed and forged-looking data

```bash
python3 tools/summarize_gather_ncu_series.py \
  --series /tmp/gather-ncu-001 \
  --output /tmp/gather-ncu-comparison.json
```

This parser requires CSV rows attributable to a **single gather launch** in
each stride file; it rejects malformed counts, duplicate rows, inconsistent
binary paths, swapped stride arguments, tampered output and missing requested
metrics. The comparison includes source-derived 32B region counts
(4/16/32 for source, all 4 for output) next to **operator-reported**, still
unverified Nsight values. Source regions are not predicted HBM transactions.

The resulting `classification` is always `REPORTED_UNVERIFIED`, and
`hardware_attested` remains `false`. It does not claim per-lane physical
movement, an exact cache path, or kernel duration. Independent H100
replication and controlled warm/cold cache studies are still required.

## Critical experimental limitation

The original `gather<<<1,32>>>` is only **one warp** on **one SM**. It can
test the relationship between addresses and memory counters, but it is NOT
a robust throughput/latency benchmark for 132-SM H100 SXM. For a future
performance study, create a separate multi-CTA benchmark with explicit warmup,
multiple timed runs and per-experiment repeatability/variance.

## No-GPU regression

```bash
python3 -m unittest discover -s tests -p test_gather_ncu_comparison.py -v
```

These tests use synthetic CSV; their fake metrics are intentionally not
published as real measurements.
