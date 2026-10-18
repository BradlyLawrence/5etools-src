import {RANGER_ARCHETYPES,archetypeIds,selectedArchetypes,occupiedSlots} from './archetypes.mjs';
import {SKILLS} from './skills.mjs';
export const rangerLevel=c=>c.classes?.ranger??0;
export const hasRanger=(c,id)=>rangerLevel(c)>0&&archetypeIds(c,'ranger').includes(id);
export const replacedRangerSlot=(c,id)=>selectedArchetypes(c,'ranger').some(p=>occupiedSlots(p).includes(id));
const options=c=>c.builder?.classOptions??{};
const levels=[3,8,13,18];
const mod=c=>Math.floor(((c.abilities?.wis??10)-10)/2);
export function rangerClassSkills(c,base){
 const out=new Set(base);
 if(hasRanger(c,'urban-ranger')){out.delete('handle-animal');out.delete('knowledge-nature');out.add('disable-device');out.add('knowledge-local');}
 if(hasRanger(c,'trapper'))out.add('disable-device');
 return [...out];
}
export function rangerCommunities(c){
 if(!hasRanger(c,'urban-ranger'))return [];
 const b=options(c),out=[];
 for(const n of levels.filter(n=>n<=rangerLevel(c))){
  const name=String(b['ranger-community-'+n]??'').trim();
  if(name&&!out.some(x=>x.name.toLowerCase()===name.toLowerCase()))out.push({id:'ranger-community-'+n,name,bonus:2});
  const boosted=out.find(x=>x.id===b['ranger-community-boost-'+n]);if(n>3&&boosted)boosted.bonus+=2;
 }
 return out;
}
export function rangerSpecs(c){
 const out=[],b=options(c),n=rangerLevel(c);
 if(hasRanger(c,'urban-ranger'))for(const at of levels.filter(x=>x<=n)){
  out.push({id:'ranger-community-'+at,label:'Favoured community (level '+at+', population 100+)',freeText:true,options:[]});
  if(at>3)out.push({id:'ranger-community-boost-'+at,label:'Increase a community bonus by +2 (level '+at+')',options:rangerCommunities(c).filter(x=>Number(x.id.split('-').at(-1))<=at)});
 }
 for(const [id,prefix] of [['skirmisher','ranger-trick'],['trapper','ranger-trap']])if(hasRanger(c,id)){
  const p=RANGER_ARCHETYPES.find(p=>p.id===id),ats=Array.from({length:8},(_,i)=>5+2*i).filter(x=>x<=n);
  for(const at of ats){
   const earlier=ats.filter(x=>x<at).map(x=>b[prefix+'-'+x]);
   out.push({id:prefix+'-'+at,label:(id==='skirmisher'?"Hunter's trick":"Ranger trap")+' (level '+at+')',options:p.options.filter(o=>!(id==='trapper'&&o.id==='snare-trap')&&!earlier.includes(o.id)).map(o=>({...o,text:o.rulesText,description:o.rulesText}))});
  }
 }
 return out;
}
export function rangerChoices(c,id){
 const prefix=id==='skirmisher'?'ranger-trick':'ranger-trap',p=RANGER_ARCHETYPES.find(p=>p.id===id);
 if(!hasRanger(c,id)||rangerLevel(c)<5)return [];
 const chosen=id==='trapper'?[p.options.find(o=>o.id==='snare-trap')]:[];
 for(const spec of rangerSpecs(c).filter(s=>s.id.startsWith(prefix+'-'))){const o=spec.options.find(o=>o.id===options(c)[spec.id]);if(o&&!chosen.some(x=>x.id===o.id))chosen.push(o);}
 return chosen;
}
export function rangerIssues(c){
 const names=levels.filter(n=>n<=rangerLevel(c)).map(n=>String(options(c)['ranger-community-'+n]??'').trim().toLowerCase()).filter(Boolean);
 return hasRanger(c,'urban-ranger')&&new Set(names).size!==names.length?['Choose different favoured communities.']:[];
}
export function rangerSummary(c,conditions={}){
 const n=rangerLevel(c);if(!n)return null;
 const guide=hasRanger(c,'guide'),urban=hasRanger(c,'urban-ranger'),deep=hasRanger(c,'deep-walker'),trapper=hasRanger(c,'trapper'),skirm=hasRanger(c,'skirmisher');
 const characterLevel=Object.values(c.classes).reduce((a,b)=>a+b,0),wis=mod(c),trapDC=10+Math.floor(characterLevel/2)+Math.max(0,wis);
 return {level:n,characterLevel,focus:guide?{bonus:2+2*Math.floor(n/5),uses:1+Math.floor((n-1)/3),active:!!conditions['class-option.ranger-focus']}:null,
  terrainBond:guide&&n>=4?{bonus:2,scope:urban?'chosen favoured communities':deep?'Deep Knowledge underground terrain':'favoured terrains'}:null,
  inspired:guide&&n>=11?{uses:n>=19?2:1,active:!!conditions['class-option.ranger-inspired']}:null,
  luck:guide&&n>=9?{uses:1+Math.floor((n-9)/5),ownBonus:n>=16?4:0,enemyPenalty:n>=16?-4:0}:null,
  trapfinding:trapper||urban&&n>=3?Math.max(1,Math.floor(n/2)):0,
  communities:rangerCommunities(c),deepKnowledge:deep&&n>=3?2+3*Math.floor((n-3)/5):0,
  invisibility:urban&&n>=17?{uses:Math.max(1,wis),rounds:n,casterLevel:n}:null,
  tricks:skirm&&n>=5?{uses:Math.max(0,Math.floor(n/2)+wis),known:rangerChoices(c,'skirmisher')}:null,
  traps:trapper&&n>=5?{uses:Math.max(0,Math.floor(n/2)+wis),known:rangerChoices(c,'trapper'),supernaturalDC:trapDC,extraordinaryDC:trapDC-2,hours:n,days:n,launch:n>=10}:null,
  masterHunter:n>=20?{dc:10+Math.floor(n/2)+wis,focusEligible:guide}:null,
  evasion:n>=9&&!replacedRangerSlot(c,'evasion'),improvedEvasion:n>=16&&!replacedRangerSlot(c,'improved-evasion'),
  companion:n>=4&&!replacedRangerSlot(c,'hunters-bond')&&options(c)['ranger-bond']==='companion'};
}
export function rangerEffects(c,conditions={}){
 const r=rangerSummary(c,conditions);if(!r)return [];
 const out=[],add=(target,value,name)=>{if(value)out.push({kind:'modifier',target,value,name,bonusType:'untyped',featId:'ranger.'+name});};
 if(r.focus?.active)for(const t of ['attack.weapon','damage.weapon'])add(t,r.focus.bonus,"Ranger's Focus");
 if(r.inspired?.active){for(const t of ['attack.weapon','ac'])add(t,4,'Inspired Moment');add('speed.bonus',10,'Inspired Moment');add('initiative',4,'Inspired Moment — Dexterity check');for(const id of new Set([...Object.keys(c.skillRanks??{}),...Object.keys(SKILLS)]))add('skill.'+id,4,'Inspired Moment');}
 if(r.trapfinding){add('skill.disable-device',r.trapfinding,'Ranger Trapfinding');if(conditions['class-option.ranger-find-trap'])add('skill.perception',r.trapfinding,'Ranger Trapfinding');}
 const community=r.communities.find(x=>x.id===conditions['class-option.ranger-community']);
 if(community)for(const t of ['initiative','skill.knowledge-local','skill.perception','skill.stealth','skill.survival'])add(t,community.bonus,'Favoured Community');
 if(r.deepKnowledge&&conditions['class-option.ranger-underground'])for(const t of ['initiative','skill.knowledge-dungeoneering','skill.perception','skill.stealth','skill.survival'])add(t,r.deepKnowledge,'Deep Knowledge');
 if(hasRanger(c,'deep-walker')&&r.level>=7&&conditions['class-option.ranger-rock-hopper'])for(const t of ['skill.acrobatics','skill.climb'])add(t,5,'Rock Hopper');
 if(r.tricks?.known.some(o=>o.id==='second-chance-strike')&&conditions['class-option.ranger-second-chance']&&c.context?.attackType==='melee')add('attack.weapon',-5,'Second Chance Strike');
 return out;
}
export function rangerScenarios(c){
 const r=rangerSummary(c);if(!r)return [];
 const out=[],add=(id,label,conditions={['class-option.'+id]:true})=>out.push({id,label,conditions});
 if(r.focus)add('ranger-focus',"Against the designated Ranger's Focus");
 if(r.inspired){add('ranger-inspired','Inspired Moment — active until end of next turn');add('ranger-inspired-focus','Inspired Moment against designated focus',{'class-option.ranger-inspired':true,'class-option.ranger-focus':true});}
 if(r.trapfinding)add('ranger-find-trap','Ranger Trapfinding — locating traps');
 for(const x of r.communities)add(x.id,'In '+x.name+' (+'+x.bonus+')',{'class-option.ranger-community':x.id});
 if(r.deepKnowledge)add('ranger-underground','Deep Knowledge — underground');
 if(hasRanger(c,'deep-walker')&&r.level>=7)add('ranger-rock-hopper','Rock Hopper — traversing underground terrain',{'class-option.ranger-rock-hopper':true,'class-option.ranger-underground':true});
 if(r.tricks?.known.some(o=>o.id==='second-chance-strike')&&c.context?.attackType==='melee')add('ranger-second-chance','Second Chance Strike — melee reroll');
 const combat=out.filter(x=>['ranger-focus','ranger-inspired','ranger-inspired-focus','ranger-second-chance'].includes(x.id));
 const terrain=out.filter(x=>x.id.startsWith('ranger-community-')||['ranger-underground','ranger-rock-hopper'].includes(x.id));
 for(const attack of combat)for(const place of terrain)out.push({id:attack.id+'+'+place.id,label:attack.label+' + '+place.label,conditions:{...attack.conditions,...place.conditions}});
 return out;
}
