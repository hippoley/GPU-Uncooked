# Chapter 03 · Memory Coalescing

**State: Source available, no CUDA compile or GPU hardware measurement completed.**

## Why this is an actual GPU topic

An NVIDIA warp includes 32 lanes. If each lane loads one 4-byte float and the 32 consecutive addresses are aligned, a simplified **32-byte address sector model** reports four unique sectors (128 useful bytes / 128 covered bytes). If the warp starts one float later, it touches five sectors. For stride 2, eight sectors; for stride >= 8, usually 32, given the aligned address pattern modeled.

This is **not a prediction of the exact number of physical memory transactions**. Real GPUs use caches, sector requests, request merging, multiple instructions, replay, and scheduling that vary by GPU generation and workload. Reuse across warps can make actual bandwidth different from this per-warp example.

## Browser game and interactive lab

Open `playground/chapters/03-memory-coalescing/index.html` through a local HTTP server. Predict unique sectors; click individual lane IDs to reveal byte addresses, sectors and the CUDA source indexing formula. The "sector coverage" percentage is a footprint ratio, not hardware cache efficiency.

## Gate 0 — hardware and permission

Record `nvidia-smi -L`, `nvidia-smi topo -m`, software versions, current workloads and approval to use the GPU. Select an idle card and approved window; run only on that card.

## Single-GPU correctness and illustrative timing

RTX 4090:

```bash
nvcc -O3 -std=c++17 -arch=sm_89 -o ch03 experiments/ch03_memory_coalescing.cu
./ch03 --device 0 | tee ch03-4090.jsonl
```

A100:

```bash
nvcc -O3 -std=c++17 -arch=sm_80 -o ch03 experiments/ch03_memory_coalescing.cu
./ch03 --device 0 | tee ch03-a100.jsonl
```

The kernel reads input element `i * stride` and writes output element `i`. It checks **every one of 1,048,576 outputs** against a CPU reference, warms up, then times 30 launches with CUDA events. Reports mean time and a *useful bytes* rate; the latter is not measured DRAM traffic and cannot be compared directly to peak memory bandwidth. About 64 MiB of source input and 4 MiB of output are allocated, in addition to host buffers.

## What does NOT count as proof

- A correct browser sector count does not establish performance.
- One timed run per stride is not a statistically reliable GPU benchmark.
- Comparing different CUDA/NVIDIA driver, clocks, cache conditions or GPU SKUs without metadata is inconclusive.
- A lower throughput for stride 8 does not prove a particular DRAM transaction count.

## Evidence required for verification

Capture several independent repetitions, median and distribution, PCIe/NUMA and device inventory, compile commands and source SHA, correctness, Nsight Compute sector/cache counters (where supported), a compiled code inspection if optimizing, and a written explanation of disagreements with the teaching model. Measure application-level impact before calling an optimization beneficial.
