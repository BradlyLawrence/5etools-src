import entries from './background-data.mjs';
export const BACKGROUNDS=entries;
const plainSkills='acrobatics appraise bluff climb diplomacy disable-device disguise escape-artist fly handle-animal heal intimidate linguistics perception ride sense-motive sleight-of-hand spellcraft stealth survival swim tech-use use-magic-device'.split(' ');
export function validBackgroundSkill(id){return typeof id==='string'&&(plainSkills.includes(id)||/^knowledge-(arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)$/.test(id)||/^(craft|perform|profession|artistry|lore):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))&&id.length<=100;}
export function validateBackground(b){
 if(b==null)return;
 if(typeof b!=='object'||Array.isArray(b)||!['', 'custom',...entries.map(x=>x.id)].includes(b.id))throw Error('Unknown background.');
 if(b.name!==undefined&&(typeof b.name!=='string'||b.name.length>100))throw Error('Background name must be at most 100 characters.');
 if(b.story!==undefined&&(typeof b.story!=='string'||b.story.length>5000))throw Error('Background story must be at most 5000 characters.');
 if(b.skills!==undefined&&(!Array.isArray(b.skills)||b.skills.length>2||b.skills.some(id=>id!==''&&!validBackgroundSkill(id))))throw Error('Choose valid background skills.');
}
export function backgroundDetails(b){
 validateBackground(b);
 if(!b?.id)return {name:'No background selected',description:'',effects:[],classSkills:[],issues:['Choose a background.']};
 if(b.id!=='custom')return {...entries.find(x=>x.id===b.id),issues:[]};
 const skills=b.skills??[],issues=[];
 if(!b.name?.trim())issues.push('Name your custom background.');
 if(skills.length!==2||skills.some(x=>!x)||new Set(skills).size!==2)issues.push('Choose two different background skills.');
 return {name:b.name?.trim()||'Custom background',description:'+1 trait bonus to two different skills.',classSkills:[],issues,
 effects:[...new Set(skills.filter(Boolean))].map(id=>({target:'skill.'+id,value:1,bonusType:'trait'}))};
}
export function backgroundEffects(b,conditions={}){
 const d=backgroundDetails(b);
 return d.effects.filter(e=>!e.condition||conditions[e.condition]===true).flatMap(e=>(e.target==='save'?['save.fortitude','save.reflex','save.will']:[e.target]).map(target=>({...e,target,kind:'modifier',featId:'background.'+b.id,name:d.name})));
}
