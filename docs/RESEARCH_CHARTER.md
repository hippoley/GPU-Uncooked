# Research charter

## Mission
Make GPU performance *understandable, measurable, improvable, and debatable*, starting with hardware we can access: RTX 4090 and A100.

## Audience
1. Curious developers who need an accurate mental model.
2. GPU, compiler and inference engineers who demand correct measurement.
3. System architects deciding whether the bottleneck is compute, memory, communication or software.

## Editorial contract
Every chapter includes:
- **Kitchen story:** no jargon needed.
- **Mapping:** the exact GPU concepts, with all caveats.
- **Prediction:** measurable outcomes, with units and assumptions.
- **Experiment:** exact commands/code and machine configuration.
- **Observation:** raw data, statistical summary, profiler evidence.
- **Surprise:** where the story fails.
- **Engineering response:** an optimization, a rejected optimization or a reason none is justified.
- **Next question:** a testable architectural trade-off.

### Avoid
- Assigning personal invention credit for team/company architectures without citations.
- Treating peak FLOPS, marketing specs, or synthetic microbenchmarks as application performance.
- Presenting a performance comparison without matching precision, workload, model quality, versions and constraints.
- Equating PCIe device count with shared/pooled VRAM.
- Passing CI on CPU and calling it a GPU hardware validation.

## Five research tracks
1. **Compute:** instruction execution, SIMT, tensor math, accuracy.
2. **Memory:** registers, caches, HBM/GDDR, bandwidth and locality.
3. **Communication:** PCIe, NVLink where available, NCCL, network.
4. **Systems:** runtime, compiler, kernel fusion, scheduling, LLM serving.
5. **Architecture economics:** tokens/s/W, tokens/s/$, utilization, operational constraints and future designs.

## Definition of done
An episode becomes **Verified** only when commands, source revisions, system inventory, raw observations, correct numerics and repeatability are available. Otherwise label it Draft, Hypothesis, Simulation or Blocked. An external reviewer should be able to challenge any conclusion.

## Priority
Build one excellent public case study on RTX 4090 vs A100 and one end-to-end LLM optimization before expanding into broad encyclopedic chapters.
