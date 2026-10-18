import {archetypeIds,selectedArchetypes,ROGUE_ARCHETYPES} from './archetypes.mjs';
export const hasRogue=(c,id)=>(c.classes?.rogue??0)>0&&archetypeIds(c,'rogue').includes(id);
const replaced=(c,id)=>selectedArchetypes(c,'rogue').some(p=>p.replacements.includes(id));
export function rogueSummary(c,weapon,dice=0){
 const level=c.classes?.rogue??0;if(!level)return null;
 const knife=hasRogue(c,'knife-master'),thug=hasRogue(c,'thug');
 const eligible=ROGUE_ARCHETYPES.find(p=>p.id==='knife-master').features.find(f=>f.id==='sneak-stab').parameters.qualifyingWeapons;
 const die=knife?(eligible.includes(weapon?.baseItemId??weapon?.derivedFrom??weapon?.id)?8:4):6;
 return {level,sneakDice:dice,sneakDie:die,sneakDamage:`${dice}d${die}`,trapfinding:replaced(c,'trapfinding')?0:Math.max(1,Math.floor(level/2)),trapSense:replaced(c,'trap-sense')?0:Math.floor(level/3),evasion:level>=2,uncannyDodge:level>=4&&!replaced(c,'uncanny-dodge'),improvedUncannyDodge:level>=8&&!replaced(c,'improved-uncanny-dodge'),hiddenBlade:knife?Math.floor(level/2):0,bladeSense:knife?Math.floor(level/3):0,carefulDisarm:level>=4&&(hasRogue(c,'burglar')||hasRogue(c,'trapsmith')),distraction:level>=8&&hasRogue(c,'burglar'),trapMaster:level>=8&&hasRogue(c,'trapsmith'),frightening:thug,brutalBeating:thug&&level>=3?{damage:`${Math.max(0,dice-1)}d${die}`,duration:Math.floor(level/2)}:null,poisonUse:hasRogue(c,'poisoner'),masterPoisoner:hasRogue(c,'poisoner')&&level>=3?Math.floor(level/2):0};
}
export function rogueEffects(c,conditions={}){
 const r=rogueSummary(c);if(!r)return [];
 const out=[],add=(target,value,name,bonusType='untyped')=>{if(value)out.push({kind:'modifier',target,value,name,bonusType,featId:'rogue.'+name});};
 if(r.trapfinding){add('skill.disable-device',r.trapfinding,'Trapfinding');if(conditions['class-option.rogue.find-trap'])add('skill.perception',r.trapfinding,'Trapfinding');}
 if(conditions['class-option.rogue.conceal-blade'])add('skill.sleight-of-hand',r.hiddenBlade,'Hidden Blade');
 if(conditions['class-option.rogue.light-blade'])add('ac',r.bladeSense,'Blade Sense','dodge');
 if(conditions['class-option.trap']||conditions['class-option.rogue.triggered-trap']){
  const bonus=r.trapSense*(conditions['class-option.rogue.triggered-trap']&&r.carefulDisarm?2:1);
  add('ac',bonus,'Rogue Trap Sense','dodge');add('save.reflex',bonus,'Rogue Trap Sense');
 }
 if(conditions['class-option.rogue.poison-work'])for(const id of new Set(['craft:alchemy',...Object.keys(c.skillRanks??{}).filter(id=>/^craft:alchemy$/i.test(id))]))add('skill.'+id,r.masterPoisoner,'Master Poisoner');
 return out;
}
export function rogueScenarios(c){
 const r=rogueSummary(c);if(!r)return [];
 const out=[],add=(id,label,conditions={['class-option.'+id]:true})=>out.push({id,label,conditions});
 if(r.trapfinding)add('rogue.find-trap','Trapfinding — Perception to locate traps');
 if(r.trapSense)add('rogue.trap','Trap Sense — AC and Reflex against traps',{'class-option.trap':true});
 if(r.carefulDisarm&&r.trapSense)add('rogue.triggered-trap','Careful Disarm — trap triggered while disarming');
 if(r.hiddenBlade)add('rogue.conceal-blade','Hidden Blade — conceal a light blade');
 if(r.bladeSense)add('rogue.light-blade','Blade Sense — attacked with a light blade');
 if(r.masterPoisoner)add('rogue.poison-work','Master Poisoner — Craft (alchemy) when working with poison');
 return out;
}
