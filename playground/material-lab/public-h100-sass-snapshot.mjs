/** Immutable presentation excerpt of two actual vendor-decoded full-source Nsight reports.
 * SASS counters are profiler-reported, NOT clock cycles.
 * GitHub verification: https://github.com/hippoley/GPU-Uncooked/actions/runs/45096310906
 */
export const FULL_SOURCE_SASS=Object.freeze({
 classification:"THIRD_PARTY_UNVERIFIED",hardwareAttested:false,
 causalSpeedupProven:false,sameBinaryVerified:false,
 sourceRun:"https://github.com/hippoley/GPU-Uncooked/actions/runs/45096310906",
 variants:[
  {label:"RS-WGMMA full_source",kernel:"rswgmma_uniform4096_kernel",
   durationNs:60864,registersPerThread:118,staticSassLines:1488,
   reportedInstructionExecutions:7640064,
   sourceViewSha256:"2adedcaa5e572db1d765a8b47817e0bb3e6ef20b4300ed8478035b125b714d50"},
  {label:"Memdesc full_source",kernel:"memdesc_transpose_uniform4096_kernel",
   durationNs:41184,registersPerThread:80,staticSassLines:1440,
   reportedInstructionExecutions:6978048,
   sourceViewSha256:"d134ffa493971a609449a3c6bf428744d5f0ce69cfc0d9bcffbea9690baf19e3"}
 ],
 rows:[
  {opcode:"QGMMA",left:131072,right:131072},
  {opcode:"STS",left:1229824,right:181248},
  {opcode:"PRMT",left:17152,right:803584},
  {opcode:"LDS",left:1250304,right:1250304},
  {opcode:"FFMA",left:227328,right:227328},
  {opcode:"LDG",left:34816,right:34816}
 ]
});
export function validateFullSourceSass(snapshot){
 if(snapshot.classification!=="THIRD_PARTY_UNVERIFIED"||
    snapshot.hardwareAttested!==false||
    snapshot.causalSpeedupProven!==false||
    snapshot.sameBinaryVerified!==false)throw new Error("Cannot promote third-party SASS");
 if(snapshot.variants.length!==2||snapshot.rows.length<1)throw new Error("Incomplete SASS evidence");
 for(const variant of snapshot.variants){
  if(!/^[a-f0-9]{64}$/.test(variant.sourceViewSha256))throw new Error("Missing SASS provenance");
 }
 for(const row of snapshot.rows){
  if(!Number.isSafeInteger(row.left)||!Number.isSafeInteger(row.right)||
     row.left<0||row.right<0)throw new Error("Invalid instruction count");
 }
 return snapshot;
}

/** Evidence-grounded opcode investigation. Neither the count nor the
 * narrative claims per-cycle instruction ordering or causal attribution.
 */
const OPCODE_GUIDE=Object.freeze({
 QGMMA:{stage:"矩阵乘法执行",operation:"Hopper 矩阵乘加指令族，参与 FP8 矩阵计算。",
  question:"矩阵计算次数相同，差别是否发生在操作数准备与供应？",
  boundary:"仅能证明两个报告的 QGMMA 执行计数相同，不能证明矩阵管线利用率相同。"},
 STS:{stage:"共享内存写入",operation:"将数据写入 Shared Memory 的机器指令类别。",
  question:"Memdesc 是否通过更少的共享内存写入完成数据重排？",
  boundary:"指令执行数下降不等于写入字节数同比下降，也不能据此单独计算延迟。"},
 PRMT:{stage:"寄存器内部重排",operation:"PRMT 将寄存器操作数中的字节排列组合成新的结果。",
  question:"是否以更多寄存器内排列，取代部分 Shared Memory Store？",
  boundary:"无法仅凭 PRMT 和 STS 计数证明二者一一替代或建立跨指令依赖关系。"},
 LDS:{stage:"共享内存读取",operation:"读取 Shared Memory 的机器指令类别。",
  question:"两组 LDS 次数相同，访问地址、Bank Conflict 与 Stall 是否也相同？",
  boundary:"相同的执行次数不代表相同的访存字节数、冲突或执行成本。"},
 FFMA:{stage:"标量浮点乘加",operation:"FP32 融合乘加指令类别。",
  question:"标量计算量保持不变时，性能差异是否在数据路径？",
  boundary:"FFMA 执行次数相同，不代表总 FLOPs、吞吐率或者周期分布一致。"},
 LDG:{stage:"全局内存加载",operation:"从全局内存地址空间加载的机器指令类别。",
  question:"加载指令次数一致时，实际 L1/L2/DRAM 事务是否一致？",
  boundary:"无法由 LDG 次数推导实际 DRAM 字节或 Cache Hit Rate。"}
});
export function investigateFullSourceOpcode(snapshot,opcode){
 validateFullSourceSass(snapshot);
 const row=snapshot.rows.find(r=>r.opcode===opcode);
 if(!row||!Object.prototype.hasOwnProperty.call(OPCODE_GUIDE,opcode))
  throw new Error("Unsupported or unobserved SASS opcode");
 const guide=OPCODE_GUIDE[opcode],delta=row.right-row.left;
 return Object.freeze({
  opcode,stage:guide.stage,operation:guide.operation,
  researchQuestion:guide.question,claimLimit:guide.boundary,
  left:row.left,right:row.right,delta,
  deltaLabel:delta===0?"相同":delta>0?"Memdesc 多 "+delta.toLocaleString("en-US")+" 次":"Memdesc 少 "+(-delta).toLocaleString("en-US")+" 次",
  leftFraction:Math.max(0,Math.min(1,row.left/Math.max(row.left,row.right,1))),
  rightFraction:Math.max(0,Math.min(1,row.right/Math.max(row.left,row.right,1))),
  classification:"THIRD_PARTY_UNVERIFIED",hardwareAttested:false,
  cyclePositionKnown:false,causalLinkProven:false,
  provenance:snapshot.sourceRun,
  sourceViewDigests:snapshot.variants.map(v=>v.sourceViewSha256)
 });
}
