# Silicon City 3D · first WebGL vertical slice

## What changed

This is a **true Three.js/WebGL perspective world**, not the preceding 2D canvas map. It has a third-person player and tracking perspective camera, 3D buildings with facade geometry, night street lighting, traffic, pedestrians, animated mission beacons, shadows and a distance-gated entrance into the existing GPU Uncooked arcade games/labs.

- Entry: `playground/city3d/index.html`
- Renderer/geometry: `playground/city3d/world.mjs`
- Controls/camera/mission cards: `playground/city3d/main.mjs`
- Pure traversal/mission state: `playground/city3d/logic.mjs`
- Unit acceptance: `tests/city3d-model.test.mjs`
- Browser acceptance: `tests/browser-acceptance.mjs` (must initialize WebGL before claiming success)

## Controls

- WASD or arrows walk (world-aligned in this first build).
- Drag mouse to orbit the third-person camera, or tap the camera control on touch devices.
- E or the touch mission button to interact when in range of a marker.
- Escape closes an open mission card.
- Six mission portals: Memory Abyss playable 2D arcade; Thread Factory/Warp Rush are existing labs only; Cache Castle, Tensor Forge and Cluster Command are clearly future projects.

## Architecture and runtime limitations

The page uses **Three.js v0.170.0**, pinned to a CDN ESM import map. To load it, the browser must support WebGL and access jsDelivr. A broken CDN or unsupported WebGL engine intentionally shows an explicit error overlay. No frame-rate evidence or device-quality promise is inferred from simulated traffic or Node tests.

The city is a handcrafted, finite 3D plaza. It is **not GTA VI-equivalent in realism, assets, animation, vehicles, combat, NPC AI or open-world scale**. This release does not add driving or weapon controls. No official GTA media, character models, locations or artwork were used.

## Required next gates

1. Verify real Chromium initialization on desktop and phone; collect screenshots, frame rate and browser console errors.
2. Validate collision and reachable pathing before expanding the street network. Current boundaries and mission distance checks do not implement full physics collision with meshes.
3. Move Three.js from CDN to a reproducible vendored/build artifact for offline and deterministic deployment.
4. Build original high-quality PBR models, road materials, character rig/animations, soundscape and lighting. Preserve an early lower-fidelity fallback mode.
5. Confirm public Pages readiness through successful GitHub Actions deployment and live HTTP validation. As of this branch, public deployment has not been verified.

The main branch is not modified; work remains in PR #2 until acceptance.
