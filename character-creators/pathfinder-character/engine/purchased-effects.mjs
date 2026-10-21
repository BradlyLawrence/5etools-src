import {adaptationSlots} from './minor-adaptations.mjs';
// Purchased magic-item effects remain separate from campaign technology modifications.
export const PURCHASED_MAGIC_EFFECTS={
 keen:{name:'Keen',cost:1,slots:['weapon'],casterLevel:10,text:'Double the threat range of a piercing or slashing melee weapon. Does not stack with Improved Critical.',source:'https://legacy.aonprd.com/coreRulebook/magicItems/weapons.html#keen'},
 'fortification-light':{name:'Light Fortification',cost:1,slots:['armor','shield'],casterLevel:13,fortification:25,text:'25% chance to negate extra damage from a critical hit or sneak attack.',source:'https://legacy.aonprd.com/coreRulebook/magicItems/armor.html#fortification'},
 'fortification-moderate':{name:'Moderate Fortification',cost:3,slots:['armor','shield'],casterLevel:13,fortification:50,text:'50% chance to negate extra damage from a critical hit or sneak attack.',source:'https://legacy.aonprd.com/coreRulebook/magicItems/armor.html#fortification'},
 'fortification-heavy':{name:'Heavy Fortification',cost:5,slots:['armor','shield'],casterLevel:13,fortification:75,text:'75% chance to negate extra damage from a critical hit or sneak attack.',source:'https://legacy.aonprd.com/coreRulebook/magicItems/armor.html#fortification'}
};
// Command activation is resolved at the table; the sheet labels these dice accordingly.
for(const [id,name,element,casterLevel] of [['flaming','Flaming','fire',10],['frost','Frost','cold',8],['shock','Shock','electricity',8]])PURCHASED_MAGIC_EFFECTS[id]={name,cost:1,slots:['weapon'],casterLevel,element,dice:'1d6',requiresActivation:true,text:`On command, activate or extinguish this weapon's ${element} energy. While active, a successful hit adds 1d6 ${element} damage; these extra dice do not multiply on a critical hit. Projectile weapons grant this effect to their ammunition.`,source:'https://legacy.aonprd.com/coreRulebook/magicItems/weapons.html#'+id};
// Core Rulebook weapon catalogue. Context-sensitive effects are reminders, not automatic combat actions.
const coreEffects=[
 ['bane','Bane',1,8,'any','Chosen foes: enhancement +2; damage +2d6.'],
 ['defending','Defending',1,8,'melee','Allocate enhancement to AC.'],
 ['ghost-touch','Ghost Touch',1,9,'melee','Strike incorporeal creatures normally.'],
 ['ki-focus','Ki Focus',1,8,'melee','Channel applicable ki attacks.'],
 ['merciful','Merciful',1,5,'any','Active: +1d6; all damage nonlethal.'],
 ['mighty-cleaving','Mighty Cleaving',1,8,'melee','Additional Cleave attack; restrictions apply.'],
 ['spell-storing','Spell Storing',1,12,'melee','Store/release one qualifying targeted spell.'],
 ['throwing','Throwing',1,5,'melee','Throw with 10-foot range increments.'],
 ['thundering','Thundering',1,5,'any','Critical: sonic dice and deafness save.'],
 ['vicious','Vicious',1,9,'melee','Target +2d6; wielder suffers 1d6.'],
 ['anarchic','Anarchic',2,7,'any','Chaotic; anti-lawful damage; wielder restrictions.'],
 ['axiomatic','Axiomatic',2,7,'any','Lawful; anti-chaotic damage; wielder restrictions.'],
 ['disruption','Disruption',2,14,'bludgeoning-melee','Undead hit: destruction save.'],
 ['flaming-burst','Flaming Burst',2,12,'any','Flaming plus critical fire dice.'],
 ['icy-burst','Icy Burst',2,10,'any','Frost plus critical cold dice.'],
 ['holy','Holy',2,7,'any','Good; anti-evil damage; wielder restrictions.'],
 ['shocking-burst','Shocking Burst',2,10,'any','Shock plus critical electricity dice.'],
 ['unholy','Unholy',2,7,'any','Evil; anti-good damage; wielder restrictions.'],
 ['wounding','Wounding',2,10,'melee','Hits cause stacking bleed.'],
 ['speed','Speed',3,7,'any','Additional full-attack strike; nonstacking.'],
 ['brilliant-energy','Brilliant Energy',4,16,'melee-or-thrown','Ignore armor/shields; cannot harm nonliving targets.'],
 ['dancing','Dancing',4,15,'melee','Released weapon fights for four rounds.'],
 ['vorpal','Vorpal',5,18,'slashing-melee','Confirmed natural 20: beheading; exceptions apply.'],
 ['distance','Distance',1,6,'ranged','Double range increments.'],
 ['returning','Returning',1,7,'thrown','Thrown weapon returns before next turn.'],
 ['seeking','Seeking',1,12,'ranged','Negate miss chances; correct square required.']
];
for(const [id,name,cost,casterLevel,weaponRequirement,text] of coreEffects)PURCHASED_MAGIC_EFFECTS[id]={name,cost,casterLevel,weaponRequirement,text,slots:['weapon'],manual:true,source:'https://legacy.aonprd.com/coreRulebook/magicItems/weapons.html#'+id};
for(const [id,base] of [['flaming-burst','flaming'],['icy-burst','frost'],['shocking-burst','shock']])Object.assign(PURCHASED_MAGIC_EFFECTS[id],{element:PURCHASED_MAGIC_EFFECTS[base].element,dice:'1d6',requiresActivation:true});
for(const id of ['distance','throwing','speed'])PURCHASED_MAGIC_EFFECTS[id].manual=false;
// Approved purchase choices; retain other definitions solely for existing saved designs.
export const PURCHASED_WEAPON_EFFECT_IDS=Object.freeze(['keen','flaming','frost','shock','corrosive','agile','furious','returning','ghost-touch','bane','spell-storing','flaming-burst','icy-burst','shocking-burst','holy','impact','speed','brilliant-energy','vorpal']);
PURCHASED_MAGIC_EFFECTS.corrosive={...PURCHASED_MAGIC_EFFECTS.flaming,name:'Corrosive',element:'acid',text:'On command, activate or suppress an extra 1d6 acid damage per hit. These dice do not multiply on a critical hit.',source:'https://aonprd.com/MagicWeaponsDisplay.aspx?ItemName=Corrosive'};
for(const [id,name,cost,casterLevel,weaponRequirement,text] of [
 ['agile','Agile',1,7,'finesse-melee','With Weapon Finesse, use Dexterity instead of Strength for damage. No two-handed increase; off-hand reduction still applies.'],
 ['furious','Furious',1,8,'melee','While raging, enhancement is 2 higher. Applicable rage-power skills also gain an enhancement bonus; consult the full rules.'],
 ['impact','Impact',2,9,'nonlight-melee','Damage as one size larger; add weapon enhancement to bull rush checks.']
])PURCHASED_MAGIC_EFFECTS[id]={name,cost,casterLevel,weaponRequirement,text,slots:['weapon'],manual:true,source:'https://aonprd.com/MagicWeaponsDisplay.aspx?ItemName='+name};
for(const id of ['agile','furious','impact'])PURCHASED_MAGIC_EFFECTS[id].manual=false;
export const purchasedEffectSelectable=id=>!!PURCHASED_MAGIC_EFFECTS[id]&&(!PURCHASED_MAGIC_EFFECTS[id].slots.includes('weapon')||PURCHASED_WEAPON_EFFECT_IDS.includes(id));
export function purchasedEffectFits(id,base){
 const e=PURCHASED_MAGIC_EFFECTS[id];if(!e||!e.slots.includes(base?.kind)||base?.traits?.includes('double')||base?.id==='unarmed-strike')return false;
 const melee=base.handling!=='ranged',thrown=base.rangeIncrementFt>0&&(melee||['dart','javelin','bolas','net','shuriken-5'].includes(base.id));
 switch(e.weaponRequirement??(id==='keen'?'keen':'any')){
  case 'melee':return melee;
  case 'finesse-melee':return melee&&base.finesseEligible===true;
  case 'nonlight-melee':return melee&&['one-handed','two-handed'].includes(base.handling);
  case 'ranged':return base.rangeIncrementFt>0&&(!melee||thrown);
  case 'thrown':return thrown;
  case 'melee-or-thrown':return melee||thrown;
  case 'bludgeoning-melee':return melee&&base.damage?.types?.includes('bludgeoning');
  case 'slashing-melee':return melee&&base.damage?.types?.includes('slashing');
  case 'keen':return melee&&base.damage?.types?.some(t=>['piercing','slashing'].includes(t));
  default:return true;
 }
}

export function validatePurchasedEffects(d){
 if(d.purchased!==undefined&&typeof d.purchased!=='boolean')throw Error('Invalid purchased-item marker.');
 if(d.magicEffect!==undefined){
  if(d.purchased!==true||d.technology||typeof d.magicEffect!=='string'||!Object.hasOwn(PURCHASED_MAGIC_EFFECTS,d.magicEffect))throw Error('Invalid purchased magic effect.');
  const e=PURCHASED_MAGIC_EFFECTS[d.magicEffect];if(!e.slots.includes(d.slot)||e.cost>adaptationSlots(d))throw Error('Special effect cost must not exceed the item enhancement bonus.');
 }
 if(d.magicEffect==='bane'&&(typeof d.magicEffectTarget!=='string'||! /^(aberrations?|animals?|constructs?|dragons?|fey|magical beasts?|monstrous humanoids?|oozes?|plants?|undead|vermin|(?:humanoids?|outsiders?)\s*\([a-z][a-z -]*\))$/i.test(d.magicEffectTarget.trim())||d.magicEffectTarget.length>100))throw Error('Choose the Bane creature type (and subtype for humanoids or outsiders).');
 if(d.magicEffectTarget!==undefined&&(d.magicEffect!=='bane'||typeof d.magicEffectTarget!=='string'||d.magicEffectTarget.length>100))throw Error('Invalid Bane target.');
 if(d.purchased){
  if(!['weapon','armor','shield'].includes(d.slot)||adaptationSlots(d)<1)throw Error('Purchased enhanced equipment requires at least +1 enhancement.');
  if((d.adaptations?.length??0)+(d.magicEffect?1:0)>1)throw Error('Purchased equipment allows at most one special effect.');
  if(d.effects?.length!==1)throw Error('Purchased equipment uses one enhancement entry and at most one special effect.');
 }
}
export function validatePurchasedBase(d,base){if(d.magicEffect&&!purchasedEffectFits(d.magicEffect,base))throw Error('This special effect is incompatible with the base item.');}
export function purchasedEffectPrice(d){const e=PURCHASED_MAGIC_EFFECTS[d.magicEffect];if(!e)return null;const bonus=adaptationSlots(d),multiplier=d.slot==='weapon'?2000:1000;return {name:e.name,price:((bonus+e.cost)**2-bonus**2)*multiplier,components:0,formula:`(${bonus+e.cost}² − ${bonus}²) × ${multiplier} gp`};}
