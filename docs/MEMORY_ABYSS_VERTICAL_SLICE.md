# Memory Abyss · 3-minute first-dive vertical slice

**Status:** the playable scene, story beats and desktop/mobile smoke tests are committed. A human three-minute playtest, pacing measurement, real hardware CUDA runs and public Pages deployment are separate acceptance gates.

## Player promise

An explorer can enjoy the first dive without knowing CUDA. The mission is simple: retrieve eight 4-byte data crystals, use a risky Warp Pulse if necessary, avoid Cache Miss creatures, and return to the extraction platform before oxygen is depleted. Successful extraction unlocks a base choice between contiguous and strided memory layouts.

## Story beats and visible payoff

| Trigger | Player experience | Gameplay effect |
|---|---|---|
| Start | L2 ruins mission and extraction beacon | Clear objective / move and collect |
| First pickup | Nearby addresses are more rewarding | Locality bonus in final settlement |
| 3 pickups or 45 seconds | Cache Miss danger warning | Enemies move 1.5× their initial speed |
| 5 pickups, pulse unused | Warp Pulse prompt | Optional radius collection/stun, costs oxygen, 6s cooldown |
| Pick up rare artifact (crystal 11) | Ancient GPU relic discovery | +120 credits on successful extraction |
| 8 pickups | Return to the surface | Mission finishes only at extraction platform |
| Return | Rank and research reward | Star grade based on remaining oxygen; base upgrades |

The goal is a **three-minute experience**, not an enforced three-minute timer. Measure time-to-first-pickup, first danger, first pulse, first successful extraction, retry rate, and whether users voluntarily dive again. No claim about player enjoyment is supported until external playtesting.

## CUDA truth boundary

Each crystal index models an address in an array of `float` elements. `mission.mjs` reports the number of unique 32-byte aligned sectors touched by the selected indices. This is a teaching model of address locality, not actual GPU global-memory transaction count, cache hierarchy behavior, achieved bandwidth, or a measured memory coalescing speedup. `Warp Pulse` is explicitly a fictional action game mechanic, not a literal NVIDIA instruction.

## Review gates

1. Node tests pass for campaign progression, rare-artifact payout, pulse limits and index footprint.
2. Chromium loads desktop and mobile, starts a dive, consumes oxygen, activates pulse, and captures screenshots.
3. Manually complete the mission to extraction and perform the upgrade/re-dive sequence on keyboard and touch controls.
4. Check legibility and visual quality with actual screenshots, not the generated concept image.
5. Do not merge or advertise a live URL while GitHub Pages deployment remains unverified.
