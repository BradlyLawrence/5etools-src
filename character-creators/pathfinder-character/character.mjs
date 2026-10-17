import {validateArchetypes} from './engine/archetypes.mjs';
import {validateSpellcasting} from './engine/spellcasting.mjs';
import {migrateBowCharacter} from './engine/bows.mjs';
import {permanentAbilityBonus} from './engine/selectable-abilities.mjs';
import {featSlots} from './engine/feat-progression.mjs';
import {optionIssues} from './engine/core-options.mjs';
import {validateRacial,replacedTrait} from './engine/racial.mjs';
import {hitPoints,validateAdvancement} from './advancement.mjs';
import {backgroundDetails} from './backgrounds.mjs';
import {calculateSkills,validateAllocations} from './skills.mjs';
export const ABILITIES=['str','dex','con','int','wis','cha'];
export const ARRAYS={
 '10-1':[14,14,12,10,10,8],'10-2':[16,12,12,10,8,8],
 '15-1':[15,14,13,12,10,8],'15-2':[16,13,12,12,10,8],'15-3':[14,14,12,12,12,10],
 '20-1':[16,15,13,12,10,8],'20-2':[17,14,12,12,10,8],'20-3':[16,14,12,12,12,10],
 '25-1':[16,16,14,12,10,8],'25-2':[18,14,13,12,10,8],'25-3':[16,14,14,12,12,12]
};
export function chooseArray(c,id){if(!ARRAYS[id])throw Error('Unknown array.');c.builder.arrayId=id;c.builder.baseScores=Object.fromEntries(ABILITIES.map(a=>[a,null]));}
export function availableArrayScores(c,ability){
 const b=c.builder,remaining=[...(ARRAYS[b.arrayId]??[])];
 for(const a of ABILITIES)if(a!==ability){const i=remaining.indexOf(b.baseScores[a]);if(i>=0)remaining.splice(i,1);}
 return remaining;
}
export function assignArrayScore(c,ability,score){
 const b=c.builder;if(!ARRAYS[b.arrayId]||!ABILITIES.includes(ability))throw Error('Choose an array first.');
 if(score!==null&&!availableArrayScores(c,ability).includes(score))throw Error('That score is already allocated. Clear its ability first.');
 b.baseScores[ability]=score;
}
export const COST={7:-4,8:-2,9:-1,10:0,11:1,12:2,13:3,14:5,15:7,16:10,17:13,18:17};
export const RACES={dwarves:{con:2,wis:2,cha:-2},elves:{dex:2,int:2,con:-2},gnomes:{con:2,cha:2,str:-2},halflings:{dex:2,cha:2,str:-2},'half-elves':{},'half-orcs':{},humans:{},dragonborn:{str:2,cha:2,dex:-2}};
const FLEX=['humans','half-elves','half-orcs'];
// Standard multiclassing: sum each class table’s rounded BAB and save bonuses.
const CHASSIS={fighter:[1,['fortitude']],barbarian:[1,['fortitude']],ironwright:[1,['fortitude']],gunslinger:[1,['fortitude','reflex']],cavalier:[1,['fortitude']],paladin:[1,['fortitude','will']],ranger:[1,['fortitude','reflex']],rogue:[.75,['reflex']],bard:[.75,['reflex','will']],cleric:[.75,['fortitude','will']],druid:[.75,['fortitude','will']],monk:[.75,['fortitude','reflex','will']],alchemist:[.75,['fortitude','reflex']],inquisitor:[.75,['fortitude','will']],wizard:[.5,['will']],sorcerer:[.5,['will']]};
export function prepare(c){
 const out=migrateBowCharacter(c);
 if(!out.builder)out.builder={version:1,targetLevel:Math.max(1,Object.values(c.classes).reduce((a,b)=>a+b,0)),classOrder:Object.entries(c.classes).flatMap(([id,n])=>Array(n).fill(id)),orderConfirmed:Object.keys(c.classes).length<=1,raceId:'',flexAbility:'',method:'manual',budget:15,baseScores:{...Object.fromEntries(ABILITIES.map(a=>[a,10])),...c.abilities},increases:[],identity:{}};
 out.builder.skills??=Object.fromEntries(Object.entries(c.skillRanks??{}).map(([id,n])=>[id,{normal:n,background:0}]));
 return out;
}
export function newCharacter(){const c=prepare({name:'Unnamed adventurer',classes:{},feats:[],notes:''});c.builder.method='point-buy';return c;}
export function calculate(c){
 const b=c.builder,classes={};for(const id of b.classOrder)if(id)classes[id]=(classes[id]??0)+1;
 const level=Object.values(classes).reduce((a,v)=>a+v,0),race={...(RACES[b.raceId]??{})};
 if(FLEX.includes(b.raceId)&&ABILITIES.includes(b.flexAbility))race[b.flexAbility]=2;
 const increases=Object.fromEntries(ABILITIES.map(a=>[a,b.increases.slice(0,Math.floor(level/4)).filter(v=>v===a).length]));
 const abilities=Object.fromEntries(ABILITIES.map(a=>[a,Number(b.baseScores[a]??10)+ (race[a]??0)+increases[a]]));
 abilities.int+=permanentAbilityBonus({...c,classes,abilities});
 const bab=Object.entries(classes).reduce((n,[id,l])=>n+Math.floor((CHASSIS[id]?.[0]??0)*l),0);
 const saves=Object.fromEntries(['fortitude','reflex','will'].map(save=>{
  const total=Object.entries(classes).reduce((n,[id,l])=>n+(CHASSIS[id]?.[1].includes(save)?2+Math.floor(l/2):Math.floor(l/3)),0);
  return [save,total];
 }));
 const spent=ABILITIES.reduce((n,a)=>n+(COST[b.baseScores[a]]??NaN),0);
 const issues=[...backgroundDetails(c.background,c).issues,...optionIssues({...c,classes,abilities})];
 issues.push(...hitPoints(c,abilities).issues);
 if(['half-elves','gnomes'].includes(b.raceId)&&!replacedTrait(c,'adaptability')&&!b.racialSkill)issues.push('Choose your racial skill on the Race tab.');
 if(!b.favoredClasses?.[0])issues.push('Choose a favoured class on the Classes tab.');
 if(ABILITIES.some(a=>b.baseScores[a]===null))issues.push('Allocate all ability scores. Until then, other previews use 10 for unassigned abilities.');
 if(!b.raceId)issues.push('Choose a race.');
 if(b.raceId==='dragonborn'&&!b.draconicAncestry)issues.push('Choose your draconic ancestry.');
 if(b.classOrder.some((id,i)=>id&&(i>=b.targetLevel||b.classOrder.slice(0,i).some(x=>!x))))issues.push('Fill class levels in order, within the target level.');
 if(FLEX.includes(b.raceId)&&!b.flexAbility)issues.push('Choose your racial ability bonus.');
 if(level!==b.targetLevel)issues.push(`Assign ${b.targetLevel} class levels (${level} assigned).`);
 if(!b.orderConfirmed)issues.push('Confirm the order of your imported class levels.');
 if(b.classOrder.some(id=>id&&!CHASSIS[id]))issues.push('An imported class is not supported yet.');
 if(b.method==='point-buy'&&(!Number.isFinite(spent)||spent>b.budget))issues.push('Ability scores exceed the point-buy budget or its 7–18 limits.');
 if(b.method==='array'&&(!ARRAYS[b.arrayId]||JSON.stringify(Object.values(b.baseScores).sort((a,b)=>a-b))!==JSON.stringify([...ARRAYS[b.arrayId]].sort((a,b)=>a-b))))issues.push('Choose a fixed array and assign all six scores.');
 if(b.method==='point-buy'&&spent<b.budget)issues.push(`${b.budget-spent} point-buy points remain.`);
 if(b.increases.slice(0,Math.floor(level/4)).filter(Boolean).length<Math.floor(level/4))issues.push('Choose your ability increases for every four character levels.');
 return {classes,level,race,increases,abilities,bab,saves,spent,issues};
}
export function materialize(c){c=structuredClone(c);c.feats=c.feats.filter(f=>!f.racialGrant);if(c.builder.raceId==='half-elves'&&!replacedTrait(c,'adaptability')&&c.builder.racialSkill){c.feats.push({featId:'skill-focus',racialGrant:true});c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};c.ruleState.choices['skill-focus-skill']=c.builder.racialSkill;}const r=calculate(c);const skills=calculateSkills(c,r);return {...c,feats:c.feats.filter(f=>!f.creatorSlot||featSlots(c).some(slot=>slot.id===f.creatorSlot)),classes:r.classes,arcaneCasterLevel:Math.max(0,...['wizard','sorcerer','bard'].map(id=>r.classes[id]??0)),casterLevel:Math.max(0,...['wizard','sorcerer','bard','cleric','druid','inquisitor','alchemist'].map(id=>r.classes[id]??0),...['paladin','ranger'].map(id=>Math.max(0,(r.classes[id]??0)-3))),abilities:r.abilities,bab:r.bab,baseSaves:r.saves,skillRanks:skills.skillRanks,classSkills:skills.classSkills};}
export function validateBuilder(b){
 validateSpellcasting(b.spellcasting);
 validateArchetypes({builder:b});
 if(b.classOptions!==undefined&&(!b.classOptions||Array.isArray(b.classOptions)||typeof b.classOptions!=='object'||Object.values(b.classOptions).some(v=>typeof v!=='string')))throw Error('Invalid class options.');
 validateRacial(b);validateAdvancement(b);
 if(b.gunslinger!==undefined&&(!b.gunslinger||typeof b.gunslinger!=='object'||Array.isArray(b.gunslinger)||Object.entries(b.gunslinger).some(([k,v])=>!['primary','secondary'].includes(k)||!['pistol','rifle','trenchgun','handcannon'].includes(v))||b.gunslinger.secondary&&b.gunslinger.primary===b.gunslinger.secondary))throw Error('Invalid gunslinger families.');
 if(b.skills!==undefined)validateAllocations(b.skills);
 if(b.version!==1||!Number.isInteger(b.targetLevel)||b.targetLevel<1||b.targetLevel>20)throw Error('Invalid builder level or version.');
 if(!Array.isArray(b.classOrder)||b.classOrder.length>20||b.classOrder.some(v=>typeof v!=='string'))throw Error('Invalid class order.');
 if(!['manual','point-buy','array'].includes(b.method)||![10,15,20,25].includes(b.budget))throw Error('Invalid ability-score method.');
 for(const a of ABILITIES)if(!(b.method==='array'&&b.baseScores?.[a]===null)&&(!Number.isInteger(b.baseScores?.[a])||b.baseScores[a]<1||b.baseScores[a]>40))throw Error('Ability scores must be whole numbers from 1 to 40.');
 if(!Array.isArray(b.increases)||b.increases.some(a=>a!==''&&!ABILITIES.includes(a)))throw Error('Invalid level ability increase.');
 if(!b.identity||typeof b.identity!=='object'||Array.isArray(b.identity))throw Error('Invalid identity details.');
 if(typeof b.raceId!=='string'||typeof b.flexAbility!=='string')throw Error('Invalid race selection.');
}
