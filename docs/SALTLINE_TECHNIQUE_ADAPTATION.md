# Silicon City — Saltline technique study and procedural realism pass

**Reference inspected:** https://realcodebear.github.io/saltline-fable-5.2/  
**Technical mirror:** https://github.com/realcodebear/saltline-fable-5.2  
**Interpretation:** Saltline is a *single-level rainy container port FPS*, not a full procedural city generator. Its architecture is compelling because it creates material, geometry, weather, lighting and sound by code, and repeats a small vocabulary of objects at scale. Its mirror does not assert a permissive license for adapting the game source. This implementation **does not copy Saltline code, textures, music, logos, or level layout**. It independently implements established procedural-noise and GPU batching techniques.

## Reverse-engineering conclusions

The operative difference is not polygon count. Our previous environment had six abstract boxes with identical flat wall colors, six task markers, sparse street life, and only generic white/red streetlights. The result looked like a VR prototype.

The techniques worth reimplementing in an original urban context are:

1. **Material variation rather than pure flat color.** Generate weathered base-color maps per facade using seeded noise at two physical scales. Stain masks and local color variation help large continuous faces avoid the sterile 'box' look.
2. **Ground condition rather than mirror reflection.** Generate one repeatable street texture and an independent varying roughness field, plus a subtle bump map. 'Wetness' means small roughness and stretched local highlights. Cheap additive glints can strengthen the illusion but should not be advertised as SSR.
3. **Weather is three separate jobs.** Particle rain establishes motion; distance fog creates depth; optionally synthesized sound creates atmosphere. The current pass implements particle rain and distance fog, with audio pending, rather than pretending that a particle layer alone is enough.
4. **Instances for repetition.** Existing window panes use InstancedMesh. New puddle-glint geometry uses the same approach to avoid an additional draw call for each streak.
5. **Bounded, authored space.** A short beautiful urban street with six mission entry locations is more believable than a huge empty terrain. Future expansion should use block grammars, predictable walkway width, realistic facade orientation, collision envelopes and route validation.
6. **Scene composition matters more than raw geometry.** A horizon, fog, intermediate detail, material response and foreground detail establish scale; randomly scattered primitives do not.

## Actual v0.1 implementation

- `playground/city3d/procedural.mjs`
  - `hash2 / noise / fbm`: deterministic, platform-independent scalar value fields
  - `createRoadMaterial`: CanvasTexture base color, grayscale roughness, bump map; 256×256 tile repeated 11×, no external assets, no planar reflection
  - `createFacadeMaterial`: procedural deterministic stain/color mask per building
  - `makeWeather`: one Three.js Points draw call with a capped number of moving rain points
  - `makePuddleGlints`: small batch of ground streaks in two InstancedMeshes
- `playground/city3d/world.mjs`: original urban palette and streets with the new materials and weather
- `tests/city3d-procedural.test.mjs`: noise repeatability, range, continuity and pure Node import

## Accuracy & negatives

- A roughness map and a light streak do **not** implement real screen-space reflections or ray tracing. They approximate wet asphalt's appearance under limited lighting.
- Realism remains bounded by geometry, PBR material detail, physical lighting calibration, scale, character proportions and art direction. Procedural noise alone cannot create a AAA city.
- Browser screenshot success only validates rasterization and basic interactivity. It cannot establish 30/60 FPS on real consumer hardware. Previous CI GPU is software-rendered.
- The scene still uses Three.js 0.170.0 via jsDelivr and requires that module download. Future build should vendor the pinned engine rather than relying on an external CDN.
- No Saltline assets or code are incorporated. All new game assets and logic are independently written.

## Next measurable gates

1. Browser must successfully initialize the WebGL scene and produce desktop and mobile screenshots.
2. Compare old flat materials versus new weathered materials at the same player/camera position; note whether the contrast is noticeable without artificially retouching the screenshots.
3. Validate texture allocation and CPU generation time during startup; if low-power devices struggle, add 128×128 textures and a low-quality weather toggle.
4. Have first-time players identify the walkway, mission entrance and playable versus unavailable districts without explanation.
5. Real graphics validation requires a GPU-enabled test host, not software rasterized CI.

**Release verdict:** a procedural material + atmosphere **technique pass**, not Saltline-parity visual quality and not a GTA VI-level city.

## Follow-up actually implemented

- `playground/city3d/streets.mjs`: an original storefront / curbside / rooftop / overhead-crossing construction grammar. Repeated street posts, rails, utility blocks and vents are InstancedMesh batches; the same modular vocabulary is positioned differently for each district.
- `playground/city3d/index.html` and `main.mjs`: third-person GTA-like overview **and** optional first-person street-level mode (V key or on-screen button), so the user can inspect whether the wet road and building scale survive proximity.
- Browser smoke tests now assert actual WebGL draw calls, triangle counts and multiple generated GPU textures, plus switching both camera modes.
- Original older 2D/2.5D city and existing CUDA experiments remain available; no unlicensed Saltline source was imported.

**Current visual review (real Chromium screenshot):** procedural patches and local highlights make asphalt less flat, and architectural set-dressing makes the blocks denser. However the box-derived characters and shops still look like a low-poly indie prototype. This is a failed realism-quality gate, not a claim of Saltline-quality visual parity. The GitHub Actions browser is software rasterized and has shown very low frame rates, so do not infer consumer GPU FPS.
