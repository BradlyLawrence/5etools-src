import {prepareEquipment} from './equipped-items.mjs';
import {activeCrafted} from './magic-items.mjs';
import {offHandCharacter} from './weapon-hands.mjs';
const has=(s,id)=>s.feats.some(f=>f.active&&f.featId===id);
export function vitalStrikeTier(sheet){return has(sheet,'greater-vital-strike')?3:has(sheet,'improved-vital-strike')?2:has(sheet,'vital-strike')?1:0;}
export function rangedFeatOptions(c,sheet,rules){
 const weapon=rules.equipment.items.find(w=>w.id===sheet.equipment.weaponId);
 const ranged=weapon?.handling==='ranged'||c.equipment?.thrown===true;
 return {rapidShot:{owned:has(sheet,'rapid-shot'),eligible:ranged},manyshot:{owned:has(sheet,'manyshot'),eligible:ranged&&!!weapon?.bow}};
}
export function attackRoutine(c,sheet,rules,evaluate){
 const rangedOptions=rangedFeatOptions(c,sheet,rules);
 const haste=c.buffs?.some(b=>b.id==='haste'&&b.active);
 const speed=character=>activeCrafted(character).some(i=>i.design.slot==='weapon'&&i.design.magicEffect==='speed');
 const withExtra=(routine,offDraft=null)=>{
  if(c.equipment?.rapidShot&&rangedOptions.rapidShot.owned&&rangedOptions.rapidShot.eligible){
   for(const hand of ['main','off'])if(routine[hand])routine[hand].attacks=routine[hand].attacks.map(n=>n-2);
   routine.main.attacks.splice(1,0,routine.main.attacks[0]);routine.rapidShot=true;
  }
  if(c.equipment?.manyshot&&rangedOptions.manyshot.owned&&rangedOptions.manyshot.eligible)routine.manyshot={attackIndex:0,arrows:2};
  const eligible=['main',...(offDraft?['off']:[])].filter(hand=>haste||speed(hand==='main'?c:offDraft));
  if(!eligible.length)return routine;
  const hand=eligible.includes(c.equipment?.extraAttackHand)?c.equipment.extraAttackHand:eligible[0];
  const profile=routine[hand];
  // Insert after the first attack: Furious Focus never refunds this extra attack.
  const bonus=hand==='main'?profile.attacks[0]-(sheet.powerAttack?.furiousFocus?sheet.powerAttack.penalty:0):profile.attacks[0];
  profile.attacks.splice(1,0,bonus);
  return {...routine,extraAttack:{hand,eligible,bonus,source:haste?'Haste':'Speed'}};
 };
 const tier=vitalStrikeTier(sheet),vital=!!c.equipment?.vitalStrike&&tier>0;
 const profile=(s)=>({name:s.equipment.weaponId,dice:s.equipment.damageDice,damage:s.stats.damage.total,critical:s.equipment.critical,elemental:s.equipment.elementalDamage??[],attack:s.stats.attack.total});
 const main=profile(sheet),first=sheet.powerAttack?.firstAttack??main.attack;
 if(vital)return {mode:'vital',tier,main:{...main,attacks:[first],extraDice:main.dice.map(d=>(/^\d+$/.test(d)?String(Number(d)*tier):d.replace(/^(\d+)d/,(_,n)=>Number(n)*tier+'d')))}};
 const attacks=Array.from({length:Math.max(1,Math.ceil(c.bab/5))},(_,i)=>main.attack-i*5+(i===0?first-main.attack:0));
 const offDraft=offHandCharacter(c);
 if(!offDraft)return withExtra({mode:'full',main:{...main,attacks}});
 const mainPrepared=prepareEquipment(rules,c),offPrepared=prepareEquipment(rules,offDraft);
 if(mainPrepared.character.context.weapon.damageMode==='two-handed'||offPrepared.character.context.weapon.damageMode==='two-handed'||mainPrepared.equipment.weapon?.tech?.twoWeaponEligible===false||offPrepared.equipment.weapon?.tech?.twoWeaponEligible===false)throw Error('These weapons cannot be wielded together. Free the off hand first.');
 const off=evaluate(rules,offDraft),weapon=offPrepared.equipment.weapon;
 const light=weapon.handling==='light'||!!offDraft.ruleState?.conditions?.['light-off-hand'];
 const trained=has(sheet,'two-weapon-fighting');
 const mainPenalty=(trained?4:6)-(light?2:0),offPenalty=(trained?4:10)-(light?2:0);
 const count=has(off,'greater-two-weapon-fighting')?3:has(off,'improved-two-weapon-fighting')?2:1;
 const offProfile=profile(off);
 if(has(off,'double-slice')&&!(activeCrafted(offDraft).some(i=>i.design.slot==='weapon'&&i.design.magicEffect==='agile')&&has(off,'weapon-finesse'))){const strength=Math.floor(((off.effectiveAbilities??offDraft.abilities).str-10)/2);if(strength>0)offProfile.damage+=strength-Math.floor(strength/2);}
 return withExtra({mode:'dual',main:{...main,attacks:attacks.map(n=>n-mainPenalty)},off:{...offProfile,attacks:Array.from({length:count},(_,i)=>offProfile.attack-offPenalty-5*i)}},offDraft);
}
