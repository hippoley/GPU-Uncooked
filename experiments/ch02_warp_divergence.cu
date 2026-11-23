// Chapter 02: correctness-first branch patterns for a single NVIDIA GPU.
// The browser's two-path analogy is NOT a prediction of performance speedup.
// Compile e.g.: nvcc -O3 -std=c++17 -arch=sm_89 -o ch02 experiments/ch02_warp_divergence.cu
// Run (after operator approval): ./ch02 --device 0
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#define CUDA_OK(x) do { cudaError_t e=(x); if(e!=cudaSuccess){std::fprintf(stderr,"%s\n",cudaGetErrorString(e));std::exit(1);} }while(0)
__global__ void branch_kernel(float* out, int n, int pattern){
 const int i=blockIdx.x*blockDim.x+threadIdx.x;
 if(i>=n)return;
 const int lane=threadIdx.x & 31;
 bool takeA=(pattern==0) || (pattern==1 && lane<16) || (pattern==2 && (lane%2==0));
 // Separate branches are source-level only: compiler may predicate both paths.
 float x=static_cast<float>(i%17);
 if(takeA) x=x*1.25f+3.0f;
 else      x=x*0.75f-2.0f;
 out[i]=x;
}
int main(int argc,char** argv){
 int device=-1;
 if(argc!=3 || std::strcmp(argv[1],"--device")!=0){std::fprintf(stderr,"usage: %s --device GPU_INDEX\n",argv[0]);return 2;}
 device=std::atoi(argv[2]);if(device<0){std::fprintf(stderr,"device must be nonnegative\n");return 2;}
 CUDA_OK(cudaSetDevice(device));
 constexpr int n=1<<20;constexpr int threads=256;
 float* d=nullptr;CUDA_OK(cudaMalloc(&d,n*sizeof(float)));
 std::vector<float> output(n);
 for(int pattern=0;pattern<3;++pattern){
   branch_kernel<<<(n+threads-1)/threads,threads>>>(d,n,pattern);
   CUDA_OK(cudaGetLastError());CUDA_OK(cudaDeviceSynchronize());
   CUDA_OK(cudaMemcpy(output.data(),d,n*sizeof(float),cudaMemcpyDeviceToHost));
   for(int i=0;i<n;i++){
     const int lane=i%32;
     const bool a=(pattern==0)||(pattern==1&&lane<16)||(pattern==2&&(lane%2==0));
     const float x=static_cast<float>(i%17);
     const float expected=a?x*1.25f+3.0f:x*0.75f-2.0f;
     if(output[i]!=expected){std::fprintf(stderr,"FAIL pattern=%d index=%d\n",pattern,i);CUDA_OK(cudaFree(d));return 1;}
   }
   std::printf("PASS pattern=%d checked=%d values (correctness only)\n",pattern,n);
 }
 CUDA_OK(cudaFree(d));
 std::puts("To investigate actual divergence, inspect generated SASS and Nsight Compute counters; this program does not claim timings.");
 return 0;
}
