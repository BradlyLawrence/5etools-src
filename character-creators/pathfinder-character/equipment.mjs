import {dragonbornFeatures} from './engine/racial.mjs';
import {hitPoints} from './advancement.mjs';
import {DEFAULT_CHARACTER,evaluateCharacter,applyTechEvent} from './engine/homebrew.mjs';
import {materialize} from './character.mjs';
export function sheetCharacter(c){
 const out={...structuredClone(DEFAULT_CHARACTER),...materialize(c)};
 out.proficientWeapons=c.proficientWeapons??[];
 out.context=c.context??{attackType:'melee',weapon:{id:'unarmed-strike',finesseEligible:true},featToggles:{}};
 out.equipment={weaponId:'unarmed-strike',size:['gnomes','halflings'].includes(c.builder.raceId)?'small':'medium',baseSpeed:['dwarves','gnomes','halflings'].includes(c.builder.raceId)?20:30,...c.equipment};
 return out;
}
export function equip(c,rules,slot,id){
 if(!['weaponId','armorId','shieldId'].includes(slot))throw Error('Unknown equipment slot.');
 const kind={weaponId:'weapon',armorId:'armor',shieldId:'shield'}[slot];
 if(id&&!rules.equipment.items.some(x=>x.id===id&&x.kind===kind))throw Error('Unknown equipment.');
 c.equipment??={};c.equipment[slot]=id|| (slot==='weaponId'?'unarmed-strike':null);
 if(slot==='weaponId'){
  if(c.techEquipment)c.techEquipment.selectedInstanceId=null;
  delete c.equipment.damageMode;delete c.equipment.thrown;
  const item=rules.equipment.items.find(x=>x.id===id);
  if(item?.tech){
   let out=sheetCharacter(c),owned=out.techEquipment?.items.find(x=>x.itemId===id);
   if(!owned){out=applyTechEvent(rules,out,{type:'add',itemId:id,instanceId:crypto.randomUUID()});owned=out.techEquipment.items.at(-1);}
   out=applyTechEvent(rules,out,{type:'select',instanceId:owned.instanceId});
   c.techEquipment=out.techEquipment;
  }
 }
 return c;
}
export function techEvent(c,rules,event){const out=applyTechEvent(rules,sheetCharacter(c),event);c.techEquipment=out.techEquipment;return c;}
export function equipmentSheet(c,rules,action=null){const input=sheetCharacter(c),sheet=evaluateCharacter(rules,input,null,action);sheet.dragonborn=dragonbornFeatures(input);
 if(sheet.dragonborn?.claws){
 const clawCharacter=structuredClone(input),clawRules={...rules,equipment:{...rules.equipment,items:[...rules.equipment.items,{id:'draconic-claw',name:'Draconic claw',kind:'weapon',proficiency:'natural',handling:'light',finesseEligible:true,traits:[],damage:{small:['1d3'],medium:['1d4'],types:['slashing']},critical:[{threatMin:20,multiplier:2}],rangeIncrementFt:null}]}};
 clawCharacter.equipment={...clawCharacter.equipment,weaponId:'draconic-claw',damageMode:'standard',thrown:false};if(clawCharacter.techEquipment)clawCharacter.techEquipment.selectedInstanceId=null;
 clawCharacter.proficientWeapons=[...clawCharacter.proficientWeapons,'draconic-claw'];
 const claws=evaluateCharacter(clawRules,clawCharacter);sheet.dragonborn.claws.attack=claws.stats.attack.total;sheet.dragonborn.claws.damageBonus=claws.stats.damage.total;
 }
 for(const attack of sheet.classAbilities?.naturalAttacks??[]){
 const draft=structuredClone(input);draft.equipment={...draft.equipment,weaponId:attack.id,damageMode:attack.secondary?'off-hand':'standard',thrown:false};if(draft.techEquipment)draft.techEquipment.selectedInstanceId=null;
 draft.proficientWeapons=[...draft.proficientWeapons,attack.id];
 const natural={id:attack.id,name:attack.name,kind:'weapon',proficiency:'natural',handling:'light',finesseEligible:true,traits:[],damage:{small:[attack.small],medium:[attack.medium],types:[attack.type]},critical:[{threatMin:20,multiplier:2}],rangeIncrementFt:null};
 const evaluated=evaluateCharacter({...rules,equipment:{...rules.equipment,items:[...rules.equipment.items,natural]}},draft);
 attack.attack=evaluated.stats.attack.total-(attack.secondary?5:0);attack.damageBonus=evaluated.stats.damage.total;attack.dice=draft.equipment.size==='small'?attack.small:attack.medium;
 }
 sheet.hitPoints=hitPoints(c,sheet.effectiveAbilities??input.abilities,sheet.stats['hitPoints.bonus'].total);return sheet;}
