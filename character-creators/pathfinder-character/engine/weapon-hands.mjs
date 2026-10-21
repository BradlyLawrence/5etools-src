// Off-hand weapons retain their owned identity; ordinary copies leave the pack.
export function clearOffHand(c){
 const hand=c.equipment?.offHand;if(!hand)return;
 if(hand.kind==='base'){c.carriedEquipment??={};c.carriedEquipment[hand.itemId]=(c.carriedEquipment[hand.itemId]??0)+1;}
 delete c.equipment.offHand;
}
export function validateOffHand(c){
 const h=c.equipment?.offHand;if(h===undefined)return;
 if(!h||!['base','crafted','tech'].includes(h.kind)||typeof h.itemId!=='string'||typeof h.key!=='string')throw Error('Invalid off-hand weapon.');
 if(c.equipment.shieldId)throw Error('A shield and an off-hand weapon cannot occupy the same hand.');
 if(h.kind==='base'&&h.key!==h.itemId)throw Error('Invalid ordinary off-hand copy.');
 if(h.kind==='crafted'){
  const item=c.craftedItems?.find(i=>i.instanceId===h.key);
  if(!item||item.design.slot!=='weapon'||item.design.baseId!==h.itemId||item.equipped)throw Error('Off-hand crafted weapon must be a separate owned copy.');
 }
 if(h.kind==='tech'){
  const item=c.techEquipment?.items.find(i=>i.instanceId===h.key);
  if(!item||item.itemId!==h.itemId||c.techEquipment.selectedInstanceId===h.key)throw Error('Off-hand technology must be a separate owned copy.');
 }
}
export function offHandCharacter(c){
 validateOffHand(c);const h=c.equipment?.offHand;if(!h)return null;
 const out=structuredClone(c);delete out.equipment.offHand;
 out.equipment.weaponId=h.itemId;out.equipment.damageMode='off-hand';out.equipment.thrown=false;
 if(out.techEquipment)out.techEquipment.selectedInstanceId=null;
 for(const item of out.craftedItems??[])if(item.design.slot==='weapon')item.equipped=h.kind==='crafted'&&item.instanceId===h.key;
 if(h.kind==='tech')out.techEquipment.selectedInstanceId=h.key;
 if(h.kind==='crafted'){const item=out.craftedItems.find(i=>i.instanceId===h.key);if(item.techInstanceId)out.techEquipment.selectedInstanceId=item.techInstanceId;}
 return out;
}
