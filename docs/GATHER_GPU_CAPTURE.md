# CUDA gather — real GPU capture and verification

This is the **first real-device evidence collection entrypoint**, not a remote GPU runner.
The browser still exposes derived addresses and illustrative layout only. Running this
script does **not** upgrade the visualization to hardware-validated.

## Operator-controlled device run

Prerequisites: an operator-authorized NVIDIA GPU, supported driver, CUDA Toolkit
(`nvcc`, `cuobjdump`), and optionally Nsight Compute (`ncu`).
Run on the machine with the actual GPU, outside production load windows.

```bash
nvidia-smi -L
nvidia-smi --query-gpu=uuid,name,compute_cap,driver_version --format=csv,noheader,nounits

# Replace GPU-... with the exact observed GPU UUID; output must NOT already exist.
python3 tools/capture-gather-receipt.py \
  --device GPU-REPLACE_WITH_ACTUAL_UUID \
  --output ./receipts/gather-unique-run-id \
  --execute

python3 tools/verify_gather_receipt.py ./receipts/gather-unique-run-id
```

With operator permission and profiler access, append `--profile`. This runs Nsight
Compute only for stride=8. Do not use it on shared infrastructure without approval.

## Receipt properties

The capture writes the original CUDA source bytes, compile command and diagnostics,
native binary, PTX and SASS dumps, stdout/stderr/exit code for each stride, selected
GPU model and UUID, compiler and tool versions, and SHA-256 file manifest.
The verifier checks integrity, three correctness PASS transcripts, and report
presence when profiling is requested. Raw capture outputs are immutable by
convention; use a new directory each run.

**Important limitations**

- A self-consistent receipt can be fabricated. Its integrity check is **not**
  cryptographic proof of GPU origin, independently witnessed execution, or
  validated profiling methodology.
- The SHA-256 manifest is not a digital signature or independent hardware
  attestation. Retain original archives and independently re-run the experiments.
- The embedded PTX and SASS refer to a compiled binary; this still does not
  reveal a warp's unique physical path through caches or HBM.
- The gather correctness kernel is a tiny teaching workload. Profiling it may
  have high perturbation and insufficient sampling for performance comparisons.
- Nsight availability, permissions, architecture flags and supported counters
  vary by platform. A missing profiler is **unknown**, not a zero-valued metric.
- This first collector does not yet map profiler metrics into the Three.js view.
  It deliberately does not offer a `MEASURED` browser API.

## Offline regression

```bash
python3 -m unittest discover -s tests -p test_gather_receipt.py -v
node --test tests/material-lab.test.mjs tests/material-evidence.test.mjs
```

CI may validate source, JSON receipt shape and anti-tamper behavior without a GPU.
Only a separately witnessed hardware run can satisfy the GPU-specific gates in
`docs/INSIDE_CUDA_1TO1_EVIDENCE_CONTRACT.md`.
