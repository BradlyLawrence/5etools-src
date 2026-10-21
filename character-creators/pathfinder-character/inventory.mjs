import {adaptationSlots} from './engine/minor-adaptations.mjs';
import {clearOffHand,validateOffHand} from './engine/weapon-hands.mjs';
import {addCraftedItem,craftedAction} from './crafted-items.mjs';
import {gadgetDesign} from './engine/magic-items.mjs';
import {equip,techEvent} from './equipment.mjs';
const slots={weapon:'weaponId',armor:'armorId',shield:'shieldId'};
export function inventoryRows(c){
 const rows=Object.entries(c.carriedEquipment??{}).filter(([,n])=>n>0).map(([itemId,quantity])=>({key:itemId,itemId,quantity}));
 for(const slot of Object.values(slots)){
  const id=c.equipment?.[slot];if(!id||id==='unarmed-strike'||c.craftedItems?.some(i=>i.equipped&&i.design.baseId===id)||c.techEquipment?.items.some(i=>i.itemId===id))continue;
  const row=rows.find(x=>x.key===id);if(row){row.quantity++;row.equipped=true;}else rows.push({key:id,itemId:id,quantity:1,equipped:true});
 }
 for(const i of c.techEquipment?.items??[])if(!c.craftedItems?.some(x=>x.techInstanceId===i.instanceId))rows.push({key:i.instanceId,itemId:i.itemId,quantity:1,tech:i,equipped:[c.techEquipment.selectedInstanceId,c.techEquipment.armorInstanceId,c.techEquipment.shieldInstanceId].includes(i.instanceId)});
 for(const i of c.craftedItems??[])if(i.design.purchased)rows.push({key:i.instanceId,itemId:i.design.baseId,quantity:1,crafted:i,equipped:i.equipped});
 const hand=c.equipment?.offHand;
 if(hand){let row=rows.find(r=>r.key===hand.key);if(!row){row={key:hand.key,itemId:hand.itemId,quantity:0};rows.push(row);}if(hand.kind==='base')row.quantity++;row.offHand=true;}
 return rows;
}
export function inventoryAction(c,rules,action,key){
 const next=structuredClone(c);changeInventory(next,rules,action,key);validateOffHand(next);Object.assign(c,next);
}
function changeInventory(c,rules,action,key){
 const items=rules.equipment.items;
 if(action==='add'){
  const item=items.find(x=>x.id===key);if(!item)throw Error('Unknown item.');
  if(item.gadgetId&&!item.mundane)addCraftedItem(c,gadgetDesign(item.gadgetId,crypto.randomUUID()));
  else if(item.tech)techEvent(c,rules,{type:'add',itemId:key,instanceId:crypto.randomUUID()});
  else {c.carriedEquipment??={};c.carriedEquipment[key]=(c.carriedEquipment[key]??0)+1;}
  return;
 }
 const row=inventoryRows(c).find(x=>x.key===key);if(!row)throw Error('Item is not in your inventory.');
 if(action==='equip-offhand'){
  if(row.offHand){clearOffHand(c);return;}
  const weapon=items.find(i=>i.id===row.itemId);
  if(weapon?.kind!=='weapon'||!['light','one-handed'].includes(weapon.handling))throw Error('Choose a light or one-handed off-hand weapon.');
  if((row.tech||row.crafted)&&row.equipped)throw Error('This copy is already in your main hand. Choose another copy.');
  if(!row.tech&&!row.crafted&&!(c.carriedEquipment?.[row.itemId]>0))throw Error('You need another owned copy for your off hand.');
  const main=items.find(i=>i.id===c.equipment?.weaponId);
  if(main?.handling==='two-handed'||main?.handling==='ranged'||c.equipment?.damageMode==='two-handed')throw Error('Free your off hand by equipping a one-handed or light main weapon first.');
  clearOffHand(c);
  if(c.equipment?.shieldId){const shield=c.equipment.shieldId;if(!c.craftedItems?.some(i=>i.equipped&&i.design.slot==='shield')&&!c.techEquipment?.shieldInstanceId){c.carriedEquipment??={};c.carriedEquipment[shield]=(c.carriedEquipment[shield]??0)+1;}equip(c,rules,'shieldId','');}
  if(row.crafted?.design.technology&&!row.crafted.techInstanceId){row.crafted.techInstanceId=crypto.randomUUID();techEvent(c,rules,{type:'add',itemId:row.itemId,instanceId:row.crafted.techInstanceId});techEvent(c,rules,{type:'update',instanceId:row.crafted.techInstanceId,field:'enhancement',value:adaptationSlots(row.crafted.design)});}
  c.equipment??={};c.equipment.offHand={kind:row.crafted?'crafted':row.tech?'tech':'base',key:row.key,itemId:row.itemId};
  if(!row.tech&&!row.crafted){if(!--c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];}
  return;
 }
 if(row.offHand&&action==='remove'&&(row.tech||row.crafted||!(c.carriedEquipment?.[row.itemId]>0))){clearOffHand(c);if(!row.tech&&!row.crafted){if(!--c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];return;}}
 if(row.offHand&&action==='equip'&&(row.tech||row.crafted||!row.equipped&&!(c.carriedEquipment?.[row.itemId]>0)))clearOffHand(c);
 if(row.crafted)return craftedAction(c,rules,key,action);
 const item=items.find(x=>x.id===row.itemId),slot=slots[item?.kind];
 if(action==='equip'){
  if(!slot)throw Error('This item is carried rather than equipped.');if(row.tech?.deployed)throw Error('Disengage the barricade before equipping it.');
  if(row.equipped){
   if(!row.tech){c.carriedEquipment??={};c.carriedEquipment[row.itemId]=(c.carriedEquipment[row.itemId]??0)+1;}
   equip(c,rules,slot,'');return;
  }
  const old=c.equipment?.[slot];
  if(old&&old!=='unarmed-strike'&&!c.craftedItems?.some(i=>i.equipped&&i.design.slot+'Id'===slot)&&!c.techEquipment?.items.some(i=>i.itemId===old)){c.carriedEquipment??={};c.carriedEquipment[old]=(c.carriedEquipment[old]??0)+1;}
  equip(c,rules,slot,row.itemId);
  if(row.tech)techEvent(c,rules,{type:'select',instanceId:row.key});
  else {c.carriedEquipment[row.itemId]--;if(!c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];}
 }else if(action==='remove'){
  if(row.tech){if(row.equipped)equip(c,rules,slot,'');techEvent(c,rules,{type:'remove',instanceId:row.key});}
  else if(c.carriedEquipment?.[row.itemId]>0){if(!--c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];}
  else if(row.equipped)equip(c,rules,slot,'');
 }
}
