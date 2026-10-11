import {firearmReload} from './engine/gunslinger.mjs';
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
 for(const i of c.craftedItems??[])if(i.design.slot+'Id'===slot)i.equipped=false;
 const kind={weaponId:'weapon',armorId:'armor',shieldId:'shield'}[slot];
 if(id&&!rules.equipment.items.some(x=>x.id===id&&x.kind===kind))throw Error('Unknown equipment.');
 for(const i of c.techEquipment?.items??[])if(i.overloaded&&c.equipment?.[slot]===i.itemId)techEvent(c,rules,{type:'overload-end',instanceId:i.instanceId});
 c.equipment??={};c.equipment[slot]=id|| (slot==='weaponId'?'unarmed-strike':null);
 if(slot!=='weaponId'&&c.techEquipment)c.techEquipment[slot==='armorId'?'armorInstanceId':'shieldInstanceId']=null;
 if(slot==='weaponId'){
  if(c.techEquipment)c.techEquipment.selectedInstanceId=null;
  delete c.equipment.damageMode;delete c.equipment.thrown;
 }
 const item=rules.equipment.items.find(x=>x.id===id);
 if(item?.tech){
  let out=sheetCharacter(c),owned=out.techEquipment?.items.find(x=>x.itemId===id&&!x.deployed);
  if(!owned){out=applyTechEvent(rules,out,{type:'add',itemId:id,instanceId:crypto.randomUUID()});owned=out.techEquipment.items.at(-1);}
  out=applyTechEvent(rules,out,{type:'select',instanceId:owned.instanceId});c.techEquipment=out.techEquipment;c.equipment=out.equipment;
 }

 return c;
}
export function techEvent(c,rules,event){const out=applyTechEvent(rules,sheetCharacter(c),event);c.techEquipment=out.techEquipment;c.equipment=out.equipment;return c;}
export function equipmentSheet(c,rules,action=null){const input=sheetCharacter(c),sheet=evaluateCharacter(rules,input,null,action);sheet.dragonborn=dragonbornFeatures(input);
 sheet.equipment.darkvisionFt=Math.max(sheet.equipment.gadgetDarkvisionFt??0,sheet.dragonborn?.darkvisionFt??0,['dwarves','half-orcs'].includes(c.builder.raceId)?60:0);
 if(sheet.equipment?.firearm){const f=sheet.equipment.firearm.family;sheet.equipment.firearmReload=firearmReload({family:f,capacity:sheet.equipment.capacity,level:input.classes.gunslinger??0,primary:c.builder.gunslinger?.primary??null,rapidReload:(input.feats??[]).some(x=>x.featId==='rapid-reload'&&(x.weaponId===sheet.equipment.weaponId||x.family===f))});sheet.equipment.reloadAction=sheet.equipment.firearmReload.action;}
 if(sheet.dragonborn?.claws){
 const clawCharacter=structuredClone(input),clawRules={...rules,equipment:{...rules.equipment,items:[...rules.equipment.items,{id:'draconic-claw',name:'Draconic claw',kind:'weapon',proficiency:'natural',handling:'light',finesseEligible:true,traits:[],damage:{small:['1d3'],medium:['1d4'],types:['slashing']},critical:[{threatMin:20,multiplier:2}],rangeIncrementFt:null}]}};
 clawCharacter.equipment={...clawCharacter.equipment,weaponId:'draconic-claw',damageMode:'standard',thrown:false};if(clawCharacter.techEquipment)clawCharacter.techEquipment.selectedInstanceId=null;
 clawCharacter.proficientWeapons=[...clawCharacter.proficientWeapons,'draconic-claw'];
 const claws=evaluateCharacter(clawRules,clawCharacter);sheet.dragonborn.claws.attack=claws.stats.attack.total;sheet.dragonborn.claws.damageBonus=claws.stats.damage.total;
 }
 if(sheet.equipment?.unarmedLethal){const draft=structuredClone(input);draft.equipment={...draft.equipment,weaponId:'gauntlet',damageMode:'standard',thrown:false};if(draft.techEquipment)draft.techEquipment.selectedInstanceId=null;const gauntlet=evaluateCharacter(rules,draft);sheet.equipment.gauntletAttack={attack:gauntlet.stats.attack.total,damageBonus:gauntlet.stats.damage.total,dice:gauntlet.equipment.damageDice,critical:gauntlet.equipment.critical};}
 for(const attack of sheet.classAbilities?.naturalAttacks??[]){
 const draft=structuredClone(input);draft.equipment={...draft.equipment,weaponId:attack.id,damageMode:attack.secondary?'off-hand':'standard',thrown:false};if(draft.techEquipment)draft.techEquipment.selectedInstanceId=null;
 draft.proficientWeapons=[...draft.proficientWeapons,attack.id];
 const natural={id:attack.id,name:attack.name,kind:'weapon',proficiency:'natural',handling:'light',finesseEligible:true,traits:[],damage:{small:[attack.small],medium:[attack.medium],types:[attack.type]},critical:[{threatMin:20,multiplier:2}],rangeIncrementFt:null};
 const evaluated=evaluateCharacter({...rules,equipment:{...rules.equipment,items:[...rules.equipment.items,natural]}},draft);
 attack.attack=evaluated.stats.attack.total-(attack.secondary?5:0);attack.damageBonus=evaluated.stats.damage.total;attack.dice=draft.equipment.size==='small'?attack.small:attack.medium;
 }
 sheet.hitPoints=hitPoints(c,sheet.effectiveAbilities??input.abilities,sheet.stats['hitPoints.bonus'].total);return sheet;}
