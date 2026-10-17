/** Campaign bow identities and save migration. No I/O or shared-state mutation. */
export const BOW_IDS=['hunting-bow','war-bow','long-bow','steppe-bow'];
export const LEGACY_BOW_IDS={'shortbow':'hunting-bow','shortbow-composite':'hunting-bow','longbow':'war-bow','longbow-composite':'war-bow'};
export const bowId=id=>LEGACY_BOW_IDS[id]??id;
export const bowProficiencies=id=>['longbow','longbow-composite'].includes(id)?['hunting-bow','war-bow']:[bowId(id)];
export function validateBowRating(value){if(!Number.isInteger(value)||value<0||value>20)throw Error('Bow Strength rating must be an integer from 0 to 20.');return value;}
export function migrateBowDesign(input){
 const d=structuredClone(input);if(!d||typeof d!=='object')return d;
 if(d.baseId in LEGACY_BOW_IDS){d.legacyBaseId??=d.baseId;d.baseId=bowId(d.baseId);}
 if(d.upgradeFrom)d.upgradeFrom=migrateBowDesign(d.upgradeFrom);
 return d;
}
export function migrateBowCharacter(input){
 const c=structuredClone(input);if(!c||typeof c!=='object')return c;
 if(c.equipment?.weaponId in LEGACY_BOW_IDS){c.equipment.legacyBowId??=c.equipment.weaponId;c.equipment.weaponId=bowId(c.equipment.weaponId);}
 if(c.context?.weapon)c.context.weapon.id=bowId(c.context.weapon.id);
 if(c.deity?.favoredWeaponId)c.deity.favoredWeaponId=bowId(c.deity.favoredWeaponId);
 if(Array.isArray(c.proficientWeapons))c.proficientWeapons=[...new Set(c.proficientWeapons.flatMap(bowProficiencies))];
 if(Array.isArray(c.feats))for(const feat of c.feats)if(feat?.weaponId)feat.weaponId=bowId(feat.weaponId);
 if(c.carriedEquipment&&typeof c.carriedEquipment==='object'){
  const carried={};for(const [id,n]of Object.entries(c.carriedEquipment)){const key=bowId(id);carried[key]=(carried[key]??0)+n;}c.carriedEquipment=carried;
 }
 if(Array.isArray(c.craftedItems))for(const item of c.craftedItems)if(item?.design)item.design=migrateBowDesign(item.design);
 return c;
}
export function bowProfile(weapon,c){
 if(!weapon?.bow)return null;
 const owned=(c.craftedItems??[]).find(i=>i.equipped&&i.design.slot==='weapon'&&i.design.baseId===weapon.id);
 const rating=validateBowRating(owned?.design.bowStrengthRating??c.equipment?.bowStrengthRating??weapon.bow.strengthRating);
 const strengthModifier=Math.floor((c.abilities.str-10)/2);
 return {strengthRating:rating,strengthRequired:10+2*rating,strengthModifier,
  attackPenalty:strengthModifier<rating?-2:0,strengthDamage:Math.min(strengthModifier,rating),
  drawWeightLb:weapon.bow.drawWeightLb,mountedUse:weapon.bow.mountedUse};
}
