/**
 * Static NVIDIA cuobjdump --dump-sass listing inspector.
 * Counts disassembled instructions in ONE selected kernel, NOT runtime issue
 * counts, instruction executions, dynamic warp steps, cycles, or FLOPs.
 *
 * Fail closed for ambiguous/missing functions and empty instruction listings.
 */
const category=op=>{
 if(/^(?:LDG|LDL|LDS|LDC|LDSM|LDGSTS|LD)/.test(op))return "load";
 if(/^(?:STG|STL|STS|ST)/.test(op))return "store";
 if(/^(?:ATOM|ATOMG|ATOMS|RED|SUATOM)/.test(op))return "atomic";
 if(/^(?:BRA|BRX|JMP|CALL|RET|EXIT|BSSY|BSYNC|WARPSYNC|YIELD)/.test(op))return "control";
 if(/^(?:FFMA|FADD|FMUL|FSET|FMNMX|MUFU|DMUL|DADD|DFMA)/.test(op))return "floating";
 if(/^(?:HMMA|IMMA|BMMA|WGMMA|MMA)/.test(op))return "matrix";
 if(/^(?:IMAD|IADD|ISCADD|IMUL|SHF|LOP|LEA|ISETP|ISET|PRMT|BFE|BFI|POPC)/.test(op))return "integerAddressLogic";
 return "other";
};
const staticInstruction=(line)=>{
 const match=line.match(/^\s*\/\*\s*([0-9a-fA-F]{4,8})\s*\*\/\s*(.+?)\s*$/);
 if(!match)return null;
 const body=match[2].split(";")[0].trim();
 const m=body.match(/^(?:@!?P(?:[0-7]|T)\s+)?([A-Z][A-Z0-9_.]*)\b(?:\s|$)/);
 if(!m)return null;
 const op=m[1].split(".")[0],klass=category(op);
 return Object.freeze({pc:match[1].toLowerCase(),mnemonic:m[1],baseOpcode:op,category:klass,source:body});
};
export function inspectSassListing(text,{functionFilter="gather"}={}){
 if(typeof text!=="string"||text.length===0||text.length>5_000_000)throw new TypeError("Invalid SASS text");
 if(typeof functionFilter!=="string"||!functionFilter||functionFilter.length>128)
  throw new TypeError("Invalid target function");
 const functions=[];
 let active=null;
 for(const line of text.split(/\r?\n/)){
  const fn=line.match(/^\s*Function\s*:\s*(\S.*?)\s*$/);
  if(fn){
   active={name:fn[1],instructions:[]};
   functions.push(active);
   continue;
  }
  if(active){
   const ins=staticInstruction(line);
   if(ins)active.instructions.push(ins);
  }
 }
 const matches=functions.filter(x=>x.name.includes(functionFilter)&&x.instructions.length>0);
 if(matches.length!==1)throw new Error("SASS kernel is missing or ambiguous: "+functionFilter);
 const fn=matches[0];
 const pcSet=new Set(fn.instructions.map(x=>x.pc));
 if(pcSet.size!==fn.instructions.length)throw new Error("Duplicate SASS program counter in selected function");
 const byCategory={};
 const byOpcode={};
 for(const x of fn.instructions){
  byCategory[x.category]=(byCategory[x.category]||0)+1;
  byOpcode[x.baseOpcode]=(byOpcode[x.baseOpcode]||0)+1;
 }
 return Object.freeze({
  schema:"gpu-uncooked.static-sass-inspection.v1",
  kind:"REPORTED_UNVERIFIED",
  listingType:"STATIC_DISASSEMBLY",
  targetFunction:fn.name,
  staticInstructionCount:fn.instructions.length,
  byCategory:Object.freeze(byCategory),
  byOpcode:Object.freeze(byOpcode),
  instructions:Object.freeze(fn.instructions),
  runtimeInstructionExecutions:null,
  runtimeWarpIssues:null,
  registersPerThread:null,
  cycles:null,
  hardwareAttested:false,
  caveat:"Static listing only. cuobjdump text and target binary provenance must be separately validated. Do NOT treat static instruction count as runtime issue count."
 });
}
