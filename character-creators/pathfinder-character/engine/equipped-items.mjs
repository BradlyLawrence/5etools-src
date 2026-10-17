import {fighterArmorTraining,retainsFighter} from './fighter-base.mjs';
import {archerLevel} from './archer.mjs';
import {phalanxHandling,phalanxLevel,phalanxSummary} from './phalanx.mjs';
import {MINOR_ADAPTATIONS,validateAdaptationBase} from './minor-adaptations.mjs';
import {bowProfile} from './bows.mjs';
import {activeCrafted,craftedEnhancement,equippedGadgets} from './magic-items.mjs';
import {overloadActive,techBroken,selectedTech,techProficient,poweredBenefits,techModifiers} from './technology.mjs';
/** Resolve a single equipped attack profile and armor; no turn or target tracking. */
export function prepareEquipment(rules,input,actionId=null){
 const c=structuredClone(input);const tech=selectedTech(rules,c);if(tech){c.equipment??={size:'medium',baseSpeed:30};c.equipment.weaponId=tech.item.id;}if(!c.equipment)return {character:c,equipment:null};
 if(!rules.equipment)throw new Error('Equipment catalogue is not loaded');
 const find=(id,kinds)=>{if(!id)return null;const i=rules.equipment.items.find(i=>i.id===id);if(!i||!kinds.includes(i.kind))throw new Error('Invalid equipped item: '+id);return structuredClone(i);};
 const weapon=find(c.equipment.weaponId,['weapon']),armor=find(c.equipment.armorId,['armor']),shield=find(c.equipment.shieldId,['shield']);
 if(shield)shield.baseDefenseBonus=shield.defense.bonus;
 for(const owned of activeCrafted(c)){validateAdaptationBase(owned.design,{weapon,armor,shield}[owned.design.slot]);if(owned.design.slot==='weapon'&&weapon)weapon.traits=[...new Set([...weapon.traits,...(owned.design.adaptations??[])])];}
 for(const item of [armor,shield].filter(Boolean))if(activeCrafted(c).some(i=>i.design.slot===item.kind)){if(!item.tech)item.defense.bonus+=craftedEnhancement(c,item.kind);item.defense.armorCheckPenalty=Math.min(0,item.defense.armorCheckPenalty+1);}
 for(const [item,key] of [[armor,'armorInstanceId'],[shield,'shieldInstanceId']])if(item?.tech){const owned=c.techEquipment?.items.find(i=>i.instanceId===c.techEquipment[key]);if(owned&&owned.itemId===item.id){item.defense.bonus+=owned.enhancement+(overloadActive(c,owned)&&(c.classes.ironwright??0)>=20?2:0);const max=item.durability.hitPoints+owned.enhancement*10;if((owned.damageTaken??0)>=max){item.defense.bonus=0;}else if((owned.damageTaken??0)>=max/2){item.defense.bonus=Math.floor(item.defense.bonus/2);item.defense.armorCheckPenalty*=2;}}if(item.kind==='armor'){const training=Math.max(0,...(rules.technology.ironwright.armourTraining??[]).filter(r=>(c.classes.ironwright??0)>=r.minimumLevel).map(r=>r.bonus));item.defense.armorCheckPenalty=Math.min(0,item.defense.armorCheckPenalty+training);if(item.defense.maxDexBonus!==null)item.defense.maxDexBonus+=training;item.ironwrightArmorTraining=training;}}
 if(armor){const training=fighterArmorTraining(c),extra=Math.max(0,training-(armor.ironwrightArmorTraining??0));armor.defense.armorCheckPenalty=Math.min(0,armor.defense.armorCheckPenalty+extra);if(armor.defense.maxDexBonus!==null)armor.defense.maxDexBonus+=extra;if((armor.category==='medium'&&(c.classes.fighter??0)>=3&&retainsFighter(c,'armor-training-1'))||(armor.category==='heavy'&&(c.classes.fighter??0)>=7&&retainsFighter(c,'armor-training-2')))armor.defense.speedByBaseFt={'20':20,'30':30,'40':40};}
 if(phalanxHandling(c,weapon,shield)){weapon.handling='one-handed';weapon.phalanxOneHanded=true;}
 if(shield?.id==='shield-tower'&&phalanxLevel(c)>=7){shield.phalanxReduction=phalanxLevel(c)>=11?2:1;shield.defense.armorCheckPenalty=Math.min(0,shield.defense.armorCheckPenalty+shield.phalanxReduction);}
 if(weapon?.tech&&!weapon.tech.twoWeaponEligible&&(c.ruleState?.conditions?.['two-weapon-full-attack']||c.ruleState?.conditions?.['two-weapon-defense-eligible']))throw new Error('This two-handed tech weapon cannot be used for two-weapon fighting or Two-Weapon Defense.');
 if(weapon?.firearm){const mods=(weapon.traits??[]).map(id=>MINOR_ADAPTATIONS[id]).filter(Boolean);const capacityBonus=Math.max(0,...mods.map(a=>a.capacityBonus??0)),rangeBonus=Math.max(0,...mods.map(a=>a.rangeBonus??0));weapon.reload.capacity+=Math.ceil(weapon.reload.capacity*capacityBonus);if(rangeBonus)weapon.rangeIncrementFt=Math.floor(weapon.rangeIncrementFt*(1+rangeBonus)/5)*5;}
 const size=c.equipment.size??'medium';if(!['small','medium'].includes(size))throw new Error('Equipment size must be small or medium');
 const classes=Object.keys(c.classes).filter(k=>c.classes[k]>0),any=list=>classes.some(k=>list.includes(k));
 if(weapon?.bow&&archerLevel(c)>=2)weapon.rangeIncrementFt+=5*(1+Math.floor((archerLevel(c)-2)/4));
 const bow=bowProfile(weapon,c);
 const racialBow=c.builder?.raceId==='elves'&&['hunting-bow','war-bow'].includes(weapon?.id);
 const classBow=(weapon?.id==='hunting-bow'&&any(['bard','rogue']))||(['hunting-bow','war-bow'].includes(weapon?.id)&&any(['inquisitor']));
 const proficient=weapon&&(c.proficientWeapons.includes(weapon.id)||weapon.id==='unarmed-strike'||weapon.tech&&techProficient(c,weapon)||
  racialBow||classBow||
  weapon.proficiency==='tech-ranged'&&any(['gunslinger'])||
  weapon.proficiency==='simple'&&any(['barbarian','bard','cleric','fighter','paladin','ranger','rogue','sorcerer','gunslinger','alchemist','cavalier','inquisitor'])||
  weapon.proficiency==='martial'&&any(['barbarian','fighter','paladin','ranger','cavalier','gunslinger'])||
  classes.includes('wizard')&&['dagger','light-crossbow','heavy-crossbow','quarterstaff','club'].includes(weapon.id)||
  classes.includes('druid')&&['club','dagger','dart','quarterstaff','scimitar','scythe','sickle','shortspear','sling','spear'].includes(weapon.id)||
  classes.includes('monk')&&['club','light-crossbow','heavy-crossbow','dagger','handaxe','javelin','kama','nunchaku','quarterstaff','sai','shortspear','sword-short','siangham','sling','spear','shuriken-5'].includes(weapon.id));
 if(proficient&&!c.proficientWeapons.includes(weapon.id))c.proficientWeapons.push(weapon.id);
 if(weapon){c.context.weapon={...c.context.weapon,id:weapon.id,finesseEligible:weapon.finesseEligible,damageMode:weapon.phalanxOneHanded?'standard':(weapon.tech&&weapon.handling==='two-handed'?'two-handed':c.equipment.damageMode)??(weapon.handling==='two-handed'&&!weapon.traits.includes('double')?'two-handed':'standard')};c.context.attackType=weapon.handling==='ranged'||c.equipment.thrown===true?'ranged':'melee';if(c.equipment.thrown&&(!weapon.rangeIncrementFt||weapon.handling==='ranged'))throw new Error('This weapon has no separate thrown mode');}
 c.armorBonus=0;c.context.shieldArmorCheckPenalty=0;
 c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};
 c.ruleState.conditions??={};c.ruleState.conditions['shield-bonus-applies']=!!shield;
 return {character:c,equipment:{weapon,armor,shield,size,tech,bow,techAction:actionId&&tech?poweredBenefits(tech,actionId):null}};
}
export function equipmentEffects(equipment,c,result,abilities){
 if(!equipment)return [];
 const {weapon,armor,shield}=equipment,has=id=>result.feats.some(f=>f.active&&f.featId===id),effects=[];
 const add=(target,value,key,bonusType='untyped')=>effects.push({kind:'modifier',target,value,bonusType,featId:'equipment.'+key,name:key});
 const shieldBash=weapon&&['shield-light','shield-heavy','spiked-shield-light','spiked-shield-heavy'].includes(weapon.id);
 const twoHandedRanged=weapon?.handling==='ranged'&&((/bow/.test(weapon.id)&&weapon.id!=='hand-crossbow')||weapon.firearm?.hands===2);
 const twoHandedMelee=weapon?.handling==='two-handed'||c.context.attackType==='melee'&&c.context.weapon.damageMode==='two-handed';
 const shieldApplies=shield&&(!shieldBash||has('improved-shield-bash'))&&!twoHandedMelee&&(!twoHandedRanged||shield.id==='buckler');
 if(shield?.id==='buckler'&&twoHandedMelee)add('attack.all',-1,'buckler-occupied-arm');
 if(armor)add('ac',armor.defense.bonus,'armor','armor');
 if(shieldApplies){const focus=abilities?.effects.filter(e=>e.target==='shield.acBonus').reduce((n,e)=>n+e.value,0)??0;add('ac',shield.defense.bonus+focus,'shield','shield');}
 if(shield?.id==='shield-tower')add('attack.all',-2+(shield.phalanxReduction??0),'tower-shield-encumbrance');
 for(const item of [armor,shield].filter(Boolean)){
  const prof=item.tech?techProficient(c,item):has(item.kind==='armor'?'armor-proficiency-'+item.category:item.id==='shield-tower'?'tower-shield-proficiency':'shield-proficiency');
  if(!prof)add('attack.all',item.defense.armorCheckPenalty,item.id+'-nonproficiency');
  equipment.skillPenalty=(equipment.skillPenalty??0)+item.defense.armorCheckPenalty;
 }
 if(weapon){
  if(equipment.bow?.attackPenalty)add('attack.weapon',equipment.bow.attackPenalty,'bow-draw-strength');
  if(c.equipment.fightingDefensively){add('attack.all',-4,'fighting defensively');add('ac',(c.skillRanks.acrobatics??0)>=3?3:2,'fighting defensively','dodge');if(weapon.traits.includes('blocking'))add('ac',1,'Blocking','shield');}
  if(weapon.traits.includes('distracting'))add('skill.feint',2,'Distracting');
  if(weapon.traits.includes('deadly'))add('coupDeGrace.dcBonus',4,'Deadly');
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
 const modifications=activeCrafted(c).flatMap(i=>(i.design.adaptations??[]).map(id=>MINOR_ADAPTATIONS[id])).filter(Boolean);
 const energyResistance={};for(const a of modifications)if(a.resistance)energyResistance[a.element]=Math.max(energyResistance[a.element]??0,a.resistance);
 const elementalDamage=modifications.filter(a=>a.dice).map(a=>({type:a.element,dice:a.dice,multipliesOnCritical:false}));
 const highest=key=>Math.max(0,...modifications.map(a=>a[key]??0));
 const damageReduction={amount:highest('damageReduction'),bypass:'magic'},fortificationPercent=highest('fortification'),drPenetration=highest('penetration'),fortificationReduction=highest('fortificationReduction');
 const bypassesMagicDR=!!((e.tech?.instance.enhancement??0)>0||activeCrafted(c).some(i=>i.design.slot==='weapon'&&i.design.effects.some(x=>x.kind==='weapon'&&x.value>0)));
 const environmentalSaveBonuses={};for(const a of modifications)if(a.environmentalSave)environmentalSaveBonuses[a.environmentalSave]=Math.max(environmentalSaveBonuses[a.environmentalSave]??0,a.environmentalSaveBonus);
 const conditionalStealth=modifications.filter(a=>a.stealthEnvironment).map(a=>({environment:a.stealthEnvironment,sense:'sight',bonus:a.stealthSightBonus,bonusType:'circumstance'}));
 const impactCapacitorCapacity=Math.max(0,...activeCrafted(c).filter(i=>i.design.adaptations?.includes('impact-capacitor')).map(i=>i.design.effects.find(e=>e.kind==='armor')?.value??0));
 const gadgets=equippedGadgets(c),gadgetDarkvisionFt=Math.max(0,...gadgets.map(g=>g.darkvisionFt??0)),handheldCraftToolBonus=Math.max(0,...gadgets.map(g=>g.toolBonus??0));
 const inspectionBonus=Math.max(0,...gadgets.map(g=>g.inspectionBonus??0));
 return {phalanx:phalanxSummary(c,e),handling:e.weapon?.handling??null,bow:e.bow,inspectionBonus,gadgets,gadgetDarkvisionFt,handheldCraftToolBonus,impactCapacitorCapacity,unarmedLethal:modifications.some(a=>a.unarmedLethal),insulatedArmour:modifications.some(a=>a.insulated),environmentalSaveBonuses,conditionalStealth,somaticWhileWielding:modifications.some(a=>a.somaticWhileWielding),damageConcentrationDCBonus:highest('damageConcentrationDCBonus'),firearm:e.weapon?.firearm??null,damageReduction,fortificationPercent,drPenetration,fortificationReduction,bypassesMagicDR,energyResistance,elementalDamage,poweredBenefits:powered,extraDamageDice:powered.extraDice??null,brutal:powered.brutal??0,attackReachBonus:powered.attackReachBonus??0,weaponId:e.weapon?.id??null,damageDice:e.weapon?.damage[e.size]??null,damageTypes:e.weapon?.damage.types??[],critical,rangeIncrementFt:e.weapon?.rangeIncrementFt??null,
  reloadAction:e.weapon?.reload?(has('rapid-reload')?e.weapon.reload.rapidReloadAction??e.weapon.reload.action:e.weapon.reload.action):null,
  capacity:e.weapon?.reload?.capacity??null,proficient:e.proficient??null,
  arcaneFailurePercent:Math.max(0,(e.armor?.defense.arcaneFailurePercent??0)-reduction)+(e.shield?.defense.arcaneFailurePercent??0),
  speedFt:(e.armor?.defense.speedByBaseFt[String(c.equipment.baseSpeed??30)]??(c.equipment.baseSpeed??30))+stats['speed.bonus'].total,
  reachFt:c.context.attackType==='ranged'?null:(e.weapon?.id==='whip'?15:e.weapon?.traits.includes('reach')?10:5)+stats['reach.bonus'].total,
  traits:e.weapon?.traits??[],traitRules:[...new Set([...(e.weapon?.traits??[]).filter(id=>MINOR_ADAPTATIONS[id]).map(id=>MINOR_ADAPTATIONS[id]),...modifications.filter(a=>!a.resistance).map(a=>a.impactCapacitor?{...a,text:a.text+' Capacity: '+impactCapacitorCapacity+' damage.'}:a)])].concat(gadgets.map(g=>({name:g.name,text:g.description}))).filter(a=>!a.resistance&&(!a.damageReduction||a.damageReduction===damageReduction.amount)&&(!a.fortification||a.fortification===fortificationPercent)).concat(Object.entries(energyResistance).map(([element,value])=>({name:element[0].toUpperCase()+element.slice(1)+' resistance '+value,text:'Equipped resistance: prevent '+value+' '+element+' damage per hit or effect. Same-type resistance does not stack.'}))),descriptions:[e.weapon,e.armor,e.shield].filter(Boolean).map(i=>({name:i.name,text:i.description})),
  notes:['Weapon dice are separate from the calculated damage modifier. Double-weapon ends are separate attacks; choose handling at the table.','Reach, brace, trip, monk and nonlethal traits retain their source rules; target eligibility and attack resolution remain manual.','Shield AC is suppressed for two-handed melee and two-handed bow/crossbow use except a buckler with a bow/crossbow. A buckler used with two-handed melee imposes −1 on attacks. Loading hand requirements and one-handed firing exceptions remain manual.',
  'Bow Strength ratings, draw penalties and capped Strength damage are calculated. Mounted-use restrictions are resolved at the table. Owned tech enhancement and Keen are calculated; other item-specific exceptions may remain manual.']};
}
