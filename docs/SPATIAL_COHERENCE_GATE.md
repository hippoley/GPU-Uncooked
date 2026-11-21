# Silicon City · Spatial Coherence / Visual Quality Gate

## Source of direction

Fei-Fei Li, *To Seek a Newer World* (2026-09-28), https://drfeifei.substack.com/p/worldlabs-joining-amd. The original describes models of the structure and behavior of physical environments, including Atlas next-view prediction and multi-view geometry. These are guiding research problems, **not** evidence that this repository runs Atlas, 3D Gaussian Splatting, generative view prediction or a learned world model.

## Real implementation in this PR

The existing city had world-coordinate buildings and procedural texture patterns, but faces were mostly planar and near windows were repeated shallow rectangles. To restore plausible views around the same building, `coherence.mjs` now creates **actual camera-independent geometry** for six buildings:

- Recessed glazing framed by jambs and lintels, preserving occlusion when viewed obliquely;
- Physical balcony slabs, side balusters and, on selected buildings, staggered emergency stairs;
- Vertical drains, raised roof parapets and utility objects as distinct geometry;
- One deterministic scene seed and quality tiers that change density without moving the spatial anchors;
- Instanced window panels, frames and balconies, with extra geometry accounted in WebGL diagnostics.

The existing `corner.mjs` continues to build shopfront props, rain canopies, lit signage and interior shelf depth.

## What this is not

It is **not** learned 3D reconstruction, 3DGS, Atlas model integration, physical simulation of a full city, ray-traced GTA VI rendering, or photorealistic characters. Geometry from different viewpoints stays consistent because we explicitly construct it; it does not demonstrate neural next-view prediction. The overall environment still needs authored materials, calibrated lighting, natural actors, accurate physics and real-device performance profiling.

## Evidence gates

1. `tests/city3d-coherence.test.mjs`: inspect building footprints, face directions, deterministic window plans, tier-invariant positions.
2. `tests/city3d-bundle-smoke.mjs`: load self-contained HTML with real Three.js in headless Chromium; require >40 spatially placed windows, multiple batches, nonzero WebGL triangles and bounded draw calls.
3. Save two browser captures of the **same world** in third person and first person without resetting geometry or generating a different scene.
4. Keep Brotli bundle including Three.js under the 1.4MB entry constraint and record the full compressed measurement rather than only our own source bytes.
5. Human visual QA: compare genuine close-up screenshots against a fixed AAA-style reference frame. Look specifically for cardboard storefronts, implausible reflections, incorrect scale, motion/occlusion mismatch. A green CI is never visual-parity evidence.

## Hard product decision

Next major quality gain should come from a **hybrid world asset system**: use explicit, testable geometry and physics for collision/doors/interactions; optionally stream **licensed, genuinely detailed visual scene representations** for static far/medium backgrounds. Scene representations could include 3DGS only after verifying license, coverage, memory, occlusion and WebGL/WebGPU compatibility. The 1.4MB self-contained target and remotely streamed high-fidelity world content are *different products*; do not claim both without measuring their separate transfer budgets.
