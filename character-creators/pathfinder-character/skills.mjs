import {optionClassSkills,optionEffects} from './engine/core-options.mjs';
import {favoredBonus} from './advancement.mjs';
import {racialEffects} from './engine/racial.mjs';
import {backgroundDetails} from './backgrounds.mjs';
import CLASSES from './skill-classes.mjs';
export const SPECIALTIES=['craft','perform','profession','artistry','lore'];
const abilities={str:'climb swim',dex:'acrobatics disable-device escape-artist fly ride sleight-of-hand stealth',int:'appraise artistry craft linguistics lore spellcraft tech-use',wis:'heal perception profession sense-motive survival',cha:'bluff diplomacy disguise handle-animal intimidate perform use-magic-device'};
export const SKILLS=Object.fromEntries(Object.entries(abilities).flatMap(([ability,ids])=>ids.split(' ').map(id=>[id,{ability}])));
for(const name of ['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'])SKILLS['knowledge-'+name]={ability:'int'};
const background=new Set(['appraise','artistry','craft','handle-animal','knowledge-engineering','knowledge-geography','knowledge-history','knowledge-nobility','linguistics','lore','perform','profession','sleight-of-hand']);
const trained=new Set(['disable-device','handle-animal','linguistics','lore','profession','sleight-of-hand','spellcraft','tech-use','use-magic-device',...Object.keys(SKILLS).filter(k=>k.startsWith('knowledge-'))]);
export const skillName=id=>{const [name,...specialty]=id.split(':').map(part=>part.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()));return specialty.length?`${name} (${specialty.join(' ')})`:name;};
export function skillInfo(id){const base=id.split(':')[0];return SKILLS[base]?{...SKILLS[base],background:background.has(base),trained:trained.has(base),base}:null;}
export function validateAllocations(allocations){
 if(!allocations||typeof allocations!=='object'||Array.isArray(allocations))throw Error('Invalid skill allocations.');
 for(const [id,v] of Object.entries(allocations))if(!skillInfo(id)||!v||!['normal','background'].every(k=>Number.isInteger(v[k])&&v[k]>=0&&v[k]<=40))throw Error('Invalid skill ranks.');
}
export function calculateSkills(c,r){
 const intMod=Math.floor((r.abilities.int-10)/2),human=c.builder.raceId==='humans'?1:0;
 const breakdown=Object.entries(r.classes).map(([id,levels])=>({id,levels,base:CLASSES[id]?.ranks??0,perLevel:Math.max(1,(CLASSES[id]?.ranks??0)+intMod)+human}));
 const normal=breakdown.reduce((n,x)=>n+x.levels*x.perLevel,0)+c.builder.classOrder.filter((_,i)=>favoredBonus(c,i)==='skill').length,backgroundBudget=r.level*2;
 const bg=backgroundDetails(c.background);
 const classSet=new Set([...optionClassSkills({...c,classes:r.classes}),...bg.classSkills,'lore',...Object.keys(r.classes).flatMap(id=>CLASSES[id]?.skills??[])]);
 if(classSet.has('craft')||classSet.has('perform'))classSet.add('artistry');
 const allocations=c.builder.skills??{},ids=[...new Set([...Object.keys(SKILLS).filter(id=>!SPECIALTIES.includes(id)),...Object.keys(allocations),...(c.builder.racialSkill?[c.builder.racialSkill]:[]),...bg.effects.filter(e=>e.target.startsWith('skill.')).map(e=>e.target.slice(6))])].sort();
 let normalSpent=0,backgroundSpent=0;const issues=[];
 const rows=ids.map(id=>{
  const info=skillInfo(id);if(!info)return null;
  const allocation=allocations[id]??{normal:0,background:0},ranks=allocation.normal+allocation.background;
  normalSpent+=allocation.normal;backgroundSpent+=allocation.background;
  if(ranks>r.level)issues.push(`${skillName(id)} exceeds the ${r.level}-rank limit.`);
  if(allocation.background&&!info.background)issues.push(`${skillName(id)} cannot use background ranks.`);
  if(SPECIALTIES.includes(id)&&ranks)issues.push(`Choose a specialty for ${skillName(id)}.`);
  const classSkill=classSet.has(info.base),ability=Math.floor((r.abilities[info.ability]-10)/2),classBonus=classSkill&&ranks>0?3:0;
  const backgroundBonus=Math.max(0,...bg.effects.filter(e=>e.target==='skill.'+id).map(e=>e.value));
  const racialBonus=racialEffects(c).filter(e=>e.target==='skill.'+id).reduce((n,e)=>n+e.value,0);
  return {id,racialBonus,backgroundBonus,...info,isBackground:info.background,...allocation,ranks,classSkill,abilityBonus:ability,classBonus,total:ranks+ability+classBonus+backgroundBonus+racialBonus+optionEffects({...c,classes:r.classes}).filter(e=>e.target==='skill.'+id).reduce((n,e)=>n+e.value,0)};
 }).filter(Boolean);
 if(normalSpent>normal)issues.push(`Normal skill ranks exceed the budget by ${normalSpent-normal}.`);
 if(backgroundSpent>backgroundBudget)issues.push(`Background skill ranks exceed the budget by ${backgroundSpent-backgroundBudget}.`);
 if(normalSpent<normal)issues.push(`${normal-normalSpent} normal skill ranks remain.`);
 if(backgroundSpent<backgroundBudget)issues.push(`${backgroundBudget-backgroundSpent} background skill ranks remain.`);
 return {normal,background:backgroundBudget,normalSpent,backgroundSpent,breakdown,rows,issues,classSkills:rows.filter(x=>x.classSkill).map(x=>x.id),skillRanks:Object.fromEntries(rows.map(x=>[x.id,x.ranks]))};
}
