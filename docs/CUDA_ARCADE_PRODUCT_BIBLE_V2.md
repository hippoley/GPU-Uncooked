# GPU Uncooked 2.0 — CUDA Arcade Product Bible

**Product decision:** Option B — **one distinct game + one interactive CUDA laboratory per chapter**.  
**Edition:** Design baseline v2.0 · 2026-11-21  
**Current evidence:** Existing chapters 01–03 are browser prototypes, not shipped games. Chapter 03 Memory Abyss has a playable original dive loop and smoke-tested desktop/mobile controls, but not commercial-quality art or validated player retention. No 4090/A100 claims without actual receipts. PR #2 remains Draft; Pages remains unverified.

## 1. Player promise

> *A collection of games you would play even if CUDA did not exist; the reward is that playing teaches how GPUs actually work.*

Three simultaneous success criteria:
1. **Game:** a first-time visitor can understand the goal within 15 seconds, act within 30 seconds, experience tension / mastery / reward, and voluntarily retry.
2. **Learning:** a player can predict or explain a concrete CUDA mechanism using transferable mental models rather than just memorizing labels.
3. **Proof:** a runnable code example, a correctness test and a separately recorded **hardware measurement**, where applicable. Never equate invented game scores with GPU performance.

The games and labs are separate surfaces and may be visited in either order. Do not interrupt exploration with compulsory multiple-choice exercises.

## 2. Architecture — one connected arcade, six truly different games

| Chapter | Distinct game | Actual player verbs | Core mechanism | Interactive laboratory | Status |
|---|---|---|---|---|---|
| 01 Thread Factory | automation / logistics puzzle | place, batch, route, optimize | Grid / Block / Thread / indexing and guards | launch grid explorer + real vector-add CUDA source | Legacy puzzle+lab only; new game NOT built |
| 02 Warp Rush | 32-lane rhythmic action | synchronize, split, rejoin, dodge | Warp SIMT and branch divergence | lane mask / instruction path explorer + compiled code review | Legacy puzzle+lab only; new game NOT built |
| 03 Memory Abyss | underwater extraction adventure | dive, collect, pulse, evade, extract, upgrade | global-memory address locality / 32-byte sector teaching model | address + sector explorer and strided gather CUDA experiment | Existing original arcade prototype + earlier lab; requires full playthrough & art |
| 04 Cache Castle | tower defense / capacity strategy | allocate, evict, preload, reuse | register/shared/cache hierarchy; reuse and synchronization | tiled matrix access explorer; occupancy/resource limits | Planned |
| 05 Tensor Forge | pattern-matching / manufacturing puzzle | tile, fuse, chain, upgrade | GEMM tiles / tensor arithmetic / throughput constraints | tiled matmul comparisons; numerical accuracy | Planned |
| 06 Cluster Command | tactical logistics / real-time strategy | partition, route, balance, synchronize | multi-GPU communication and topology | PCIe/NVLink/NCCL topology & measured collective ops | Planned |

### Creative constraints

- Each game must have a distinct **primary action verb**, failure condition, reward loop, character silhouette, musical rhythm, camera grammar and color identity.
- Shared arcade shell covers navigation, progress, collectibles, achievements and optional learning dossier; **not shared gameplay**.
- No unlicensed recreation of Dave the Diver characters, scenes, sprites or sounds. Its high-level exploration/management loop is one point of reference only.
- Each chapter's learning is **causal**: changing a GPU-related choice alters the game state in a grounded, understandable way.
- Do not depict a warp as exactly 32 physical execution units, a branch as necessarily taking 2x time, a sector count as DRAM transactions, or a CUDA timing proxy as real benchmark evidence.

## 3. Player journey

**Arcade lobby** (curiosity + strong key art) → **game** (no intrusive teaching) → **result / replay hook** (fail / improve / retry) → **CUDA Lab** (what mechanic did I just experience?) → **reproducible kernel** (CPU reference, GPU correctness, profiler) → **passport stamp** (unlocks next chapter, with all labs openly accessible).

Each game target: 3–8 minutes to first meaningful completion, 1 memorable discovery, at least 1 upgrade or strategic alternative, and one reason to retry. These are targets, not currently verified metrics.

## 4. Signature loops

### 01 — Thread Factory

Goal: cover all numbered data orders exactly once. Players drag robot squads into blocks and choose a batch size. Excess robots encounter guarded lanes, and too few blocks leave unfinished work. Later levels introduce 2D indexing. **Do not suggest game batch placement is literal GPU SM scheduling.**

### 02 — Warp Rush

Goal: get 32 synchronized runners through an obstacle concert. Lanes can branch; regrouping and coordinated timing matter. Costs are explicitly a conceptual scheduling model; the lab inspects optimized compiler output before any runtime claim.

### 03 — Memory Abyss

Goal: enter a beautiful data-ruin biome, recover a chosen set of address-indexed crystals, and return before oxygen runs out. Coalesced vs scattered layouts alter **game locality reward**, not represented as measured global-memory throughput. Rare artifact discovery, rising hazards, risky pulse and equipment upgrades form one loop. The current canvas visuals are prototype-quality and must not be promoted as final pixel art.

### 04 — Cache Castle

Goal: defend gates using a tiny fast staging area. Players choose data reuse vs frequent loads. The lab demonstrates access patterns and shared-memory tiling; capacity rules reflect specific declared toy budgets, not hardware cache policy prediction.

### 05 — Tensor Forge

Goal: assemble matrix tiles and trigger multiplications to satisfy constraints. Different tile geometries and precision choices have different gameplay utility; the lab uses correctness tolerance and Tensor Core availability evidence.

### 06 — Cluster Command

Goal: split a computation across island bases and route transfers. Network bottlenecks and communication cycles constrain victory. Lab runs only on approved multiple-GPU hosts, records topology and avoids claiming NVLink on RTX 4090.

## 5. Visual language system

A consistent **GPU UNCOOKED** logo and collectible "Silicon Passport"; otherwise varied artistic worlds:
- Factory: candy-industrial orange, rounded robots, machinery motion, tactile switches.
- Rush: violet/magenta, high-contrast rhythm lines, sharp lane silhouettes.
- Abyss: teal/cobalt bioluminescence, luminous coral, rounded adventure character, foreground/depth atmosphere.
- Castle: emerald/gold, readable top-down defense tiles, miniature fortress silhouettes.
- Forge: molten amber + electric purple, resonant tile-matching action.
- Command: ink blue / cool white stellar maps, precise tactical communication trails.

Art quality gate: animation-ready **original spritesheet assets**, purposeful parallax layers, readable hit feedback, unique enemy silhouettes, UI typography and accessibility review. A generated poster is not a game screenshot and does not count as a shipped asset.

## 6. Reusable technical contracts

Each episode folder should eventually contain:
```
episodes/<id>/
  GAME.md                 # verbs, objective, win/lose, replay hook
  lab/                    # interactive model and assumptions
  cuda/                   # correct reference kernel, compile commands
  evidence/README.md      # EMPTY / measured / reviewed classification
  playtest/README.md      # observed first-play outcomes
```
Browser stack stays framework-free until a reason to adopt a game engine emerges. Separation of renderer, game mechanics and pedagogical models is mandatory. Static web builds must be usable with no GPU and no account.

## 7. Acceptance gates, not vanity metrics

**Game acceptance:** external first-play session, observed task comprehension, first meaningful success, failure/retry, keyboard and touch controls, screenshot/video critique and no critical crashes.

**Learning acceptance:** pre/post prediction using a changed instance (not rehearsed answer); player can correctly explain the conceptual boundary.

**Technical acceptance:** headless browser checks, unit tests, correct CUDA outputs compared with CPU, recorded GPU architecture/compiler/driver metadata, independently repeatable timings, profiler counters if claims require them.

**Commercial/viral hypotheses** (not claims): 10+ unsolicited shares, players voluntarily replay, programmers link the reproducibility protocol, learners advance to second chapter. Measure rather than assume these will occur.

## 8. Immediate release plan

**P0:** Publish a redesigned playable arcade lobby honestly marking prototypes vs plans. Maintain direct access to working Chapter 01–03 labs and Memory Abyss.
**P1:** Turn Memory Abyss into a great 3-minute vertical slice (complete end-to-end playthrough, polished original sprite assets, coherent risk/reward and real external testing).
**P2:** Prototype Thread Factory as a genuinely distinct automation puzzle with 5 authored levels and its own lab.
**P3:** Prototype Warp Rush as a genuinely distinct action rhythm game. After three playable mechanics, review whether this concept merits a public launch.
**P4:** Add 4090/A100 measured evidence independently; do not block accessible gameplay while hardware is unavailable.

## 9. Hard prohibitions

No new game chapters that are just renamed sliders. No fake GPU numbers. No claim that browser tests imply engaging gameplay. No copying of existing game's visual IP. No silent overwrite of prior working prototypes; preserve links for comparison. Do not announce a Pages URL before a successful deploy and HTTP verification.

## 10. Art-direction amendment — Neon Metro Crime-Cinema (2026-11-21)

User-selected visual reference: the **cinematic color, environmental density and open-city swagger** associated with GTA VI, not the copyrighted title's assets, cast, logos, map, locations or UI. Independent visual identity: **GPU UNCOOKED — SILICON CITY**. Inspiration is limited to broad creative traits: warm sunset gradients, cyan/magenta neon reflections, palm/circuit silhouettes, dramatic street-level camera, sharply composed title cards, high-density city worlds, urban culture and playful satirical micro-stories. Do not use Rockstar marketing screenshots or GTA assets in distributed product.

### Hub art direction
- Name: SILICON CITY / THE SIX DISTRICTS. Arcade entry is an explorable metropolitan map *in future*, with a cinematic mission-select landing page now.
- Hero: violet dusk sky to electric coral dusk; glassy floodlit skyline; one original roofline/circuit-road silhouette and luminous UI overlays. Logo is GPU UNCOOKED, not GTA typography or mark.
- Genre-specific districts: Thread Factory — freight/warehouse quarter; Warp Rush — nightlife raceway; Memory Abyss — flooded neon marina; Cache Castle — finance and cloud datacenter district; Tensor Forge — molten industrial foundry; Cluster Command — spaceport/network interchange.
- Typography: large editorial condensed headlines, small functional modern techno labels. High contrast for legibility, reduced motion option, mobile-first card composition.
- Shot grammar: cinematic wide establishing frame, grounded physical space, foreground props, readable players and urban ambient storytelling; **no mandatory pixel-art uniformity**. Individual game genres may be 2D/2.5D/3D as practical.
- Interaction: each entry card is a mission dossier with *PLAY* only when a game exists; *LAB* for existing experiments; and *IN DEVELOPMENT* for otherwise planned chapters.

### Product boundary
Do not promise GTA-like open-world scope. This is a curated game anthology. No unlicensed copy of brand marks, Lucia/Jason, official loading art, Vice City, specific map geometry, radio songs, character likenesses or mission sequences. The goal is a high-quality **original** metropolitan cinematic atmosphere.
