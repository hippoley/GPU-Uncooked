// EP01: minimal CUDA single-device microbench. Not a complete Roofline study.
#include <cuda_runtime.h>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#define CHECK(call) do { cudaError_t e=(call); if(e!=cudaSuccess){fprintf(stderr,"CUDA: %s\n",cudaGetErrorString(e)); exit(1);} }while(0)

__global__ void add(const float* a,const float* b,float* c,size_t n){
    size_t i=(size_t)blockIdx.x*blockDim.x+threadIdx.x;
    if(i<n) c[i]=a[i]+b[i];
}
__global__ void fma_chain(const float* a,float* c,size_t n,int reps){
    size_t i=(size_t)blockIdx.x*blockDim.x+threadIdx.x;
    if(i<n){float x=a[i]; for(int j=0;j<reps;++j) x=fmaf(x,1.0000001f,0.000001f); c[i]=x;}
}
template<class Fn> float timing(Fn fn,int warmup,int reps){
    for(int i=0;i<warmup;i++) fn();
    CHECK(cudaGetLastError()); CHECK(cudaDeviceSynchronize());
    cudaEvent_t start,stop; CHECK(cudaEventCreate(&start)); CHECK(cudaEventCreate(&stop));
    CHECK(cudaEventRecord(start));
    for(int i=0;i<reps;i++) fn();
    CHECK(cudaEventRecord(stop)); CHECK(cudaEventSynchronize(stop));
    float ms=0; CHECK(cudaEventElapsedTime(&ms,start,stop));
    CHECK(cudaEventDestroy(start)); CHECK(cudaEventDestroy(stop)); return ms/reps;
}
int main(int argc,char** argv){
    int dev=-1,mib=32,warmup=5,repeats=20,fma_reps=128;
    for(int i=1;i<argc;i++){
        if(i+1>=argc){fprintf(stderr,"Each flag needs a value\n"); return 2;}
        const char* flag=argv[i]; int value=atoi(argv[++i]);
        if(!strcmp(flag,"--device")) dev=value;
        else if(!strcmp(flag,"--mib")) mib=value;
        else if(!strcmp(flag,"--warmup")) warmup=value;
        else if(!strcmp(flag,"--repeats")) repeats=value;
        else if(!strcmp(flag,"--fma-reps")) fma_reps=value;
        else {fprintf(stderr,"Unknown argument: %s\n",flag);return 2;}
    }
    if(dev<0||mib<1||mib>128||warmup<1||repeats<3||repeats>100||fma_reps<1||fma_reps>10000){
        fprintf(stderr,"Required: --device >=0, --mib 1..128, --warmup >=1, --repeats 3..100, --fma-reps 1..10000\n");return 2;
    }
    CHECK(cudaSetDevice(dev)); cudaDeviceProp prop; CHECK(cudaGetDeviceProperties(&prop,dev));
    size_t n=(size_t)mib*1024*1024/sizeof(float), bytes=n*sizeof(float);
    float *a,*b,*c;
    CHECK(cudaMalloc((void**)&a,bytes)); CHECK(cudaMalloc((void**)&b,bytes)); CHECK(cudaMalloc((void**)&c,bytes));
    std::vector<float> init(n,1.0f);
    CHECK(cudaMemcpy(a,init.data(),bytes,cudaMemcpyHostToDevice));
    CHECK(cudaMemcpy(b,init.data(),bytes,cudaMemcpyHostToDevice));
    int grid=(int)((n+255)/256);
    float add_ms=timing([&](){add<<<grid,256>>>(a,b,c,n);},warmup,repeats);
    float output=0;
    CHECK(cudaMemcpy(&output,c,sizeof(float),cudaMemcpyDeviceToHost));
    if(fabs(output-2.0f)>1e-5f){fprintf(stderr,"add correctness failure\n");return 1;}
    float fma_ms=timing([&](){fma_chain<<<grid,256>>>(a,c,n,fma_reps);},warmup,repeats);
    CHECK(cudaMemcpy(&output,c,sizeof(float),cudaMemcpyDeviceToHost));
    float expected=1.0f;
    for(int j=0;j<fma_reps;j++) expected=std::fma(expected,1.0000001f,0.000001f);
    if(!std::isfinite(output)||fabs(output-expected)>1e-3f){fprintf(stderr,"fma correctness failure\n");return 1;}
    printf("{\"experiment\":\"ep01_microbench\",\"status\":\"measured_once_unreviewed\",\"device_index\":%d,\"gpu\":\"%s\",\"elements\":%zu,\"bytes_per_array\":%zu,\"warmup\":%d,\"repeats\":%d,\"vector_add_ms\":%.6f,\"vector_add_effective_GBps\":%.4f,\"fma_reps\":%d,\"fma_chain_ms\":%.6f}\n",dev,prop.name,n,bytes,warmup,repeats,add_ms,3.0*bytes/(add_ms*1e6),fma_reps,fma_ms);
    CHECK(cudaFree(a)); CHECK(cudaFree(b)); CHECK(cudaFree(c)); return 0;
}
