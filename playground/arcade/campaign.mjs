/** Story beats for Memory Abyss's first three-minute dive.
 * Pure state logic; browser visuals are intentionally separate from CUDA evidence.
 */
export const OBJECTIVE=8;
export function chapterBeat({collected=0,elapsed=0,pulseUsed=false,rareFound=false,oxygen=100}={}){
 if(!Number.isInteger(collected)||collected<0||!Number.isFinite(elapsed)||elapsed<0||!Number.isFinite(oxygen))throw new RangeError("Invalid expedition state");
 if(oxygen<=25)return {id:"low-oxygen",title:"氧气告急！",body:"优先上浮，贪心可能失去全部战利品。",tone:"danger"};
 if(collected>=OBJECTIVE)return {id:"extract",title:"任务完成：返回水面",body:"上升至黄色撤离平台领取全部回收奖励。",tone:"success"};
 if(rareFound)return {id:"rare",title:"发现古代 GPU 残片",body:"带着稀有遗物撤离，可获得额外研究资金。",tone:"gold"};
 if(collected>=5&&!pulseUsed)return {id:"pulse",title:"危险区：激活 Warp Pulse",body:"按空格 / P 批量回收附近晶体并干扰敌人；需要付出氧气代价。",tone:"action"};
 if(collected>=3||elapsed>=45)return {id:"ambush",title:"CACHE MISS 正在靠近",body:"敌人开始追踪潜艇！远离红色鱼群，利用脉冲争取窗口。",tone:"danger"};
 if(collected>=1)return {id:"discover",title:"数据并非越散越好",body:"优先打捞相邻地址晶体，回基地解锁局部性研究。",tone:"info"};
 return {id:"entry",title:"第一潜：探索失落的 L2 遗迹",body:"收集 8 个数据晶体，再返回上方灯塔。方向键移动，P 发射脉冲。",tone:"info"};
}
export function dangerSpeed({collected=0,elapsed=0}={}){
 if(!Number.isInteger(collected)||collected<0||!Number.isFinite(elapsed)||elapsed<0)throw new RangeError("Invalid dive difficulty");
 return collected>=3||elapsed>=45?1.5:1;
}
export function finalGrade({collected,oxygen,rareFound=false,success=false}){
 if(!Number.isInteger(collected)||collected<0||!Number.isFinite(oxygen)||oxygen<0)throw new RangeError("Invalid grade");
 const bonus=success&&rareFound?120:0;
 const stars=!success?0:oxygen>=55?3:oxygen>=20?2:1;
 return {bonus,stars,title:stars===3?"DEEP SEA ACE":stars===2?"MISSION CLEARED":stars===1?"BARELY MADE IT":"LOST SIGNAL"};
}
