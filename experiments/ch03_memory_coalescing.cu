// Chapter 03: single-GPU, correctness-checked strided gather.
// The browser's number of touched sectors is NOT a DRAM transaction count.
// Build: nvcc -O3 -std=c++17 -arch=sm_89 -o ch03 experiments/ch03_memory_coalescing.cu
// A100: use -arch=sm_80. Run only in an approved hardware test window.
#include <cuda_runtime.h>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#define CHECK(expr) do {cudaError_t err=(expr); if(err!=cudaSuccess){std::fprintf(stderr,"CUDA error %s at line %d\n",cudaGetErrorString(err),__LINE__);std::exit(1);}}while(0)
__global__ void gather(const float* __restrict__ src,float* __restrict__ dst,int n,int stride,int offset) {
 int i=blockIdx.x*blockDim.x+threadIdx.x;
 if(i<n) dst[i]=src[offset+i*stride];
}
int main(int argc,char**argv) {
 if(argc!=3||std::strcmp(argv[1],"--device")!=0) {std::fprintf(stderr,"usage: %s --device GPU_INDEX\n",argv[0]);return 2;}
 char* end=nullptr;long device=std::strtol(argv[2],&end,10);
 if(!argv[2][0]||*end||device<0||device>1024){std::fprintf(stderr,"Invalid device index\n");return 2;}
 CHECK(cudaSetDevice((int)device));
 constexpr int N=1<<20, BLOCK=256, REPEATS=30, WARMUPS=5;
 constexpr int strides[]={1,2,4,8,16};
 constexpr int maxStride=16,offset=0;
 const size_t srcCount=(size_t)offset+(size_t)(N-1)*maxStride+1;
 std::vector<float> input(srcCount),output(N);
 for(size_t i=0;i<srcCount;i++) input[i]=static_cast<float>((i%8191)*0.125f);
 float *dsrc=nullptr,*ddst=nullptr;
 CHECK(cudaMalloc((void**)&dsrc,srcCount*sizeof(float)));
 CHECK(cudaMalloc((void**)&ddst,(size_t)N*sizeof(float)));
 CHECK(cudaMemcpy(dsrc,input.data(),srcCount*sizeof(float),cudaMemcpyHostToDevice));
 cudaEvent_t start,stop;CHECK(cudaEventCreate(&start));CHECK(cudaEventCreate(&stop));
 for(int stride:strides){
   // Validate ALL outputs before gathering timings.
   gather<<<(N+BLOCK-1)/BLOCK,BLOCK>>>(dsrc,ddst,N,stride,offset);
   CHECK(cudaGetLastError()); CHECK(cudaDeviceSynchronize());
   CHECK(cudaMemcpy(output.data(),ddst,(size_t)N*sizeof(float),cudaMemcpyDeviceToHost));
   for(int i=0;i<N;i++){
     const float expected=input[(size_t)offset+(size_t)i*stride];
     if(output[i]!=expected){std::fprintf(stderr,"FAIL stride=%d at i=%d\n",stride,i);return 1;}
   }
   for(int w=0;w<WARMUPS;w++) gather<<<(N+BLOCK-1)/BLOCK,BLOCK>>>(dsrc,ddst,N,stride,offset);
   CHECK(cudaGetLastError());CHECK(cudaDeviceSynchronize());
   CHECK(cudaEventRecord(start));
   for(int r=0;r<REPEATS;r++)gather<<<(N+BLOCK-1)/BLOCK,BLOCK>>>(dsrc,ddst,N,stride,offset);
   CHECK(cudaEventRecord(stop));CHECK(cudaEventSynchronize(stop));
   float totalMs=0;CHECK(cudaEventElapsedTime(&totalMs,start,stop));
   const double avgMs=totalMs/REPEATS;
   const double usefulGbps=(double)N*2*sizeof(float)/(avgMs*1e6);
   std::printf("{\"status\":\"unreviewed_single_run\",\"device\":%ld,\"stride\":%d,\"n\":%d,\"warmups\":%d,\"repeats\":%d,\"mean_kernel_ms\":%.8f,\"useful_read_write_GBps\":%.6f,\"correctness\":\"full_buffer_pass\"}\n",device,stride,N,WARMUPS,REPEATS,avgMs,usefulGbps);
 }
 CHECK(cudaEventDestroy(start));CHECK(cudaEventDestroy(stop));
 CHECK(cudaFree(dsrc));CHECK(cudaFree(ddst));
 return 0;
}
