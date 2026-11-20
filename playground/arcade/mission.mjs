export function footprint(indices,sectorBytes=32,bytesPerItem=4){
 if(!Array.isArray(indices)||indices.some(i=>!Number.isInteger(i)||i<0)||sectorBytes!==32||bytesPerItem!==4)throw new RangeError("Invalid data addresses");
 const sectors=[...new Set(indices.map(i=>Math.floor(i*bytesPerItem/sectorBytes)))].sort((a,b)=>a-b);
 return {sectors,count:sectors.length,requestedBytes:indices.length*bytesPerItem,
 coverage:sectors.length?indices.length*bytesPerItem/(sectors.length*sectorBytes):0};
}
export function expeditionReward(indices,oxygen,success){
 const f=footprint(indices);
 if(!Number.isFinite(oxygen)||oxygen<0)throw new RangeError("Invalid oxygen");
 const base=indices.length*(success?20:6);
 const localityBonus=success?Math.round(f.coverage*90):0;
 return {base,localityBonus,reward:base+localityBonus+(success?Math.ceil(oxygen):0),...f};
}
