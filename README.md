# GPU Uncooked

**Reverse-engineering GPU performance, one bottleneck at a time.**

> From a busy restaurant to the silicon, from intuitive stories to falsifiable experiments.

GPU Uncooked is an **open, experiment-driven GPU systems fieldbook**. We explain computing systems with a kitchen metaphor, test the explanations on real hardware, and turn measured bottlenecks into kernel improvements and architecture questions.

Our starting hardware: **six NVIDIA RTX 4090 GPUs and access to NVIDIA A100 hardware**. The physical topology, A100 SKU/count, software stack, and access rights are **not yet verified**. No benchmark numbers are claimed until raw measurements exist.

## The idea

A restaurant can hire 1,000 cooks and still serve meals slowly if ingredients arrive through one narrow door. GPUs face an analogous problem: adding arithmetic capacity does not guarantee faster programs. Bandwidth, locality, parallelism, scheduling, and communication determine actual throughput.

**But analogies are hypotheses, not measurements.** Each episode must show where the kitchen model works, where it fails, and what a profiler or benchmark reveals.

## Four loops

| Loop | Question | Public artifact |
| --- | --- | --- |
| **Explain** | What is the intuitive model? | One accessible story + diagram |
| **Measure** | Does it survive real hardware? | Reproducible experiment + raw receipt |
| **Improve** | Can we remove the bottleneck? | Correctness-tested optimization + before/after |
| **Predict** | What architecture trade-off follows? | Falsifiable architecture note |

## Season 01 — The GPU Kitchen

| Episode | Kitchen question | Technical subject | Evidence |
| --- | --- | --- | --- |
| 00 | What kitchen do we actually own? | Hardware inventory, topology, driver, clocks | Pending |
| 01 | Why don't 1,000 cooks help? | Roofline, arithmetic intensity, bandwidth ceiling | Pending |
| 02 | Why is walking to the pantry expensive? | Registers, L1/L2, global memory, coalescing | Pending |
| 03 | Why do cooks work in squads? | Warp, SIMT, occupancy, divergence | Pending |
| 04 | Why install a specialized oven? | GEMM, Tensor Cores, precision and accuracy | Pending |
| 05 | Why are six kitchens not one giant kitchen? | PCIe, NCCL, all-reduce, scaling efficiency | Pending |
| 06 | Why does dinner rush change everything? | LLM prefill/decode, batching, KV cache | Pending |
| 07 | When should we rebuild the restaurant? | Architecture choices, system bottlenecks | Pending |

An episode is **not done** until the experiment and explanation agree, or the disagreement is documented.

## Start here

1. Read [the research charter](docs/RESEARCH_CHARTER.md) and [evidence protocol](docs/EVIDENCE_PROTOCOL.md).
2. Read [the first experimental campaign](campaigns/4090-vs-a100.md).
3. Capture machine inventory **before** running any load.
4. Run one isolated GPU experiment on an approved maintenance window; then validate on the other architecture.
5. Publish a reproducible result, including any failures or deviations from the prediction.

### Minimum inventory commands (read-only)

```bash
nvidia-smi -L
nvidia-smi topo -m
nvidia-smi --query-gpu=index,name,uuid,memory.total,driver_version,pci.bus_id,power.limit --format=csv
```

Do not assume six 4090 cards are in a single host; **RTX 4090 has no NVLink**. Do not assume an A100 SKU or NVLink topology. Always verify real connectivity, workloads on shared hosts, power limits and container isolation first.

## What this project is not

- Not another GPU glossary or an unverified NVIDIA strategy essay.
- Not a benchmark leaderboard with mismatched software versions.
- Not a claim to have reverse-engineered proprietary silicon.
- Not a collection of synthetic wins without end-to-end application impact.
- Not an invitation to saturate shared machines without operator approval.

## Evidence status

**Published real GPU measurements: none yet.** Any simulation is prominently identified as simulation; CI unit tests are not GPU performance evidence. Every future performance claim must include the machine profile, commands, source commit, raw results, statistical method, correctness checks, and limitations.

## Research questions

- When does a single RTX 4090 outperform or underperform A100 for an *identical, supported* workload and precision?
- What fraction of a kernel's time is arithmetic vs movement and synchronization?
- How does effective throughput change across 1 / 2 / 4 / 6 RTX 4090s under data, tensor, and pipeline parallelism?
- Under which traffic regimes do inference optimizations reduce **end-to-end** latency and cost?
- Which architecture changes follow from these bottlenecks, and what evidence would disprove them?

## Contribute

Start with a reproducible experiment, a counterexample, a correctness bug, or a well-supported architectural explanation. Negative results are welcome when reproducible. See the [evidence protocol](docs/EVIDENCE_PROTOCOL.md).

---
**One question. One experiment. One receipt. One stronger mental model.**
