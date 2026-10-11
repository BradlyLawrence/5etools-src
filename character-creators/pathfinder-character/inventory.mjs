import {equip,techEvent} from './equipment.mjs';
const slots={weapon:'weaponId',armor:'armorId',shield:'shieldId'};
export function inventoryRows(c){
 const rows=Object.entries(c.carriedEquipment??{}).filter(([,n])=>n>0).map(([itemId,quantity])=>({key:itemId,itemId,quantity}));
 for(const slot of Object.values(slots)){
  const id=c.equipment?.[slot];if(!id||id==='unarmed-strike'||c.techEquipment?.items.some(i=>i.itemId===id))continue;
  const row=rows.find(x=>x.key===id);if(row){row.quantity++;row.equipped=true;}else rows.push({key:id,itemId:id,quantity:1,equipped:true});
 }
 for(const i of c.techEquipment?.items??[])rows.push({key:i.instanceId,itemId:i.itemId,quantity:1,tech:i,equipped:c.techEquipment.selectedInstanceId===i.instanceId});
 return rows;
}
export function inventoryAction(c,rules,action,key){
 const items=rules.equipment.items;
 if(action==='add'){
  const item=items.find(x=>x.id===key);if(!item)throw Error('Unknown item.');
  if(item.tech)techEvent(c,rules,{type:'add',itemId:key,instanceId:crypto.randomUUID()});
  else {c.carriedEquipment??={};c.carriedEquipment[key]=(c.carriedEquipment[key]??0)+1;}
  return;
 }
 const row=inventoryRows(c).find(x=>x.key===key);if(!row)throw Error('Item is not in your inventory.');
 const item=items.find(x=>x.id===row.itemId),slot=slots[item?.kind];
 if(action==='equip'){
  if(!slot)throw Error('This item is carried rather than equipped.');
  if(row.equipped){
   if(!row.tech){c.carriedEquipment??={};c.carriedEquipment[row.itemId]=(c.carriedEquipment[row.itemId]??0)+1;}
   equip(c,rules,slot,'');return;
  }
  const old=c.equipment?.[slot];
  if(old&&old!=='unarmed-strike'&&!c.techEquipment?.items.some(i=>i.itemId===old)){c.carriedEquipment??={};c.carriedEquipment[old]=(c.carriedEquipment[old]??0)+1;}
  equip(c,rules,slot,row.itemId);
  if(row.tech)techEvent(c,rules,{type:'select',instanceId:row.key});
  else {c.carriedEquipment[row.itemId]--;if(!c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];}
 }else if(action==='remove'){
  if(row.tech){if(row.equipped)equip(c,rules,slot,'');techEvent(c,rules,{type:'remove',instanceId:row.key});}
  else if(c.carriedEquipment?.[row.itemId]>0){if(!--c.carriedEquipment[row.itemId])delete c.carriedEquipment[row.itemId];}
  else if(row.equipped)equip(c,rules,slot,'');
 }
}
