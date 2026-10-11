import {GADGETS,validateCraftedItems} from './magic-items.mjs';
import {validateTechState,reservoirMaximum} from './technology.mjs';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function boilerOutput(owned){return Math.max(0,...(owned?.design.effects??[]).filter(e=>e.kind==='gadget').map(e=>GADGETS.find(g=>g.id===e.target)?.recoveryPoints??0));}
export function recoverWithBoiler(input,rules,{instanceId,completionHour,restConfirmed,allocations,externalPoints=0}){
 validateCraftedItems(input);validateTechState(input,rules);
 const next=structuredClone(input),boiler=next.craftedItems?.find(i=>i.instanceId===instanceId),output=boilerOutput(boiler);
 check(output>0,'Choose an owned camp boiler.');check(restConfirmed===true,'Confirm an eight-hour rest with water and a maintained heat source.');
 check(Number.isSafeInteger(completionHour)&&completionHour>=8&&completionHour<=2400000,'Enter the campaign day and hour when the rest finished.');
 check(boiler.boilerLastRecoveryHour===undefined||completionHour-boiler.boilerLastRecoveryHour>=24,'This boiler must wait 24 hours between completed recoveries.');
 check(Array.isArray(allocations)&&allocations.length<=100,'Invalid recovery allocations.');check(Number.isInteger(externalPoints)&&externalPoints>=0&&externalPoints<=output,'Invalid points assigned to other characters.');let total=externalPoints;const seen=new Set();
 for(const a of allocations){check(a&&typeof a.instanceId==='string'&&!seen.has(a.instanceId),'Choose each receiving item only once.');seen.add(a.instanceId);check(Number.isInteger(a.points)&&a.points>=0&&a.points<=output,'Recovery must use whole reservoir points.');
 const target=next.techEquipment?.items.find(i=>i.instanceId===a.instanceId);check(target,'Choose an owned tech item.');const model=rules.equipment.items.find(i=>i.id===target.itemId);
 check(target.reservoir+a.points<=reservoirMaximum(model,target),'Allocated points exceed an item’s reservoir capacity.');target.reservoir+=a.points;total+=a.points;
 }
 check(total>0&&total<=output,'Allocate between 1 and '+output+' points in total.');boiler.boilerLastRecoveryHour=completionHour;
 validateTechState(next,rules);validateCraftedItems(next);return next;
}
