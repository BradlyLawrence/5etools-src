// Private item designs: estimates, validation and sheet effects. No shared catalogue mutation.
export const MAGIC_SOURCE='https://www.d20pfsrd.com/magic-items/magic-item-creation/';
export const EFFECTS={weapon:'Weapon enhancement',armor:'Armour / shield enhancement',ability:'Ability enhancement',deflection:'Deflection AC',natural:'Natural armour enhancement',resistance:'All saves (resistance)',skill:'Skill (competence)',spellResistance:'Spell resistance',bonusSpell:'Bonus spell (pearl of power)',scroll:'Scroll',potion:'Potion',wand:'Wand (50 charges)',command:'Command-word spell',continuous:'Continuous spell',custom:'Other effect (enter price)'};
export const SLOTS=['weapon','armor','shield','head','headband','eyes','neck','shoulders','chest','body','belt','wrists','hands','ring1','ring2','feet','slotless'];
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const num=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function validateMagicItem(d){
 check(d&&typeof d==='object'&&!Array.isArray(d),'Invalid magic item.');
 check(typeof d.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(d.id),'Invalid item ID.');
 check(typeof d.name==='string'&&d.name.trim()&&d.name.length<=120,'Give the item a name (up to 120 characters).');
 check(typeof d.description==='string'&&d.description.length<=10000,'Invalid description.');
 check(SLOTS.includes(d.slot),'Choose an item slot.');
 check(typeof d.baseId==='string'&&d.baseId.length<=120,'Invalid base item.');
 check(!['weapon','armor','shield'].includes(d.slot)||d.baseId.length>0,'Choose base equipment.');
 check(num(d.basePrice,0,1e8)&&num(d.weight,0,10000),'Invalid base price or weight.');
 check(Number.isInteger(d.casterLevel)&&num(d.casterLevel,1,20),'Caster level must be 1–20.');
 check(Number.isInteger(d.missing)&&num(d.missing,0,20)&&typeof d.accelerated==='boolean','Invalid crafting requirements.');
 check(typeof d.requirements==='string'&&d.requirements.length<=4000,'Invalid prerequisites.');
 check(d.priceOverride===null||num(d.priceOverride,0,1e9),'Invalid final price.');
 check(Array.isArray(d.effects)&&d.effects.length>=1&&d.effects.length<=20,'Include 1–20 effects.');
 for(const e of d.effects){
  check(e&&Object.hasOwn(EFFECTS,e.kind),'Unknown effect.');
  check(num(e.value,0,1e8)&&typeof e.detail==='string'&&e.detail.length<=3000,'Invalid effect value or description.');
  check(typeof e.target==='string'&&e.target.length<=100,'Invalid effect target.');
  if(e.kind==='ability')check(['str','dex','con','int','wis','cha'].includes(e.target)&&[2,4,6].includes(e.value),'Ability enhancements use +2, +4 or +6.');
  if(e.kind==='skill')check(/^[a-z][a-z0-9:-]*$/.test(e.target)&&Number.isInteger(e.value)&&num(e.value,1,30),'Choose a skill and bonus of 1–30.');
  if(['weapon','armor','deflection','natural','resistance'].includes(e.kind))check(Number.isInteger(e.value)&&num(e.value,1,5),'This bonus must be 1–5.');
  if(e.kind==='weapon'||e.kind==='armor')check(d.slot===(e.kind==='weapon'?'weapon':d.slot)&&['armor','shield','weapon'].includes(d.slot)&&(e.kind!=='armor'||d.slot!=='weapon'),'Enhancement must match the equipment slot.');
  if(e.kind==='spellResistance')check(Number.isInteger(e.value)&&num(e.value,13,40),'Spell resistance must be at least 13.');
  if(e.kind==='bonusSpell')check(Number.isInteger(e.value)&&num(e.value,1,9),'Bonus spell level must be 1–9.');
  if(['scroll','potion','wand','command','continuous'].includes(e.kind)){
   check(Number.isInteger(e.value)&&num(e.value,0,e.kind==='potion'?3:e.kind==='wand'?4:9),'Invalid spell level.');
   check(Number.isInteger(e.casterLevel)&&num(e.casterLevel,1,20),'Effect caster level must be 1–20.');
   check(Number.isInteger(e.daily)&&num(e.daily,0,5)&&num(e.components,0,1e7),'Invalid uses or component cost.');
   check(['rounds','minutes','tenMinutes','hours','day'].includes(e.duration),'Invalid spell duration.');
  }
 }
 for(const k of ['weapon','armor'])check(d.effects.filter(e=>e.kind===k).length<=1,'Use one enhancement entry.');
 return d;
}
export function priceMagicItem(input){
 const d=validateMagicItem(input),consumable=d.effects.some(e=>['scroll','potion','wand'].includes(e.kind));
 check(!consumable||(d.effects.length===1&&d.slot==='slotless'&&d.missing===0),'Scrolls, potions and wands each hold one effect, use no body slot and cannot bypass prerequisites.');
 const lines=d.effects.map(e=>{let price=0,components=0,formula='';const b=e.value;
  const multipliers={weapon:2000,armor:1000,ability:1000,deflection:2000,natural:2000,resistance:1000,skill:100,bonusSpell:1000};
  if(e.kind in multipliers){price=b*b*multipliers[e.kind];formula=`${b} × ${b} × ${multipliers[e.kind]} gp`;}
  else if(e.kind==='spellResistance'){price=(b-12)*10000;formula=`(${b} − 12) × 10,000 gp`;}
  else if(e.kind==='custom'){price=b;formula='Entered effect price';}
  else {const multiplier={scroll:25,potion:50,wand:750,command:1800,continuous:2000}[e.kind];price=(b||.5)*e.casterLevel*multiplier;formula=`${b||.5} × ${e.casterLevel} × ${multiplier} gp`;
   if(e.kind==='continuous'){const m={rounds:4,minutes:2,tenMinutes:1.5,hours:1,day:.5}[e.duration];price*=m;formula+=` × ${m} duration`;}
   if(['command','continuous'].includes(e.kind)&&e.daily){price*=e.daily/5;formula+=` × ${e.daily}/5 daily uses`;}
   components=e.components*(e.kind==='wand'?50:['scroll','potion'].includes(e.kind)?1:e.daily?50:100);
  }
  return {name:EFFECTS[e.kind],price,components,formula};
 });
 const gear=['weapon','armor','shield'].includes(d.slot),masterwork=gear?(d.slot==='weapon'?300:150):0;
 // Different powers on a body-slot item cost 50% extra except its most costly power.
 // Weapons/armour have category-specific rules: flat additions here need comparison/GM review.
 const max=Math.max(...lines.map(l=>l.price));let first=true;
 for(const l of lines){const highest=l.price===max&&first;if(highest)first=false;l.multiplier=!gear&&d.slot!=='slotless'&&!highest?1.5:!consumable&&d.slot==='slotless'&&d.effects[lines.indexOf(l)].kind!=='bonusSpell'?2:1;l.adjusted=l.price*l.multiplier;}
 const base=lines.reduce((n,l)=>n+l.adjusted,0),components=lines.reduce((n,l)=>n+l.components,0),mundane=d.basePrice+masterwork;
 const estimate=base+components+mundane,market=d.priceOverride??estimate;
 check(market>=components+mundane,'Final price cannot be below the base item and component costs.');
 const pricedMagic=market-components-mundane,materials=pricedMagic/2+components+mundane;
 const short=d.effects.length===1&&['scroll','potion'].includes(d.effects[0].kind)&&pricedMagic<=250;
 const hours=short?2:Math.max(1,Math.ceil(pricedMagic/1000))*(d.accelerated?4:8);
 return {lines,masterwork,base,components,mundane,estimate,market,materials,hours,days:Math.max(1,Math.ceil(hours/8)),dc:5+d.casterLevel+5*d.missing+(d.accelerated?5:0),mandatory:consumable?'The creation feat and all prerequisites are mandatory.':'The creation feat is mandatory; each bypassed prerequisite adds +5 DC.'};
}
export function validateCraftedItems(c){
 if(c.craftedItems===undefined)return;
 check(Array.isArray(c.craftedItems)&&c.craftedItems.length<=100,'Invalid crafted inventory.');
 const ids=new Set();for(const i of c.craftedItems){priceMagicItem(i.design);check(typeof i.instanceId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(i.instanceId)&&!ids.has(i.instanceId),'Invalid crafted item instance.');ids.add(i.instanceId);check(typeof i.equipped==='boolean','Invalid equipped state.');}
 const active=new Set();for(const i of c.craftedItems.filter(i=>i.equipped&&i.design.slot!=='slotless')){check(!active.has(i.design.slot),'Two crafted items occupy the same slot.');active.add(i.design.slot);}
}
export function activeCrafted(c){return (c.craftedItems??[]).filter(i=>i.equipped&&(!['weapon','armor','shield'].includes(i.design.slot)||c.equipment?.[i.design.slot+'Id']===i.design.baseId));}
export function craftedEnhancement(c,slot){return Math.max(0,...activeCrafted(c).filter(i=>i.design.slot===slot).flatMap(i=>i.design.effects.filter(e=>e.kind==='armor').map(e=>e.value)));}
export function craftedAbilityScores(input){const c=structuredClone(input);for(const a of ['str','dex','con','int','wis','cha']){const n=Math.max(0,...activeCrafted(c).flatMap(i=>i.design.effects.filter(e=>e.kind==='ability'&&e.target===a).map(e=>e.value)));c.abilities[a]+=n;}return c;}
export function craftedEffects(c){const result=[];for(const i of activeCrafted(c)){
 const add=(target,value,bonusType)=>result.push({kind:'modifier',target,value,bonusType,featId:'crafted.'+i.instanceId,name:i.design.name});
 if(i.design.slot==='weapon')add('attack.weapon',1,'enhancement'); // masterwork
 for(const e of i.design.effects){
  if(e.kind==='weapon'){add('attack.weapon',e.value,'enhancement');add('damage.weapon',e.value,'enhancement');}
  if(e.kind==='deflection')add('ac',e.value,'deflection');
  if(e.kind==='natural')add('ac',e.value,'natural-armor-enhancement');
  if(e.kind==='resistance')for(const s of ['fortitude','reflex','will'])add('save.'+s,e.value,'resistance');
  if(e.kind==='skill')add('skill.'+e.target,e.value,'competence');
 }
 }return result;}
