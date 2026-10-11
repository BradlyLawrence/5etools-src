import {activeCrafted,craftedEnhancement} from './magic-items.mjs';
import {overloadActive,techBroken,selectedTech,techProficient,poweredBenefits,techModifiers} from './technology.mjs';
/** Resolve a single equipped attack profile and armor; no turn or target tracking. */
export function prepareEquipment(rules,input,actionId=null){
 const c=structuredClone(input);const tech=selectedTech(rules,c);if(tech){c.equipment??={size:'medium',baseSpeed:30};c.equipment.weaponId=tech.item.id;}if(!c.equipment)return {character:c,equipment:null};
 if(!rules.equipment)throw new Error('Equipment catalogue is not loaded');
 const find=(id,kinds)=>{if(!id)return null;const i=rules.equipment.items.find(i=>i.id===id);if(!i||!kinds.includes(i.kind))throw new Error('Invalid equipped item: '+id);return structuredClone(i);};
 const weapon=find(c.equipment.weaponId,['weapon']),armor=find(c.equipment.armorId,['armor']),shield=find(c.equipment.shieldId,['shield']);
 for(const item of [armor,shield].filter(Boolean))if(activeCrafted(c).some(i=>i.design.slot===item.kind)){item.defense.bonus+=craftedEnhancement(c,item.kind);item.defense.armorCheckPenalty=Math.min(0,item.defense.armorCheckPenalty+1);}
 for(const [item,key] of [[armor,'armorInstanceId'],[shield,'shieldInstanceId']])if(item?.tech){const owned=c.techEquipment?.items.find(i=>i.instanceId===c.techEquipment[key]);if(owned&&owned.itemId===item.id){item.defense.bonus+=owned.enhancement+(overloadActive(c,owned)&&(c.classes.ironwright??0)>=20?2:0);const max=item.durability.hitPoints+owned.enhancement*10;if((owned.damageTaken??0)>=max){item.defense.bonus=0;}else if((owned.damageTaken??0)>=max/2){item.defense.bonus=Math.floor(item.defense.bonus/2);item.defense.armorCheckPenalty*=2;}}if(item.kind==='armor'){const training=Math.max(0,...(rules.technology.ironwright.armourTraining??[]).filter(r=>(c.classes.ironwright??0)>=r.minimumLevel).map(r=>r.bonus));item.defense.armorCheckPenalty=Math.min(0,item.defense.armorCheckPenalty+training);if(item.defense.maxDexBonus!==null)item.defense.maxDexBonus+=training;}}
 if(weapon?.tech&&!weapon.tech.twoWeaponEligible&&(c.ruleState?.conditions?.['two-weapon-full-attack']||c.ruleState?.conditions?.['two-weapon-defense-eligible']))throw new Error('This two-handed tech weapon cannot be used for two-weapon fighting or Two-Weapon Defense.');
 const size=c.equipment.size??'medium';if(!['small','medium'].includes(size))throw new Error('Equipment size must be small or medium');
 const classes=Object.keys(c.classes).filter(k=>c.classes[k]>0),any=list=>classes.some(k=>list.includes(k));
 const proficient=weapon&&(c.proficientWeapons.includes(weapon.id)||weapon.id==='unarmed-strike'||weapon.tech&&techProficient(c,weapon)||
  weapon.proficiency==='simple'&&any(['barbarian','bard','cleric','fighter','paladin','ranger','rogue','sorcerer','gunslinger','alchemist','cavalier','inquisitor'])||
  weapon.proficiency==='martial'&&any(['barbarian','fighter','paladin','ranger','cavalier','gunslinger'])||
  classes.includes('wizard')&&['dagger','light-crossbow','heavy-crossbow','quarterstaff','club'].includes(weapon.id)||
  classes.includes('druid')&&['club','dagger','dart','quarterstaff','scimitar','scythe','sickle','shortspear','sling','spear'].includes(weapon.id)||
  classes.includes('monk')&&['club','light-crossbow','heavy-crossbow','dagger','handaxe','javelin','kama','nunchaku','quarterstaff','sai','shortspear','sword-short','siangham','sling','spear','shuriken-5'].includes(weapon.id));
 if(proficient&&!c.proficientWeapons.includes(weapon.id))c.proficientWeapons.push(weapon.id);
 if(weapon){c.context.weapon={...c.context.weapon,id:weapon.id,finesseEligible:weapon.finesseEligible,damageMode:(weapon.tech&&weapon.handling==='two-handed'?'two-handed':c.equipment.damageMode)??(weapon.handling==='two-handed'&&!weapon.traits.includes('double')?'two-handed':'standard')};c.context.attackType=weapon.handling==='ranged'||c.equipment.thrown===true?'ranged':'melee';if(c.equipment.thrown&&(!weapon.rangeIncrementFt||weapon.handling==='ranged'))throw new Error('This weapon has no separate thrown mode');}
 c.armorBonus=0;c.context.shieldArmorCheckPenalty=0;
 c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};
 c.ruleState.conditions??={};c.ruleState.conditions['shield-bonus-applies']=!!shield;
 return {character:c,equipment:{weapon,armor,shield,size,tech,techAction:actionId&&tech?poweredBenefits(tech,actionId):null}};
}
export function equipmentEffects(equipment,c,result,abilities){
 if(!equipment)return [];
 const {weapon,armor,shield}=equipment,has=id=>result.feats.some(f=>f.active&&f.featId===id),effects=[];
 const add=(target,value,key,bonusType='untyped')=>effects.push({kind:'modifier',target,value,bonusType,featId:'equipment.'+key,name:key});
 const shieldBash=weapon&&['shield-light','shield-heavy','spiked-shield-light','spiked-shield-heavy'].includes(weapon.id);
 const twoHandedRanged=weapon?.handling==='ranged'&&(/bow/.test(weapon.id)&&weapon.id!=='hand-crossbow');
 const twoHandedMelee=weapon?.handling==='two-handed'||c.context.attackType==='melee'&&c.context.weapon.damageMode==='two-handed';
 const shieldApplies=shield&&(!shieldBash||has('improved-shield-bash'))&&!twoHandedMelee&&(!twoHandedRanged||shield.id==='buckler');
 if(shield?.id==='buckler'&&twoHandedMelee)add('attack.all',-1,'buckler-occupied-arm');
 if(armor)add('ac',armor.defense.bonus,'armor','armor');
 if(shieldApplies){const focus=abilities?.effects.filter(e=>e.target==='shield.acBonus').reduce((n,e)=>n+e.value,0)??0;add('ac',shield.defense.bonus+focus,'shield','shield');}
 if(shield?.id==='shield-tower')add('attack.all',-2,'tower-shield-encumbrance');
 for(const item of [armor,shield].filter(Boolean)){
  const prof=item.tech?techProficient(c,item):has(item.kind==='armor'?'armor-proficiency-'+item.category:item.id==='shield-tower'?'tower-shield-proficiency':'shield-proficiency');
  if(!prof)add('attack.all',item.defense.armorCheckPenalty,item.id+'-nonproficiency');
  equipment.skillPenalty=(equipment.skillPenalty??0)+item.defense.armorCheckPenalty;
 }
 if(weapon){
  const trained=c.proficientWeapons.includes(weapon.id)||result.feats.some(f=>f.active&&['martial-weapon-proficiency','exotic-weapon-proficiency'].includes(f.featId)&&f.weaponId===weapon.id)||weapon.proficiency==='simple'&&has('simple-weapon-proficiency');
  if(!trained)add('attack.weapon',-4,'weapon-nonproficiency');equipment.proficient=trained;
  if(weapon.traits.includes('disarm'))add('maneuver.disarm.check',2,'disarm-trait');
 }
 effects.push(...techModifiers(equipment.tech,equipment.techAction,c));
 equipment.shieldApplies=!!shieldApplies;return effects;
}
export function equipmentSummary(e,c,result,stats){
 if(!e)return null;
 const has=id=>result.feats.some(f=>f.active&&f.featId===id&&(!f.weaponId||f.weaponId===e.weapon?.id));
 const critical=structuredClone(e.weapon?.critical??null);if(critical&&(has('improved-critical')||e.tech?.instance.keen))for(const p of critical)p.threatMin=21-(21-p.threatMin)*2;
 if(critical&&e.tech&&techBroken(e.tech.item,e.tech.instance))for(const p of critical){p.threatMin=20;p.multiplier=2;}
 const powered=e.techAction?.benefits??{};if(critical)for(const p of critical){p.threatMin=Math.max(2,p.threatMin-(powered.threatRangeBonus??0));p.multiplier+=powered.criticalMultiplierBonus??0;}
 const reduction=stats['spell.armorFailureReduction'].total;
 return {poweredBenefits:powered,extraDamageDice:powered.extraDice??null,brutal:powered.brutal??0,attackReachBonus:powered.attackReachBonus??0,weaponId:e.weapon?.id??null,damageDice:e.weapon?.damage[e.size]??null,damageTypes:e.weapon?.damage.types??[],critical,rangeIncrementFt:e.weapon?.rangeIncrementFt??null,
  reloadAction:e.weapon?.reload?(has('rapid-reload')?e.weapon.reload.rapidReloadAction??e.weapon.reload.action:e.weapon.reload.action):null,
  capacity:e.weapon?.reload?.capacity??null,proficient:e.proficient??null,
  arcaneFailurePercent:Math.max(0,(e.armor?.defense.arcaneFailurePercent??0)-reduction)+(e.shield?.defense.arcaneFailurePercent??0),
  speedFt:(e.armor?.defense.speedByBaseFt[String(c.equipment.baseSpeed??30)]??(c.equipment.baseSpeed??30))+stats['speed.bonus'].total,
  reachFt:c.context.attackType==='ranged'?null:(e.weapon?.id==='whip'?15:e.weapon?.traits.includes('reach')?10:5)+stats['reach.bonus'].total,
  traits:e.weapon?.traits??[],descriptions:[e.weapon,e.armor,e.shield].filter(Boolean).map(i=>({name:i.name,text:i.description})),
  notes:['Weapon dice are separate from the calculated damage modifier. Double-weapon ends are separate attacks; choose handling at the table.','Reach, brace, trip, monk and nonlethal traits retain their source rules; target eligibility and attack resolution remain manual.','Shield AC is suppressed for two-handed melee and two-handed bow/crossbow use except a buckler with a bow/crossbow. A buckler used with two-handed melee imposes −1 on attacks. Loading hand requirements and one-handed firing exceptions remain manual.',
  'Owned tech enhancement and Keen are calculated. Other masterwork/magic enhancements, materials, racial familiarity, composite-bow Strength ratings and item-specific exceptions remain manual.']};
}
