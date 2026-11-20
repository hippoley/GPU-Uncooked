# GPU Kitchen Playground

**Status: interactive static prototype. Not a GPU simulator. No GPU benchmarking claims.**

## Try it locally

No npm packages, no build framework, no cloud services:

```bash
python3 -m http.server 8000
# open http://localhost:8000/playground/
```

You can host `playground/` as static files on GitHub Pages. GitHub Pages deployment is **not configured yet**.

## What players learn

1. Add cooks until ingredient supply becomes the bottleneck.
2. Increase supply and watch the bottleneck move back to computation.
3. Change time per meal to model the work performed per task.
4. Read the technical mapping and the limits of the analogy.
5. Move from the toy model to the hardware campaign.

## Scope and caveats

The model is a **deterministic steady-state capacity approximation** with unlimited batching and no launch overhead, startup, dependencies, finite buffers, synchronization, caching or scheduling latency. It is not a timed restaurant simulation or a GPU emulation.

Run checks in Node 18+:

```bash
node --test tests/playground.test.mjs
```

## Next milestones

- Episode progression with explicit predictions, quizzes, and hints.
- Local plotting of arithmetic intensity vs attainable throughput.
- Import sanitized **measured** performance receipts from approved hardware experiments; never mix toy output with measured benchmarks.
- Add keyboard and screen-reader usability review, mobile browser validation, and external-user feedback.
