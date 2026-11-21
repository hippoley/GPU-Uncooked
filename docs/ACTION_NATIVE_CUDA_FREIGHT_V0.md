# GPU Uncooked · Action-Native CUDA Physics — Freight District v0

**Product purpose:** transferable computation intuition, not a GPU-themed quiz. A player acts on a simulated world's physical shipping manifest, sees the resulting resource cost, changes strategy and completes an action loop. Only afterward is the result mapped to CUDA. This is one playable proof of the *global structural mapping* concept; it does not yet establish that all six games share the same physics or that players transfer learning to new challenges.

## Story and full user story

**I am an untrained player** entering a neon city port. I have 128 cargo requests to fulfill across four convoys. Each convoy has 32 slots. My shipping network tolerates at most 40 distinct 32-byte-aligned sectors' worth of requests across these convoy dispatches. Initial packing mixes distant addresses. I can click two crates to swap positions, use the logistical "repack by address" button (with a game-only setup fee), or send the fleet unchanged. If I exceed the budget I fail and can retry without forfeiting already earned credits. A successful run advances to a second and third order. When I finish all three, the city remembers my completed delivery and I can open the actual CUDA experiment.

## Causal invariant

\`address = index * 4\` bytes; \`sector = floor(address / 32)\`.
Each of four dispatch waves represents the 32 lanes in one *hypothetical* warp-sized request batch. Count distinct sector IDs **within each wave**, then add the four sector counts. This is a conceptual measurement of demand, **not a claim about DRAM requests, achieved global-memory throughput or speedup**.

- 128 unique 4-byte addresses = **512 bytes requested**.
- Four contiguous groups of 32 addresses = **4 sectors per wave × 4 = 16 sectors**, or 512 bytes sector coverage.
- Striped loading \`request[wave*32+lane] = lane*4+wave\` = **16 sectors per wave × 4 = 64 sectors**, or 2,048 bytes sector coverage.
- Budget = 40 sectors. Poor grouping fails; physically reassigning cargo to contiguous requests succeeds.
- Repacking costs 8 game credits and lane swapping is free. No claim is made that CPU sorting is free or that real hardware always prefers sorted access after including preprocessing costs.

The user should be able to anticipate that an *unseen* shuffled request distribution may be improved by grouping, and should also learn that real CUDA hardware must still be measured.

## Artifact layout

- \`playground/freight/physics.mjs\`: pure deterministic address grouping, manifest permutation, sector count, budget and contract scoring
- \`playground/freight/index.html\`: original cinematic port mission and responsive visual interface
- \`playground/freight/game.mjs\`: clickable cargo slot swaps, regrouping, traffic animation, three contracts, restart and completion credit
- \`playground/freight/cuda/dispatch.cu\`: real CUDA gather kernel with four 32-thread blocks, stripe/packed variants, CPU expected-value verification and no GPU timing claims
- \`tests/freight-physics.test.mjs\`: arithmetic and invariant regressions
- \`tests/browser-acceptance.mjs\`: actual Chrome first failure → regroup → three successful dispatches → persistent receipt, desktop and phone
- \`playground/city3d/main.mjs\`: discoverable Freight District mission and local completion recognition
- \`playground/chapters/index.html\`: direct mission entry and separately accessible existing lab

## CUDA truth boundary

The game uses *one simple coalescing model*: unique 32B-aligned sectors per warp-sized group of 4B scalar load requests. Real GPUs also have caches, instruction formation, predicates, loads across different memory systems, alignment rules, compiler optimizations, and latency hiding. Two addresses touching the same sector does not in general imply an identical number of DRAM transactions. The CUDA demo is primarily **correctness evidence**. No hardware measurements have been performed.

To reproduce the correctness test on a CUDA host:
\`nvcc -O2 -std=c++17 playground/freight/cuda/dispatch.cu -o freight-dispatch && ./freight-dispatch\`

Expected text labels include \`striped: correct=128/128, teaching-model sectors=64\` and \`packed: correct=128/128, teaching-model sectors=16\`. These are software-model counts printed by the test program. Do not describe them as hardware profiler counters.

## Next product-quality acceptance gates

1. Verify that manual swaps genuinely change some wave's sector count, not just visually moving colored crates.
2. Complete the entire quest from 3D city through mission to CUDA lab, verify local storage receipt when returning to the city.
3. Replace tutorial cues with player-driven exploration, time pressure and physically grounded tradeoffs after the basic deterministic story is sound.
4. Test transfer: after completing the game, give the player a previously unseen index pattern and ask them to predict and optimize it without leading prompts.
5. Record actual GPU hardware metadata, correct CUDA results and profiler counters before making any performance claims.
6. Evaluate scene readability and real-GPU frame times separately from browser CI; synthetic gameplay score and software-renderer FPS do not measure real CUDA throughput.

**Current claim:** first action → computation consequence → success/failure → replay → next contract → city continuity loop has been implemented in code, with unit and browser CI as separate evidence gates. Not a completed six-game globally affine system.
