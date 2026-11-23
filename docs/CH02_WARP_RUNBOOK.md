# Chapter 02 · Warp divergence experiment

**Status:** source available; CUDA compilation, Nsight profiling and device measurements not verified.

## Reader experience
Play [Chapter 02](../playground/chapters/02-warp-divergence/index.html): switch the choices of 32 lanes; inspect two path masks; guess how many nonempty paths execute. The game uses an equal-work **lane-utilization proxy**, not real cycles or execution latency.

## Why the analogy fails
CUDA warp divergence can reduce SIMD/SIMT efficiency, but a conditional branch is not necessarily lowered to two serialized instruction streams. The compiler may simplify, predicate, or remove it, and Volta+ GPUs use independent thread scheduling. Execution count, instruction throughput and total kernel time require compiled-code and profiler evidence. "Two paths" does **not** mean "2x slower."

## Real GPU first step (authorized, single-device only)
On an approved RTX 4090 machine:
```bash
nvcc -O3 -std=c++17 -arch=sm_89 -o ch02 experiments/ch02_warp_divergence.cu
./ch02 --device 0
```
On A100, compile with `-arch=sm_80` instead.

The program checks all 1,048,576 output values for uniform, half/half, and alternating patterns. It intentionally does **not** claim speedups. Before making performance claims, capture compiler/PTX/SASS, Nsight Compute metrics, device metadata, repeated timings and numerical correctness. To measure *actual* branch divergence, design a benchmark whose differing branch bodies cannot be optimized into trivial predicated operations, verify that from the generated instructions, and document remaining confounders.

## Acceptance
- Browser game supports presets, lane switches, path masks, challenges and keyboard focus.
- Node tests cover edge cases of mask and path count.
- GPU evidence status remains **not measured**.
