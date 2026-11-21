# Silicon City · 1.4 MB Perceptual World Runtime

**Experiment status:** A self-contained *3D city entry* is being built and tested; no GTA VI visual parity or FPS result is claimed.

## Why this exists

The target is high perceived cinematic realism per transferred byte, not maximal world size. The authored scene is a finite, rain-wet urban corner. The guiding principle is to spend geometry/material/animation cost where the street-level camera actually sees it. GTA VI is an aspiration for composition and environmental credibility, not a technical claim about renderer parity.

## Current pipeline

```
cornerRecipe(seed, quality)                 pure deterministic street grammar
  ├─ storefront frames / real close-up depth / awning
  ├─ generated shop signage / parallax objects
  ├─ batched bollards, street posts and mullions
  └─ localized color contrast and light
        ↓
createStreetCorner(Three.js)               instanced WebGL geometry
        ↓
createWorld(quality)                      existing city/traffic/rain/mission links
        ↓
tools/build-city3d.mjs                    esbuild bundle, inline Three.js
        ↓
dist/city3d/index.html                    generated self-contained CITY ENTRY
        ↓
city3d-bundle-smoke.mjs                   Chromium: real WebGL and no CDN requests
```

## Two different size measurements

1. **Unbundled first-party source**: `node playground/city3d/size-report.mjs`. This includes `city3d/` HTML/JS modules only; it deliberately **excludes Three.js downloaded from jsDelivr**. An early green CI recorded raw 44,282 B / Brotli 16,804 B / gzip 18,072 B. That is *not* a complete download claim.
2. **Self-contained entry**: `node tools/build-city3d.mjs` (install exact `esbuild@0.25.12` and `three@0.170.0`). This includes the entire Three.js runtime plus city scripts in the resulting `dist/city3d/index.html`, and reports raw, gzip and Brotli byte sizes, capped at 1,400,000 B Brotli. The generated HTML makes no external runtime requests, a property checked in Chromium. The **three other chapter pages and Freight game remain separate URLs** and are not counted toward the city's single-file budget.

For local reproduction:
```sh
npm install --no-save esbuild@0.25.12 three@0.170.0 playwright@1.56.1
node tools/build-city3d.mjs
python3 -m http.server 8765 --bind 127.0.0.1
# in another shell:
node tests/city3d-bundle-smoke.mjs
```

## A fixed visual evidence surface

`playground/city3d/index.html?shot=corner&quality=medium` is a reproducible corner viewpoint, not an AI-generated impression. Its purpose is to make near-camera shop walls, glazing, interior shelves, signs and wet road comparable from one build to another. Standard entry without the query starts at the regular city spawn.

Quality tiers: `low` (10 generated small props/4 panels), `medium` (22/8), `high` (36/12). These are scene-composition density tiers, not yet full dynamic GPU-quality settings. The low tier avoids the translucent-glass material.

## Falsifiable release criteria

- Bundled city HTML must load with no external JS/model/texture requests and render actual nonzero draw calls in headless Chromium.
- True Brotli size must be 1,400,000 bytes or lower **including Three.js**; no claim about other chapters being in that file.
- Exact source revisions and build logs must identify versions and bytes.
- First-person and third-person screenshots must demonstrate that the near-view storefront geometry is at least coherent; screenshot success alone is not evidence of realism.
- Real-GPU hardware measurements with device metadata, 1080p frame time P50/P95 and RAM/VRAM use must precede a 60 FPS desktop claim. Browser CI in software rasterizer cannot establish this.
- Independent human visual reviews should compare actual, unedited in-game screenshots with a fixed reference set and record worst close-ups, not only beauty shots.

## Known limitations

A procedural shop corner does not equal a AAA city. Storefront geometry is still simplified; characters remain basic, driving and pedestrian behavior are placeholders, wet-road reflection is a cheap approximation rather than physically complete path tracing, and the current WebGL scene lacks polished character rigging, detailed traffic behavior and audio. The CUDA games have distinct separate entries. No copyrighted GTA or Saltline assets are reused.
