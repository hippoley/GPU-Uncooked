# Silicon City · Free-Roam Mission Hub (vertical slice)

**Scope:** Original 2D city hub for CUDA Arcade. This is a walkable mission-selection experience, NOT an open-world GTA clone.

## Player story and acceptance

The player lands in a neon city at night, takes control of an original courier, walks between six marked districts, approaches a glowing marker and presses **E** or the mobile **Interact** button. The mission dossier opens with the activity name, status and grounded destination.

| District | Current action |
|---|---|
| Thread Factory | Open existing Grid / Block / Thread lab |
| Warp Rush | Open existing Warp/SIMT lab |
| Memory Abyss | Enter already playable original underwater game |
| Cache Castle | Show honest in-development dossier |
| Tensor Forge | Show honest in-development dossier |
| Cluster Command | Show honest in-development dossier |

All links are local relative URLs to the existing static web app, so GitHub Pages can host the hub under a repository path. No external media or tracking dependencies.

## Controls / UX

- Keyboard WASD / arrows move the player, normalized diagonal speed.
- E interacts only when within 78 logical world units of a district marker.
- ESC dismisses mission dossier.
- Touch directional buttons use pointer capture and pointer-up/cancel cleanup. Touch Interact opens the current nearby mission.
- Controls and markup support keyboard focus and UI status. A first-run overlay explains the rules.
- The city is a fixed-camera 960×540 scene with responsive scaling, not yet a scrolling or streaming 3D metropolis.

## Creative treatment

Warm sunset / magenta neon / street reflections, original buildings and courier character, independent color-coded districts. Broad urban cinema feeling only: no GTA IP, characters, missions, radio or copied map assets. Current Canvas renderer is a handcrafted **prototype**, not commercial concept-art quality.

## Engineering contracts

- `playground/city/model.mjs`: deterministic district list, movement boundaries, normalized diagonal movement, proximity gating and link status.
- `playground/city/main.mjs`: independent browser rendering, interaction, keyboard/touch handling and mission UI.
- `tests/city-model.test.mjs`: pure model checks.
- `tests/browser-acceptance.mjs`: navigate from initial overlay, move to Thread Factory, open and dismiss dossier, verify destination and take desktop/mobile screenshots.

## Remaining acceptance gaps

An automated movement/dossier smoke test is not proof that the game is entertaining. Full human keyboard/mobile experience, menu aesthetics, target selection discoverability, load/performance on low-end mobile, and accessible screen-reader alternatives remain to be reviewed. The existing Memory Abyss CUDA evidence boundary remains unchanged: conceptual models are not actual GPU profiling.

GitHub Pages still requires successful deployment and explicit public HTTP verification before announcing a playable URL.
