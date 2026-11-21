// CUDA Real-Material Workbench · actual compilable gather kernel.
// The browser renders the exact address expression: src[threadIdx.x * stride].
// Unlike the browser's 32B sector model, timing and hardware memory counters
// must be collected separately on a real NVIDIA CUDA device.
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <vector>

#define CHECK(call) do {                                              \
  cudaError_t status = (call);                                        \
  if (status != cudaSuccess) {                                        \
    std::fprintf(stderr, "%s:%d %s: %s\n", __FILE__, __LINE__,       \
                 #call, cudaGetErrorString(status));                  \
    return 1;                                                         \
  }                                                                  \
} while (0)

__global__ void gather(const float* src, float* dst, int stride) {
  int lane = threadIdx.x;
  if (lane < 32) {
    int index = lane * stride;
    dst[lane] = src[index];
  }
}

int main(int argc, char** argv) {
  const int stride = argc > 1 ? std::atoi(argv[1]) : 4;
  if (stride != 1 && stride != 4 && stride != 8) {
    std::fprintf(stderr, "Only stride 1, 4 or 8 is supported\n");
    return 2;
  }

  constexpr int kInput = 256;
  constexpr int kLanes = 32;
  std::vector<float> input(kInput), output(kLanes, 0.f);
  for (int i = 0; i < kInput; ++i) input[i] = static_cast<float>(i) + 0.25f;

  float *d_src = nullptr, *d_dst = nullptr;
  CHECK(cudaMalloc(&d_src, kInput * sizeof(float)));
  CHECK(cudaMalloc(&d_dst, kLanes * sizeof(float)));
  CHECK(cudaMemcpy(d_src, input.data(), kInput * sizeof(float), cudaMemcpyHostToDevice));
  gather<<<1, 32>>>(d_src, d_dst, stride);
  CHECK(cudaGetLastError());
  CHECK(cudaDeviceSynchronize());
  CHECK(cudaMemcpy(output.data(), d_dst, kLanes * sizeof(float), cudaMemcpyDeviceToHost));

  for (int lane = 0; lane < kLanes; ++lane) {
    const float expected = input[lane * stride];
    if (std::fabs(output[lane] - expected) > 1e-6f) {
      std::fprintf(stderr, "Mismatch lane=%d expected=%f got=%f\n", lane,
                   expected, output[lane]);
      return 3;
    }
  }
  CHECK(cudaFree(d_src));
  CHECK(cudaFree(d_dst));
  std::printf("PASS stride=%d lanes=%d input=%d verified=%d\n",
              stride, kLanes, kInput, kLanes);
  return 0;
}
