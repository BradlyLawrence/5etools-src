import {selectedArchetypes,occupiedSlots,archetypeIds} from './archetypes.mjs';
import spells from './spellcasting-data.mjs';
export const bardLevel=c=>c.classes?.bard??0;
export const hasBard=(c,id)=>bardLevel(c)>0&&archetypeIds(c,'bard').includes(id);
export const replacedBardSlot=(c,id)=>selectedArchetypes(c,'bard').some(p=>occupiedSlots(p).includes(id));
const options=c=>c.builder?.classOptions??{};
const mod=(c,id)=>Math.floor(((c.abilities?.[id]??10)-10)/2);
// These are the currently enabled arcane spellcasting classes. Alchemist extracts are not arcane spells.
export const BARD_ARCANE_SOURCES=['bard','sorcerer','wizard'];
export const VERSATILE={act:['bluff','disguise'],comedy:['bluff','intimidate'],dance:['acrobatics','fly'],keyboard:['diplomacy','intimidate'],oratory:['diplomacy','sense-motive'],percussion:['handle-animal','intimidate'],sing:['bluff','sense-motive'],string:['bluff','diplomacy'],wind:['diplomacy','handle-animal']};
const spellLevels=[2,6,10,14,18];
export function bardSpellSpecs(c){
 if(!hasBard(c,'magician')&&!hasBard(c,'dirge-bard'))return [];
 const b=options(c),necro=hasBard(c,'dirge-bard');
 return spellLevels.filter(at=>at<=bardLevel(c)).map(at=>{
  const max=Math.max(...Object.entries(spells.classes.bard.daily[at-1]).filter(([n,v])=>v!==null&&Number(n)<=(c.abilities?.cha??10)-10).map(([n])=>+n),0);
  const used=spellLevels.filter(n=>n<at).map(n=>b['bard-bonus-spell-'+n]?.split('|')[0]);
  return {id:'bard-bonus-spell-'+at,label:(necro?'Secrets of the Grave':'Expanded Repertoire')+' (bard level '+at+')',maximumSpellLevel:max,
   options:spells.spells.filter(s=>(!necro||s.school==='necromancy')&&!used.includes(s.id)).flatMap(s=>BARD_ARCANE_SOURCES.filter(cls=>Number.isInteger(s.levels[cls])&&s.levels[cls]<=max).map(cls=>({id:s.id+'|'+cls,spellId:s.id,sourceClass:cls,spellLevel:s.levels[cls],name:s.name+' — '+cls+' '+s.levels[cls],text:s.text,description:s.text}))) };
 });
}
export function bardBonusSpells(c){return bardSpellSpecs(c).flatMap(s=>{const o=s.options.find(o=>o.id===options(c)[s.id]);return o?[{id:o.spellId,level:o.spellLevel,sourceClass:o.sourceClass}]:[];});}
export function bardSpecs(c){
 const out= bardSpellSpecs(c),b=options(c),n=bardLevel(c);
 if(hasBard(c,'magician')&&n>=5)out.push({id:'bard-arcane-bond',label:'Magician bonded object',options:['amulet','ring','staff','wand'].map(id=>({id,name:id}))});
 if(n&&!replacedBardSlot(c,'versatile-performance'))for(const at of spellLevels.filter(at=>at<=n))out.push({id:'bard-versatile-'+at,label:'Versatile performance (level '+at+')',options:Object.keys(VERSATILE).filter(id=>!spellLevels.filter(x=>x<at).some(x=>b['bard-versatile-'+x]===id)).map(id=>({id,name:id,text:'Use your Perform ('+id+') bonus for '+VERSATILE[id].join(' and ')+'.'}))});
 return out;
}
export function bardEffects(c,conditions={}){
 const n=bardLevel(c);if(!n)return [];
 const out=[],add=(target,value,name,bonusType='untyped')=>{if(value)out.push({kind:'modifier',target,value,name,bonusType,featId:'bard.'+name});};
 const half=Math.floor(n/2),power=1+(n>=5?1:0)+(n>=11?1:0)+(n>=17?1:0);
 if(!replacedBardSlot(c,'bardic-knowledge'))for(const skill of ['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'])add('skill.knowledge-'+skill,half,'Bardic Knowledge');
 if(hasBard(c,'court-bard'))for(const id of ['diplomacy','knowledge-history','knowledge-local','knowledge-nobility'])add('skill.'+id,Math.max(1,half),'Heraldic Expertise');
 if(hasBard(c,'magician'))for(const id of ['knowledge-arcana','spellcraft','use-magic-device'])add('skill.'+id,half,'Magical Talent');
 if(hasBard(c,'archivist')&&n>=2&&conditions['class-option.bard-magic-lore'])add('skill.spellcraft',half,'Magic Lore');
 if(hasBard(c,'dirge-bard')&&n>=2&&conditions['class-option.bard-identify-undead'])add('skill.knowledge-religion',half,'Secrets of the Grave');
 if(hasBard(c,'archivist')&&conditions['class-option.bard-naturalist']){add('attack.weapon',power,'Naturalist','insight');add('ac',power,'Naturalist','insight');}
 if(hasBard(c,'archivist')&&conditions['class-option.bard-naturalist-save'])for(const save of ['fortitude','reflex','will'])add('save.'+save,power,'Naturalist','insight');
 if(!replacedBardSlot(c,'inspire-courage')&&conditions['class-option.bard-inspire-courage']){add('attack.weapon',power,'Inspire Courage','competence');add('damage.weapon',power,'Inspire Courage','competence');}
 let saveBonus=0,saveName='';
 if(n>=2&&!replacedBardSlot(c,'well-versed')&&conditions['class-option.bard-well-versed']){saveBonus=4;saveName='Well-Versed';}
 if(n>=2&&hasBard(c,'archivist')&&conditions['class-option.bard-magic-save']){saveBonus=4;saveName='Magic Lore';}
 if(n>=2&&hasBard(c,'dirge-bard')&&conditions['class-option.bard-haunted-eyes']){saveBonus=4;saveName='Haunted Eyes';}
 if(saveBonus)for(const save of ['fortitude','reflex','will'])add('save.'+save,saveBonus,saveName);
 return out;
}
export function bardScenarios(c){
 const n=bardLevel(c);if(!n)return [];
 const out=[],add=(id,label)=>out.push({id:'bard-'+id,label,conditions:{['class-option.bard-'+id]:true}});
 if(!replacedBardSlot(c,'inspire-courage'))add('inspire-courage','Inspire Courage — performing');
 if(n>=2&&!replacedBardSlot(c,'well-versed'))add('well-versed','Well-Versed — saves against bardic performance, sonic or language-dependent effects');
 if(hasBard(c,'archivist')){add('naturalist','Naturalist — identified creature kind, allies can see and hear');add('naturalist-save','Naturalist — saves against abilities of identified creature kind');if(n>=2){add('magic-lore','Magic Lore — identify magic items or decipher scrolls');add('magic-save','Magic Lore — saves against magical traps, language-dependent effects or magical writing');}}
 if(hasBard(c,'dirge-bard')&&n>=2){add('identify-undead','Secrets of the Grave — identify undead');add('haunted-eyes','Haunted Eyes — saves against fear, energy drain, death or necromancy');}
 return out;
}
export function bardSummary(c){
 const n=bardLevel(c);if(!n)return null;
 const cha=mod(c,'cha'),power=1+(n>=5?1:0)+(n>=11?1:0)+(n>=17?1:0);
 return {level:n,cha,dc:10+Math.floor(n/2)+cha,power,performanceRounds:Math.max(0,4+cha+2*(n-1)+6*(c.feats??[]).filter(f=>f.featId==='extra-performance').length),startAction:n>=13?'swift':n>=7?'move':'standard',
  features:selectedArchetypes(c,'bard').flatMap(p=>p.features.filter(f=>f.level<=n).map(f=>({...f,archetype:p.name}))),
  archivist:hasBard(c,'archivist'),court:hasBard(c,'court-bard'),magician:hasBard(c,'magician'),striker:hasBard(c,'sound-striker'),dirge:hasBard(c,'dirge-bard'),
  replaced:[...new Set(selectedArchetypes(c,'bard').flatMap(occupiedSlots))],
  bonusSpells:bardBonusSpells(c),bond:options(c)['bard-arcane-bond'],
  versatile:spellLevels.filter(at=>at<=n&&!replacedBardSlot(c,'versatile-performance')).map(at=>options(c)['bard-versatile-'+at]).filter(Boolean),
  untrainedAll:hasBard(c,'archivist')?n>=5:!replacedBardSlot(c,'jack-of-all-trades')&&n>=10,
  allClassSkills:hasBard(c,'archivist')?n>=11:!replacedBardSlot(c,'jack-of-all-trades')&&n>=16};
}
export function weirdWordsDamage(c,hits,resistance=0){
 if(!hasBard(c,'sound-striker')||bardLevel(c)<6)throw Error('Weird Words is unavailable.');
 if(!Number.isInteger(hits)||hits<1||hits>Math.floor(bardLevel(c)/4))throw Error('Invalid number of words hitting this target.');
 return {dice:4*hits,die:6,bonus:mod(c,'cha'),resistance,average:Math.max(0,14*hits+mod(c,'cha')-resistance),performanceCost:hits};
}
export function applyBardSkillSubstitutions(c,stats){
 const b=bardSummary(c);if(!b)return;
 for(const type of b.versatile){
  const source=stats['skill.perform:'+type];if(!source)continue;
  for(const skill of VERSATILE[type]??[]){const target=stats['skill.'+skill];if(target&&source.total>target.total){target.total=source.total;target.modifier=target.total-target.base;target.breakdown.push({name:'Versatile Performance ('+type+')',value:source.total,applied:true,reason:'Use the Perform total instead of this skill total.'});}}
 }
}
