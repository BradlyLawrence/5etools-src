import entries from './background-data.mjs';
import {featSlots,slotAllows} from './feat-progression.mjs';
export const BACKGROUNDS=entries;
const traitLists={social:['bully','child-of-the-streets','fast-talker','poverty-stricken','suspicious'],combat:['anatomist','deft-dodger','resilient','reactionary','courageous'],faith:['indomitable-faith','caretaker'],magic:['classically-schooled','dangerously-curious','focused-mind','skeptic']};
const listOf=id=>Object.keys(traitLists).find(key=>traitLists[key].includes(id));
export function hasAdditionalTraits(c){return !!c?.feats?.some(f=>f.featId==='additional-traits'&&(!f.creatorSlot||featSlots(c).some(s=>s.id===f.creatorSlot&&slotAllows(s,{id:f.featId,name:'Additional Traits',combat:false}))));}
export function additionalTraitOptions(b,index){const used=[b?.id,...(b?.traits??[]).filter((_,i)=>i!==index)];return entries.filter(t=>!used.includes(t.id)&&!used.some(id=>listOf(id)===listOf(t.id)));}
const plainSkills='acrobatics appraise bluff climb diplomacy disable-device disguise escape-artist fly handle-animal heal intimidate linguistics perception ride sense-motive sleight-of-hand spellcraft stealth survival swim tech-use use-magic-device'.split(' ');
export function validBackgroundSkill(id){return typeof id==='string'&&(plainSkills.includes(id)||/^knowledge-(arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)$/.test(id)||/^(craft|perform|profession|artistry|lore):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))&&id.length<=100;}
export function validateBackground(b){
 if(b==null)return;
 if(typeof b!=='object'||Array.isArray(b)||!['', 'custom',...entries.map(x=>x.id)].includes(b.id))throw Error('Unknown background.');
 if(b.name!==undefined&&(typeof b.name!=='string'||b.name.length>100))throw Error('Background name must be at most 100 characters.');
 if(b.story!==undefined&&(typeof b.story!=='string'||b.story.length>5000))throw Error('Background story must be at most 5000 characters.');
 if(b.skills!==undefined&&(!Array.isArray(b.skills)||b.skills.length>2||b.skills.some(id=>id!==''&&!validBackgroundSkill(id))))throw Error('Choose valid background skills.');
 if(b.traits!==undefined&&(!Array.isArray(b.traits)||b.traits.length>2||b.traits.some(id=>id!==''&&!entries.some(t=>t.id===id))))throw Error('Choose valid additional traits.');
}
export function backgroundDetails(b,c=null){
 const base=baseBackgroundDetails(b);if(!hasAdditionalTraits(c))return base;
 const used=new Set([listOf(b?.id)].filter(Boolean)),traits=[],issues=[...base.issues];
 for(let i=0;i<2;i++){
  const t=entries.find(t=>t.id===b?.traits?.[i]),list=listOf(t?.id);
  if(!t||used.has(list)){issues.push('Choose additional trait '+(i+1)+' from a different, unused trait list.');continue;}
  used.add(list);traits.push(t);
 }
 return {...base,issues,traits,description:[base.description,...traits.map(t=>t.name+': '+t.description)].join(' '),classSkills:[...new Set([...base.classSkills,...traits.flatMap(t=>t.classSkills)])],effects:[...base.effects,...traits.flatMap(t=>t.effects)]};
}
function baseBackgroundDetails(b){
 validateBackground(b);
 if(!b?.id)return {name:'No background selected',description:'',effects:[],classSkills:[],issues:['Choose a background.']};
 if(b.id!=='custom')return {...entries.find(x=>x.id===b.id),issues:[]};
 const skills=b.skills??[],issues=[];
 if(!b.name?.trim())issues.push('Name your custom background.');
 if(skills.length!==2||skills.some(x=>!x)||new Set(skills).size!==2)issues.push('Choose two different background skills.');
 return {name:b.name?.trim()||'Custom background',description:'+1 trait bonus to two different skills.',classSkills:[],issues,
 effects:[...new Set(skills.filter(Boolean))].map(id=>({target:'skill.'+id,value:1,bonusType:'trait'}))};
}
export function backgroundEffects(b,conditions={},c=null){
 const d=backgroundDetails(b,c);
 return d.effects.filter(e=>!e.condition||conditions[e.condition]===true).flatMap(e=>(e.target==='save'?['save.fortitude','save.reflex','save.will']:[e.target]).map(target=>({...e,target,kind:'modifier',featId:'background.'+b.id,name:d.name})));
}
