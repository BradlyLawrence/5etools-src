import {archetypeIds} from './archetypes.mjs';
export function armorMasterDefense(c,e,conditions={}){
 const n=archetypeIds(c).includes('armor-master')?(c.classes.fighter??0):0;if(!n)return null;
 const armor=e?.armor,shield=e?.shield,category=armor?.category;
 const disabled=['stunned','unconscious','helpless'].some(id=>conditions[id]||c.ruleState?.conditions?.[id]||c.context?.[id]);
 const own=c.techEquipment?.items.find(i=>i.instanceId===c.techEquipment.armorInstanceId&&i.itemId===armor?.id);
 const adamantine=armor&&(own?.material??armor.material)==='adamantine'?({light:1,medium:2,heavy:3}[category]??0):0;
 const base=n>=5&&!disabled?({light:1,medium:2,heavy:3}[category]??0)*(n>=19?4:1):0;
 // Shield Focus and temporary powered shield bonuses do not increase this cap.
 const shieldOwn=c.techEquipment?.items.find(i=>i.instanceId===c.techEquipment.shieldInstanceId&&i.itemId===shield?.id);
 const shieldCap=shield&&e.shieldApplies?Math.min(shield.defense.bonus,shield.tech?(shield.baseDefenseBonus??shield.defense.bonus)+(shieldOwn?.enhancement??0):shield.defense.bonus):0;
 return {deflectiveShield:n>=2?Math.min(1+Math.floor((n-2)/4),Math.max(0,shieldCap)):0,armoredDefense:base,adamantine,damageReduction:base+adamantine,disabled,fortificationPercent:armor&&n>=9?(n>=13?50:25):0,immuneCriticalHits:!!armor&&n>=20,immuneSneakAttack:!!armor&&n>=20,armorCannotBeSundered:!!armor&&n>=20&&!armor.traits.includes('fragile')};
}
export function armorMasterDR(defense,otherDR,{magical=false}={}){return Math.max(defense?.damageReduction??0,otherDR?.bypass==='magic'&&magical?0:otherDR?.amount??0);}
