/** 
 * Miniature CUDA expedition: conceptual path from software request to physical execution.
 * The path is an educational spatial metaphor, NOT a literal die floorplan or
 * a claim that every request always traverses each component in this sequence.
 */
export const TOUR_VERSION=1;
export const STAGES=Object.freeze([
 {id:"host",name:"CPU 指挥室",short:"发出任务",kind:"software",color:0xffc58e,action:"把任务交给 GPU",question:"如果 CPU 已经很忙，为什么不让 GPU 帮忙？",story:"CPU 擅长组织和控制复杂工作。这次我们有许多相似计算，先把工作打包交出去。",truth:"CPU 与 GPU 的优劣依赖工作负载；GPU 不会自动加速所有程序。"},
 {id:"runtime",name:"CUDA 软件入口",short:"翻译请求",kind:"software",color:0xf6a4d0,action:"递交 Kernel 启动单",question:"程序怎么告诉 GPU 要执行什么？",story:"CUDA Runtime 和驱动帮程序管理设备资源、传输、启动和错误。看，任务单刚刚登记。",truth:"CUDA Runtime API 与驱动 API 并非一条必须依次穿越的流水线；这里合成一个软件入口。"},
 {id:"bus",name:"主机与设备通道",short:"跨设备传输",kind:"interface",color:0xa6b9ff,action:"发送一批数据",question:"数据从 CPU 所在内存，怎么到 GPU 能访问的地方？",story:"数据可能经过 PCIe 或其他互连传送。搬运也需要时间，所以有时先搬再算反而亏。",truth:"并非所有 CUDA 程序每次都通过 PCIe 复制数据；统一内存、共享内存架构与高速互连存在不同路径。"},
 {id:"vram",name:"显存仓库 · DRAM",short:"保存大数据",kind:"hardware",color:0x8cdbff,action:"打开一排数据货架",question:"GPU 的大量数据放在哪里？",story:"显存容量大，但读取有延迟和带宽约束。下一站去看为何不能每次都从这里拿。",truth:"VRAM 是一种常见的设备全局内存后备存储；GPU 全局内存属于编程地址空间，并不等于某一颗固定芯片。"},
 {id:"l2",name:"片上 L2 缓存",short:"复用常用数据",kind:"hardware",color:0x6de2d4,action:"让最近的数据留下来",question:"为什么一些货物不必再去远处仓库拿？",story:"L2 让多个计算单元更容易复用已经取过的数据；是否命中取决于访问和缓存行为。",truth:"缓存并不保证命中，也不总比显存请求更快；现代 GPU 的实际缓存层次因架构不同而变。"},
 {id:"sm",name:"SM 计算车间",short:"同时安排工作",kind:"hardware",color:0xf8b37a,action:"放行一组线程块",question:"大量工作在哪些地方真正开始？",story:"GPU 内部有多个 SM。线程块被安排到具备资源的 SM 上执行，每间车间都有有限容量。",truth:"SM 是 NVIDIA 架构术语；真实线程块调度受寄存器、共享内存、线程数量等限制。"},
 {id:"warp",name:"Warp 协同行列",short:"32 条执行通道",kind:"execution",color:0xff92b7,action:"让 32 条 Lane 向前迈步",question:"为什么工人们会被组织成一支队伍？",story:"NVIDIA GPU 把线程组织成通常为 32 线程的 Warp。遇到不同分支，活跃 Lane 会随执行路径改变。",truth:"Warp 不是 32 个独立处理器的严格对应；Volta 及之后还有 Independent Thread Scheduling。"},
 {id:"register",name:"寄存器工作台",short:"暂存当前值",kind:"hardware",color:0xffd781,action:"把操作数放到手边",question:"刚取到的值放哪，才能尽快算？",story:"每个线程有自己使用的寄存器状态。寄存器很快，但每个线程要得太多，会限制可驻留的工作。",truth:"寄存器由编译器分配并受硬件资源限制；超量可能触发溢出到 local memory。"},
 {id:"shared",name:"共享内存协作间",short:"让同块线程合作",kind:"hardware",color:0x8ef0b7,action:"让一个 Block 共享材料",question:"如果同一组工人都要用相同材料，怎样减少重复取货？",story:"一个 Block 的线程可以通过 Shared Memory 共享数据，但必须考虑同步和 Bank Conflict。",truth:"不同 Block 不能简单地把同一块 Shared Memory 当成公共仓库；资源占用也会改变并发度。"},
 {id:"alu",name:"算术执行核心",short:"真正完成计算",kind:"execution",color:0xfc8c9d,action:"点亮计算阵列",question:"到底是哪一步把数据变成结果？",story:"指令送往适合的执行单元，进行加法、乘法等操作。不同指令可能使用不同的管线。",truth:"这不是一颗万能 ALU。CUDA Core、Tensor Core、SFU 等执行资源随 GPU 架构及指令而异。"},
 {id:"result",name:"结果回收站",short:"核对与交付",kind:"software",color:0xb8abff,action:"验收计算成果",question:"算完就一定正确、一定更快吗？",story:"先核对计算结果，再看整个任务耗时。只有正确并真正节约端到端时间，才算优化成功。",truth:"这里没有执行真实 NVIDIA Kernel，也没有计时；现实中还需正确性测试、CUDA 事件计时和 Profiler。"}
]);
export function initialTour(){return {version:TOUR_VERSION,index:0,seen:[],complete:false};}
export function activeStage(state){validateTour(state);return STAGES[state.index];}
export function validateTour(state){
 if(!state||state.version!==TOUR_VERSION||!Number.isInteger(state.index)||state.index<0||state.index>=STAGES.length
 ||!Array.isArray(state.seen)||state.seen.length>STAGES.length||typeof state.complete!=="boolean")throw new RangeError("Invalid expedition state");
 if(state.seen.some((id,i)=>id!==STAGES[i]?.id))throw new RangeError("Tour must have ordered, non-fabricated evidence");
 if(state.seen.length!==state.index+(state.complete?1:0))throw new RangeError("Tour checkpoint mismatch");
 if(state.complete&&state.index!==STAGES.length-1)throw new RangeError("Only the final exhibit may complete the tour");
 return state;
}
export function operateStation(state){
 validateTour(state);
 if(state.complete)return state;
 const done=[...state.seen,STAGES[state.index].id];
 if(state.index===STAGES.length-1)return {version:TOUR_VERSION,index:state.index,seen:done,complete:true};
 return {version:TOUR_VERSION,index:state.index+1,seen:done,complete:false};
}
export const stationZ=index=>9-index*11;
export function nearStation(z,index,maxDistance=5.7){
 if(!Number.isFinite(z)||!Number.isInteger(index)||index<0||index>=STAGES.length)return false;
 return Math.abs(z-stationZ(index))<=maxDistance;
}
