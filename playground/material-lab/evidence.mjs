/**
 * Evidence-to-World v0.1 — conservative, fail-closed provenance for the CUDA workbench.
 * A browser-provided JSON object must NEVER certify itself as measured GPU evidence.
 */
import {kernelGather,STRIDES} from "./physics.mjs";
export const EVIDENCE_KIND=Object.freeze({
 DERIVED:"DERIVED", ILLUSTRATIVE:"ILLUSTRATIVE", MEASURED:"MEASURED", UNKNOWN:"UNKNOWN"
});
const SOURCE="playground/material-lab/gather.cu";
const ASSUMPTIONS=Object.freeze([
 "32 lanes in one block, lane=threadIdx.x",
 "src has 256 float32 values; src[i]=i+0.25",
 "byteOffset is relative to src, not an absolute device address",
 "32-byte region coverage assumes src base aligned to 32 bytes",
 "no inference about cache misses, DRAM transactions, elapsed cycles, or physical wires"
]);
function frozenRecord(x){return Object.freeze(x);}
export function buildDerivedEvidence(stride,selectedLane=0){
 if(!STRIDES.includes(stride))throw new RangeError("Unsupported stride");
 if(!Number.isInteger(selectedLane)||selectedLane<0||selectedLane>=32)throw new RangeError("Invalid lane");
 const model=kernelGather({stride});
 const entry=model.lanes[selectedLane];
 return frozenRecord({
  schemaVersion:"gpu-uncooked.evidence.v1",
  experiment:"gather-stride",
  kind:EVIDENCE_KIND.DERIVED,
  source:SOURCE,
  sourceCommit:null,
  receiptId:null,
  gpuUuid:null,
  assumptions:[...ASSUMPTIONS],
  stride,selectedLane,
  address:frozenRecord({
   elementIndex:entry.index,
   byteOffset:entry.byteAddress,
   baseAddressKnown:false,
   theoreticalSectorIndex:entry.sector,
   expectedValue:entry.value
  }),
  predicted:frozenRecord({unique32ByteRegions:model.sectorCount,requestedBytes:model.requestedBytes,coveredRegionBytes:model.coveredBytes}),
  measured:null
 });
}
export function describeWorldObject(objectId,evidence){
 if(!evidence||evidence.kind!==EVIDENCE_KIND.DERIVED||evidence.experiment!=="gather-stride")
  throw new TypeError("World objects require validated derived evidence");
 if(!["lane","data-cell","address-edge","physical-substrate"].includes(objectId))
  throw new RangeError("Unknown object identity");
 if(objectId==="physical-substrate")return frozenRecord({
  id:objectId,kind:EVIDENCE_KIND.ILLUSTRATIVE,source:null,
  claim:"Artistic substrate and cell arrangement; NOT GH100 die coordinates",
  receiptId:null
 });
 return frozenRecord({
  id:objectId,kind:EVIDENCE_KIND.DERIVED,source:evidence.source,
  claim:objectId==="address-edge"?"Logical lane-to-element dependency; NOT an observed physical route":
        objectId==="lane"?"CUDA logical lane selected by threadIdx.x":
        "Input float32 element and calculated relative byte offset",
  receiptId:null,
  selectedLane:evidence.selectedLane,
  elementIndex:evidence.address.elementIndex
 });
}
/** This endpoint intentionally cannot endorse a measured object.
 * Hardware receipts need a separate trusted, server-side verifier and hash chain.
 */
export function classifyExternalClaim(claim){
 if(!claim||typeof claim!=="object")throw new TypeError("Missing claim");
 if(claim.kind===EVIDENCE_KIND.MEASURED)
  throw new Error("UNVERIFIED_MEASUREMENT: browser JSON cannot attest GPU hardware execution");
 if(claim.kind===EVIDENCE_KIND.DERIVED)
  throw new Error("UNVERIFIED_DERIVATION: rebuild evidence from the pinned model");
 if(claim.kind===EVIDENCE_KIND.ILLUSTRATIVE)return frozenRecord({
  kind:EVIDENCE_KIND.ILLUSTRATIVE,claim:String(claim.claim||"Unverified depiction").slice(0,500)
 });
 if(claim.kind===EVIDENCE_KIND.UNKNOWN)return frozenRecord({
  kind:EVIDENCE_KIND.UNKNOWN,claim:"Evidence unavailable"
 });
 throw new RangeError("Unknown evidence class");
}
export function measurementState(){return frozenRecord({
 status:"NOT_MEASURED",
 reason:"No independently verified NVIDIA GPU execution receipt is connected",
 gpuUuid:null,ptx:null,sass:null,nsightCompute:null
});}
