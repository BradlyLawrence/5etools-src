import {wizardrySummary,smiteLevel} from './practiced.mjs';
import {mountAdvancement} from './justiciar.mjs';
import packs from './paladin-archetypes-data.mjs';
import muralis from './muralis-data.mjs';
export const paladinLevel=c=>c.classes?.paladin??c.builder?.classOrder?.filter(id=>id==='paladin').length??0;
export const hasPaladin=(c,id)=>paladinLevel(c)>0&&(c.builder?.archetypes?.paladin??[]).includes(id);
export const paladinPacks=c=>paladinLevel(c)>0?packs.filter(p=>(c.builder?.archetypes?.paladin??[]).includes(p.id)):[];
export const paladinSlotTaken=(c,slot)=>paladinPacks(c).some(p=>[...p.replacements,...p.alterations].includes(slot))||(hasPaladin(c,'holy-guide')&&c.builder?.classOptions?.['paladin-exchange-'+slot]==='terrain');
export const paladinHasChannel=c=>paladinLevel(c)>=4&&(!paladinSlotTaken(c,'channel-positive-energy')||hasPaladin(c,'hospitaler'));
export const paladinBond=c=>paladinLevel(c)<5?null:hasPaladin(c,'shining-knight')?'mount':hasPaladin(c,'divine-defender')?'armor':hasPaladin(c,'oath-of-charity')?null:c.builder?.classOptions?.['paladin-bond'];
export const paladinOathSpells=c=>paladinPacks(c).flatMap(p=>Object.entries(p.oathSpells??{}).map(([level,id])=>({level:+level,id})));
export const COVENANT_ENERGIES=['acid','cold','electricity','fire'];
export function paladinCovenant(c){
 if(!hasPaladin(c,'oath-of-the-draconic-covenant'))return null;
 const n=paladinLevel(c),chosen=c.builder?.classOptions?.['paladin-covenant-energy'],energy=COVENANT_ENERGIES.includes(chosen)?chosen:null;
 return {energy,resistance:energy?(n>=20?30:n>=14?20:n>=8?10:n>=3?5:0):0,radius:n>=20?30:n>=14?20:n>=8?10:0,layOnHandsCost:1,durationRounds:10,action:'standard'};
}
export function paladinCovenantMountResistance(c,{living=false,ridden=false}={}){
 const covenant=paladinCovenant(c);return living&&ridden&&covenant?.resistance?{energy:covenant.energy,value:covenant.resistance}:null;
}
export function paladinSpecs(c){
 const n=paladinLevel(c),out=[],add=(id,label,options)=>out.push({id,label,options});
 if(hasPaladin(c,'oath-of-the-draconic-covenant'))add('paladin-covenant-energy','Lasting covenant energy',COVENANT_ENERGIES.map(id=>({id,name:id})));
 if(hasPaladin(c,'holy-guide')){
  const terrains=['cold','desert','forest','jungle','mountain','plains','planes','swamp','underground','urban','water'];
  for(const at of [3,9,12,15,18].filter(at=>at<=n)){
   if(at>3){const occupied=paladinPacks(c).some(p=>p.id!=='holy-guide'&&[...p.replacements,...p.alterations].includes('mercy-'+at));if(occupied)continue;add('paladin-exchange-mercy-'+at,'Level '+at+' mercy or terrain',[{id:'mercy',name:'Retain mercy'},{id:'terrain',name:'Exchange for favoured terrain'}]);}
   if(at===3||c.builder?.classOptions?.['paladin-exchange-mercy-'+at]==='terrain'){
    add('paladin-terrain-'+at,'Favoured terrain at '+at,terrains.map(id=>({id,name:id})));
    if(at>3)add('paladin-terrain-boost-'+at,'Terrain bonus increase at '+at,terrains.filter(id=>[3,9,12,15,18].filter(x=>x<=at).some(x=>c.builder?.classOptions?.['paladin-terrain-'+x]===id)).map(id=>({id,name:id})));
   }
  }
 }
 return out;
}
export function paladinSummary(c){
 const n=paladinLevel(c);if(!n)return null;
 const cha=Math.floor(((c.abilities?.cha??10)-10)/2),has=id=>hasPaladin(c,id),half=Math.floor(n/2),smite=has('oath-of-loyalty')?0:has('hospitaler')?1+Math.floor((n-1)/6):1+Math.floor((n-1)/3);
 const warnings=[];
 if(has('oath-of-loyalty'))warnings.push('Loyalty removes Smite Evil. Retained smite-dependent abilities (including Aura of Justice, Knight’s Charge fear, teamwork sharing and smite-powered oaths) cannot spend or use smites. No replacement benefit is granted.');
 if(has('oath-of-chastity')&&has('shining-knight'))warnings.push('Pure of Mind replaces Divine Grace; Skilled Rider has no Divine Grace benefit to share.');
 if(has('warrior-of-the-holy-light'))warnings.push('No paladin spellcasting or paladin caster level. Published oath spells do not restore slots or grant free castings. Other class casting remains separate; item activation must use an independently valid route.');
 if(has('oath-of-charity')&&!Array.from({length:6},(_,i)=>3+i*3).some(at=>at<=n&&!paladinSlotTaken(c,'mercy-'+at)))warnings.push('Charitable Mercy has no retained mercy selections to change.');
 const immunities=[...(n>=3&&!paladinSlotTaken(c,'aura-of-courage')?['fear']:[]),...(n>=3&&!paladinSlotTaken(c,'divine-health')?['disease']:[]),...(n>=8&&!paladinSlotTaken(c,'aura-of-resolve')?['charm']:[]),...(n>=17&&!paladinSlotTaken(c,'aura-of-righteousness')?['compulsion']:[])];
 return {wizardry:wizardrySummary(c),smiteLevel:smiteLevel(c),covenant:paladinCovenant(c),level:n,dc:10+half+cha,immunities,fortification:has('oath-of-chastity')&&n>=8?50:0,smiteUses:smite,layOnHands:n>=2?{dice:half+'d6',uses:Math.max(0,half+cha+(has('warrior-of-the-holy-light')?Math.floor(n/4):0)),selfMultiplier:has('oath-of-charity')?.5:1,otherMultiplier:has('oath-of-charity')?1.5:1}:null,channel:paladinHasChannel(c)?{dice:(has('hospitaler')?Math.floor((n-2)/2):half)+'d6',uses:has('hospitaler')?Math.max(0,3+cha):null,layOnHandsCost:has('hospitaler')?0:2,undeadCost:has('oath-against-undeath')&&n>=11?1:null}:null,bond:paladinBond(c),warnings,
 intercession:has('oath-of-intercession')?{uses:1+Math.floor((n-1)/6),prevention:'1d6+'+n}:null,
 mercy:has('oath-of-mercy')&&n>=3?{dice:half+'d4',cost:2,radius:n>=15?30:n>=12?25:n>=9?20:n>=6?15:10,conditions:[...['shaken','sickened'],...(n>=6?['fatigued','staggered']:[]),...(n>=9?['frightened','nauseated']:[]),...(n>=12?['exhausted','stunned']:[]),...(n>=15?['panicked','fear-caused cowering']:[]),...(n>=18?['blinded','deafened']:[])],conditionLimit:1}:null,
 hospitality:has('oath-of-hospitality')&&n>=4?{portions:half,cost:2,shelfLifeHours:24,spells:['endure elements','remove fear',...(n>=10?["bull’s strength","bear’s endurance","cat’s grace"]:[]),...(n>=16?["owl’s wisdom","eagle’s splendor","fox’s cunning"]:[])],individualSelections:n>=16}:null,
 holyLight:has('warrior-of-the-holy-light')&&n>=4?{bonus:n>=20?2:1,radius:n>=20?60:30,shiningUses:n>=14?1+Math.floor((n-14)/3):0,shiningDice:half+'d6',neutralHealing:true}:null,
 mount:paladinBond(c)==='mount'&&c.builder?.classOptions?.['paladin-mount']==='muralis'?{name:'Muralis',effectiveDruidLevel:n+mountAdvancement(c),minimumIntelligence:6,summons:1+Math.floor((n-5)/4),celestial:n>=11,spellResistance:n>=15?n+11:0,traits:muralis.traits,level5Example:n===5?muralis.level5Example:null,carryingExample:n===5?muralis.loadExample:null}:null};
}
export function paladinEffects(c,equipment,conditions={}){
 const n=paladinLevel(c),out=[];if(!n)return out;
 const add=(target,value,name,bonusType='untyped')=>out.push({kind:'modifier',target,value,name,bonusType,featId:'paladin.'+name});
 const cha=Math.max(0,Math.floor(((c.abilities?.cha??10)-10)/2));
 if(n>=2)for(const save of ['fortitude','reflex','will'])if(!paladinSlotTaken(c,'divine-grace')||hasPaladin(c,'oath-of-chastity')&&save==='will')add('save.'+save,cha,'Divine grace / pure of mind');
 if(n>=3&&hasPaladin(c,'shining-knight')&&equipment?.armor)add('skill.ride',-Math.min(0,equipment.armor.defense?.armorCheckPenalty??0),'Skilled rider');
 if(n>=4&&hasPaladin(c,'warrior-of-the-holy-light')&&conditions['class-option.power-of-faith'])for(const target of ['attack.weapon','damage.weapon','ac'])add(target,n>=20?2:1,'Power of Faith','morale');
 if(n>=2&&hasPaladin(c,'oath-of-chastity')&&conditions['class-option.charm-or-figment'])for(const save of ['fortitude','reflex','will'])add('save.'+save,4,'Pure of Mind','sacred');
 if(n>=3&&hasPaladin(c,'oath-against-corruption')&&conditions['class-option.aberration-effect'])for(const save of ['fortitude','reflex','will'])add('save.'+save,4,'Aura of Purity','sacred');
 if(n>=8&&hasPaladin(c,'oath-against-undeath')&&conditions['class-option.negative-level'])for(const save of ['fortitude','reflex','will'])add('save.'+save,4,'Aura of Life','morale');
 if(hasPaladin(c,'holy-guide')&&conditions['class-option.paladin-terrain']){
  const b=c.builder?.classOptions??{},totals={};for(const at of [3,9,12,15,18].filter(at=>at<=n&&(at===3||b['paladin-exchange-mercy-'+at]==='terrain'))){const id=b['paladin-terrain-'+at];if(id)totals[id]=(totals[id]??0)+2;const boost=b['paladin-terrain-boost-'+at];if(at>3&&boost)totals[boost]=(totals[boost]??0)+2;}
  const bonus=totals[conditions['class-option.paladin-terrain']]??0;for(const target of ['initiative','skill.perception','skill.stealth','skill.survival','skill.knowledge-geography'])add(target,bonus,'Holy Guide terrain');
 }
 return out;
}
export function paladinScenarios(c){
 const n=paladinLevel(c);if(!n)return [];
 const rows=[],add=(id,label)=>rows.push({id,label,conditions:{['class-option.'+id]:true}});
 if(n>=4&&hasPaladin(c,'warrior-of-the-holy-light'))add('power-of-faith','Within active Power of Faith');
 if(n>=2&&hasPaladin(c,'oath-of-chastity'))add('charm-or-figment','Saving throw against charm or figment');
 if(n>=3&&hasPaladin(c,'oath-against-corruption'))add('aberration-effect','Saving throw against an aberration’s effect');
 if(n>=8&&hasPaladin(c,'oath-against-undeath'))add('negative-level','Saving throw against or to overcome negative levels');
 if(hasPaladin(c,'holy-guide'))for(const id of new Set([3,9,12,15,18].filter(at=>at<=n&&(at===3||c.builder?.classOptions?.['paladin-exchange-mercy-'+at]==='terrain')).map(at=>c.builder?.classOptions?.['paladin-terrain-'+at]).filter(Boolean)))rows.push({id:'paladin-terrain-'+id,label:'Holy Guide: '+id+' terrain',conditions:{'class-option.paladin-terrain':id}});
 return rows;
}
