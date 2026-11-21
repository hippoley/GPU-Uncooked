# Public H100 evidence intake · pinned Triton WGMMA experiment

**This is a third-party report intake, not an H100 experiment executed by GPU-Uncooked.** The imported reports do not describe our `gather<<<1,32>>>` stride 1/4/8 test.

## Upstream identity (GitHub Contents + README checked)

- Repository: [smartxiaohuolong/triton-tle-attention-optimization-demo](https://github.com/smartxiaohuolong/triton-tle-attention-optimization-demo)
- Pinned commit: `53fcfbf0c11430ca9db23f8d90c4ec71b686efc8`
- Upstream claims: NVIDIA H100 SM90, Nsight Compute 2026.2, CUDA Toolkit 12.8. These are **author claims, not independent device attestation**.
- Two directly comparable reports: `rswgmma_uniform4096.ncu-rep` (1,100,024 bytes, Git blob `13ce934a7a036a4690bb62aa0be88929a75606d4`); `memdesc_transpose_uniform4096.ncu-rep` (1,007,277 bytes, Git blob `c35316d5e68eaee8f9cc005eb030415ec2ccb0ce`).
- Two larger full-source reports are also pinned in the script. All four files are hosted upstream, **not copied into GPU-Uncooked**.

## Fetch reports (Internet required on the machine executing these commands)

```bash
python3 tools/public_h100_reports.py fetch --report rswgmma_uniform4096 --dir /tmp/gpu-public-reports
python3 tools/public_h100_reports.py fetch --report memdesc_transpose_uniform4096 --dir /tmp/gpu-public-reports
```

Downloads target an immutable upstream Git commit. The script recomputes each Git Blob SHA-1 from the actual report bytes and SHA-256 for local provenance. A mismatched report is rejected before writing.

## Extract offline (compatible NVIDIA Nsight Compute `ncu` required; NO GPU required)

```bash
python3 tools/public_h100_reports.py extract --report rswgmma_uniform4096 --dir /tmp/gpu-public-reports --output /tmp/gpu-public-rswgmma
python3 tools/public_h100_reports.py extract --report memdesc_transpose_uniform4096 --dir /tmp/gpu-public-reports --output /tmp/gpu-public-memdesc
```

The tool uses `ncu --import <report> --page raw --csv --print-units base`. This **imports** saved reports and does not execute a CUDA kernel. It writes `report.json`, `ncu-stdout.txt`, `ncu-stderr.txt` with immutable provenance fields, raw per-metric strings, source hashes and errors. It refuses to overwrite an existing output directory.

If `ncu` cannot parse a report or the installed version emits a different CSV schema, output is marked `EXTRACTION_FAILED` or `UNSUPPORTED_CSV_SCHEMA`. The tool does **not** substitute fictional numbers.

## Security / product boundaries

The source is labeled `THIRD_PARTY_UNVERIFIED`; `hardware_attested=false`; `binary_identity_bound_to_our_gather=false`; `reproduces_our_stride_experiment=false`. Raw third-party metrics cannot be imported as measured `gather` counters, cannot prove per-lane timing, and must not be treated as independent verification of GPU provenance.

An **offline extracted report with Nsight-decoded metric content** should be manually inspected before mapping any row to the rendering engine. At present, the files were confirmed to exist in GitHub, but not downloaded/decoded in our execution environment; CI uses explicit synthetic fixtures.

Local tests (no GPU, no Internet, no actual report file):

```bash
python3 -m unittest discover -s tests -p test_public_h100_reports.py -v
```

NVIDIA reference: https://docs.nvidia.com/nsight-compute/NsightComputeCli/index.html
