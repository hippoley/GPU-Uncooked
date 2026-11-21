// Freight District: 32-thread warp-sized blocks / 4 waves / 128 indexed loads.
// The address footprint in the browser game is a TEACHING MODEL, not a measured GPU metric.
// Compile: nvcc -O2 -std=c++17 dispatch.cu -o freight-dispatch && ./freight-dispatch
#include <cuda_runtime.h>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <vector>
#define CUDA_CHECK(x) do { cudaError_t err=(x); if(err!=cudaSuccess){std::fprintf(stderr,"%s:%d: %s\n",__FILE__,__LINE__,cudaGetErrorString(err));std::exit(1);} } while(0)
constexpr int LANES=32, WAVES=4, COUNT=LANES*WAVES;
__global__ void gather(const float* input,const int* indices,float* result) {
 const int tid=blockIdx.x*blockDim.x+threadIdx.x;
 if(tid<COUNT)result[tid]=input[indices[tid]];
}
struct Footprint{int sectors=0;int requestedBytes=COUNT*4;};
Footprint countModelSectors(const std::array<int,COUNT>& manifest){
 Footprint fp{};
 for(int wave=0;wave<WAVES;wave++){
  std::array<bool,16> active{};
  for(int lane=0;lane<LANES;lane++){int index=manifest[wave*LANES+lane];active[index/8]=true;}
  for(bool b:active)fp.sectors+=b?1:0;
 }
 return fp;
}
void dispatch(const char* label,const std::array<int,COUNT>& index,
 const float* dInput,int* dIndex,float* dOutput){
 CUDA_CHECK(cudaMemcpy(dIndex,index.data(),sizeof(int)*COUNT,cudaMemcpyHostToDevice));
 gather<<<WAVES,LANES>>>(dInput,dIndex,dOutput);
 CUDA_CHECK(cudaGetLastError());CUDA_CHECK(cudaDeviceSynchronize());
 std::array<float,COUNT> actual{};
 CUDA_CHECK(cudaMemcpy(actual.data(),dOutput,sizeof(float)*COUNT,cudaMemcpyDeviceToHost));
 for(int tid=0;tid<COUNT;tid++){
  const float expected=static_cast<float>(index[tid])*1.25f;
  if(actual[tid]!=expected){std::fprintf(stderr,"Mismatch at %d\n",tid);std::exit(2);}
 }
 const auto model=countModelSectors(index);
 std::printf("%s: correct=128/128, teaching-model sectors=%d, requested_bytes=%d\n",
  label,model.sectors,model.requestedBytes);
}
int main(){
 std::array<float,COUNT> input{};
 for(int i=0;i<COUNT;i++)input[i]=i*1.25f;
 std::array<int,COUNT> stripe{},packed{};
 for(int i=0;i<COUNT;i++){
  stripe[i]=(i%LANES)*WAVES+i/LANES;
  packed[i]=i;
 }
 float *dInput=nullptr,*dOutput=nullptr;int* dIndex=nullptr;
 CUDA_CHECK(cudaMalloc(reinterpret_cast<void**>(&dInput),sizeof(float)*COUNT));
 CUDA_CHECK(cudaMalloc(reinterpret_cast<void**>(&dOutput),sizeof(float)*COUNT));
 CUDA_CHECK(cudaMalloc(reinterpret_cast<void**>(&dIndex),sizeof(int)*COUNT));
 CUDA_CHECK(cudaMemcpy(dInput,input.data(),sizeof(float)*COUNT,cudaMemcpyHostToDevice));
 dispatch("striped",stripe,dInput,dIndex,dOutput);
 dispatch("packed",packed,dInput,dIndex,dOutput);
 CUDA_CHECK(cudaFree(dIndex));CUDA_CHECK(cudaFree(dInput));CUDA_CHECK(cudaFree(dOutput));
 std::puts("PASS: CPU expected output agrees with both GPU gathers. No speedup claim.");
}
