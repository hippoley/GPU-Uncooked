# GPU Uncooked · City-Native CUDA World State v1

## Implemented user story

The player walks from the Silicon City spawn to a physical terminal beside the Thread Factory at (-34,-26). When physically close, the **R / 整理货物** operation becomes active. Each intentional press selects a still-improvable cargo sector, calls the same `freight/physics.mjs` used by the standalone Freight game, and updates a persistent world state. No artificial timer or fictional throughput multiplier affects the result.

The scene-mounted freight prop responds to the four actual warp-sized request footprints. Its cargo stacks and beacon change as those footprints decrease. When total distinct 32-byte sector demand falls to the teaching budget (40), the machinery becomes operational.

Press **X / 计算透视** to inspect each of four 32-lane groups, each lane's `float` index, corresponding sector, byte coverage and the original CUDA gather expression. The log shows exactly which action changed which metric. Reloading reconstructs state by deterministically replaying each saved action; invalid or inconsistent receipts reset to the initial state.

For quick acceptance, open `?spawn=freight&quality=low` to start beside the same *real 3D terminal*; regular play starts in the central city and requires walking there.

## Architecture

```
player enters physical radius (x=-34,z=-26)
   ↓
player presses R
   ↓
GPUWorldState.applyWorldAction(CONSOLIDATE_SECTOR, slot)
   ↓
freight/physics.mjs — same tested coalescing model
   ├── worldEvidence / 4×32 lane traces
   ├── visual freight stage / actual stack size + beacon
   ├── X-Ray: lane → index → 32B sector, one shared source of truth
   └── versioned action journal in localStorage
          ↓
     replayWorld(events) after navigation / reload
```

## Invariants to preserve

- Exactly 128 addresses remain present and unique through all cargo regroupings.
- Each city action is initiated by a real player event; no engine-side automatic completion.
- Every accepted regroup action must reduce the teaching-model sector count; the city never asserts invented hardware FPS or global memory transaction counters.
- 32-byte footprint is a simplified assumption appropriate for this fixed 4-byte / 32-lane illustrative scenario. Sector coverage **is not** elapsed CUDA time, achieved memory throughput or profiler DRAM transactions.
- Terminal operation is gated by world position, not by proximity to an HTML overlay.
- Local storage is an unsigned, **client-side progress journal**, not a security-proof or externally verified achievement.

## Acceptance

`tests/city3d-gpu-world-state.test.mjs` verifies deterministic actions, monotonic sector improvement, same physics as Freight, successful budget recovery, reset, event replay and the spatial radius.

`tests/city3d-bundle-smoke.mjs` additionally loads the self-contained Three.js entry in real Chromium, verifies proximity gating, opens X-Ray, sees 32 lane address cells, switches between warp-sized request groups, deliberately presses the 3D street terminal button until success, checks persistent sector receipts, reloads to reconstruct the same computed state, then resets.

All final screenshots and artifact bytes must come from successful CI; unit success alone is not complete browser success.

## What is not yet implemented

- Raycast picking, dragging, lifting, physically animated cargo and a fully 3D inventory operation; contextual R input is only the first step.
- A complete unified simulation of Warp Divergence, Shared Memory, Tensor Core, Occupancy, synchronization, Streams and the other teaching districts.
- Real NVIDIA GPU measurement, PTX/SASS observability or Nsight Compute instrumentation.
- A completed AAA-quality visual world; this milestone makes the existing city *causally interactive* rather than claiming photorealism.

## Next falsifiable milestone

Carry the same mission manifest from Thread Factory into Warp Rush and Cache Castle, with two new independent cost models and a shared task ID. The player must predict whether a change to memory layout still helps when divergent control flow or limited local storage becomes the dominant bottleneck. The result must be tested through a proper executable CUDA kernel on specified hardware before making a performance claim.
