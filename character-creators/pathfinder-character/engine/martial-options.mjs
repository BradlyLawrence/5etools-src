import {replacedFighterSlot,archetypeIds} from './archetypes.mjs';
import data from './martial-options-data.mjs';
export const MARTIAL_OPTIONS=data;
const names=ids=>ids.map(id=>({id,name:id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}));
const thresholds={enemy:[1,5,10,15,20],terrain:[3,8,13,18]};
export function martialSpecs(c){
 const b=c.builder?.classOptions??{},specs=[],add=(id,label,options)=>specs.push({id,label,options});
 for(const [kind,levels] of Object.entries(thresholds)){
  const pool=names(data[kind==='enemy'?'enemies':'terrains']);
  for(const level of levels.filter(l=>l<=(c.classes.ranger??0))){
   add(`ranger-${kind}-${level}`,`Favoured ${kind} (ranger level ${level})`,pool);
   if(level!==levels[0])add(`ranger-${kind}-boost-${level}`,`Increase a favoured ${kind} bonus by +2 (level ${level})`,pool.filter(x=>levels.filter(l=>l<=level).some(l=>b[`ranger-${kind}-${l}`]===x.id)));
  }
 }
 for(const level of [5,9,13,17].filter(l=>l<=(c.classes.fighter??0)&&!replacedFighterSlot(c,'weapon-training-'+(1+(l-5)/4))&&!(l===5&&archetypeIds(c).includes('tech-fighter'))))add(`fighter-training-${level}`,`Weapon training (fighter level ${level})`,data.weaponGroups);
 return specs;
}
export function martialIssues(c){
 const b=c.builder?.classOptions??{},issues=[];
 for(const prefix of ['ranger-enemy','ranger-terrain','fighter-training']){
  const values=martialSpecs(c).filter(x=>x.id.startsWith(prefix+'-')&&!x.id.includes('-boost-')).map(x=>b[x.id]).filter(Boolean);
  if(new Set(values).size!==values.length)issues.push(`Choose different ${prefix==='fighter-training'?'weapon training groups':prefix==='ranger-enemy'?'favoured enemies':'favoured terrains'}.`);
 }
 return issues;
}
export function favoredBonuses(c,kind){
 const b=c.builder?.classOptions??{},levels=thresholds[kind].filter(l=>l<=(c.classes.ranger??0)),pool=data[kind==='enemy'?'enemies':'terrains'],out={};
 for(const level of levels){
  const id=b[`ranger-${kind}-${level}`];if(pool.includes(id)&&!out[id])out[id]=2;
  if(level!==levels[0]&&out[b[`ranger-${kind}-boost-${level}`]])out[b[`ranger-${kind}-boost-${level}`]]+=2;
 }
 return out;
}
export function martialEffects(c,conditions={},weapon=null,existingEffects=[]){
 const effects=[],add=(target,value,name)=>effects.push({kind:'modifier',target,value,bonusType:'untyped',featId:'class-option.'+name,name});
 const b=c.builder?.classOptions??{},fighter=c.classes.fighter??0;
 const groups=data.weaponGroups.filter(g=>g.weapons.includes(weapon?.id??c.context?.weapon?.id)||weapon?.tech?.family===g.id).map(g=>g.id);
 const training=Math.max(archetypeIds(c).includes('tech-fighter')&&fighter>=5&&weapon?.proficiency==='tech-melee'?1+Math.floor((fighter-5)/4):0,...[5,9,13,17].filter(l=>l<=fighter&&!(l===5&&archetypeIds(c).includes('tech-fighter'))&&!replacedFighterSlot(c,'weapon-training-'+(1+(l-5)/4))&&groups.includes(b[`fighter-training-${l}`])).map(l=>1+Math.floor((fighter-l)/4)));
 if(training&&(!archetypeIds(c).includes('two-handed-fighter')||(weapon?.handling==='two-handed'&&c.context?.attackType==='melee'))){for(const target of ['attack.weapon','damage.weapon','maneuver.disarm.defense','maneuver.sunder.defense'])add(target,training,'Weapon training');}
 if(archetypeIds(c).includes('weapon-master')){
  const chosen=b['weapon-master-weapon'],matches=chosen&&chosen===(weapon?.id??c.context?.weapon?.id),guard=fighter>=2?1+Math.floor((fighter-2)/4):0,bonus=fighter>=3?1+Math.floor((fighter-3)/4):0;
  if(matches){if(bonus)for(const target of ['attack.weapon','damage.weapon'])add(target,bonus,'Weapon Master training');if(guard)for(const target of ['maneuver.disarm.defense','maneuver.sunder.defense'])add(target,guard,'Weapon Guard');if(fighter>=17)add('critical.saveDC',4,'Critical Specialist');
   if(conditions['class-option.weapon-guard'])for(const target of ['save.fortitude','save.reflex','save.will'])add(target,guard,'Weapon Guard — effect targeting chosen weapon');
  }
  if(chosen&&fighter>=9&&conditions['class-option.mirror-move'])effects.push({kind:'modifier',target:'ac',value:bonus,bonusType:'insight',featId:'archetype.mirror-move',name:'Mirror Move'});
 }
 if(archetypeIds(c).includes('two-handed-fighter')){
  const eligible=weapon?.handling==='two-handed'&&c.context?.attackType==='melee',n=c.classes.fighter??0,shatter=n>=2?1+Math.floor((n-2)/4):0;
  if(shatter){for(const t of ['maneuver.sunder.check','maneuver.sunder.defense'])add(t,shatter,'Shattering Strike');if(conditions['class-option.object'])add('damage.weapon',shatter,'Shattering Strike — object damage');}
  if(eligible){const str=Math.floor((c.abilities.str-10)/2),action=conditions['class-option.two-handed-action'];
   if(str>0&&((action==='overhand'&&n>=3)||(action==='backswing'&&n>=7)))add('damage.weapon',2*str-Math.floor(str*1.5),action==='overhand'?'Overhand Chop':'Backswing');
   if(n>=15&&existingEffects.some(e=>e.effectId==='power-damage-two-handed'))add('damage.weapon',1+Math.floor(c.bab/4),'Greater Power Attack');
   if(n>=19&&action==='devastating')add('attack.weapon',-5,'Devastating Blow');
  }
 }
 const enemy=favoredBonuses(c,'enemy')[conditions['class-option.enemy']];
 if(enemy)for(const target of ['attack.weapon','damage.weapon',...['bluff','perception','sense-motive','survival',...['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'].map(x=>'knowledge-'+x)].map(x=>'skill.'+x)])add(target,enemy,'Favoured enemy');
 const terrain=favoredBonuses(c,'terrain')[conditions['class-option.terrain']];
 if(terrain)for(const target of ['initiative','skill.knowledge-geography','skill.perception','skill.stealth','skill.survival'])add(target,terrain,'Favoured terrain');
 return effects;
}
export function martialScenarios(c,weapon=null){
 let rows=[{id:'',label:'',conditions:{}}];
 for(const kind of ['enemy','terrain']){
  const previous=rows;
  rows=[...previous,...previous.flatMap(base=>Object.entries(favoredBonuses(c,kind)).map(([id,bonus])=>({id:base.id+(base.id?'|':'')+`${kind}:${id}`,label:base.label+(base.label?' + ':'')+`${kind==='enemy'?'Against':'In'} ${id.replace(/-/g,' ')} (+${bonus})`,conditions:{...base.conditions,['class-option.'+kind]:id}})))];
 }
 if(archetypeIds(c).includes('weapon-master')&&c.builder?.classOptions?.['weapon-master-weapon']){
  const n=c.classes.fighter??0,chosen=c.builder.classOptions['weapon-master-weapon'];
  if(n>=2&&chosen===c.context?.weapon?.id)rows.push({id:'weapon-guard',label:'Weapon Guard — saves against effects targeting chosen weapon',conditions:{'class-option.weapon-guard':true}});
  if(n>=9)rows.push({id:'mirror-move',label:'Mirror Move — attacked with '+chosen.replace(/-/g,' '),conditions:{'class-option.mirror-move':true}});
 }
 if(archetypeIds(c).includes('two-handed-fighter')){
  const n=c.classes.fighter??0;
  if(n>=2)rows.push({id:'shattering-strike',label:'Shattering Strike — damage against objects',conditions:{'class-option.object':true}});
  if(weapon?.handling==='two-handed'&&c.context?.attackType==='melee'){
   const actions=[];
   if(n>=3)actions.push(['overhand','Overhand Chop — attack action or charge (damage only; charge modifiers separate)']);
   if(n>=7)actions.push(['backswing','Backswing — full attack, attacks after the first']);
   if(n>=11)actions.push(['piledriver','Piledriver — standard attack; on hit, free bull rush or trip without provoking']);
   if(n>=19)actions.push(['devastating','Devastating Blow — standard attack, hit threatens; confirm normally, no critical-triggered weapon abilities']);
   for(const [action,label]of actions){rows.push({id:action,label,conditions:{'class-option.two-handed-action':action}});if(n>=2)rows.push({id:action+'-object',label:label+'; against an object',conditions:{'class-option.two-handed-action':action,'class-option.object':true}});}
  }
 }
 return rows.filter(x=>x.id);
}
