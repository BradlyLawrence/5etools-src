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
 for(const level of [5,9,13,17].filter(l=>l<=(c.classes.fighter??0)))add(`fighter-training-${level}`,`Weapon training (fighter level ${level})`,data.weaponGroups);
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
export function martialEffects(c,conditions={},weapon=null){
 const effects=[],add=(target,value,name)=>effects.push({kind:'modifier',target,value,bonusType:'untyped',featId:'class-option.'+name,name});
 const b=c.builder?.classOptions??{},fighter=c.classes.fighter??0;
 const groups=data.weaponGroups.filter(g=>g.weapons.includes(weapon?.id??c.context?.weapon?.id)||weapon?.tech?.family===g.id).map(g=>g.id);
 const training=Math.max(0,...[5,9,13,17].filter(l=>l<=fighter&&groups.includes(b[`fighter-training-${l}`])).map(l=>1+Math.floor((fighter-l)/4)));
 if(training){for(const target of ['attack.weapon','damage.weapon','maneuver.disarm.defense','maneuver.sunder.defense'])add(target,training,'Weapon training');}
 const enemy=favoredBonuses(c,'enemy')[conditions['class-option.enemy']];
 if(enemy)for(const target of ['attack.weapon','damage.weapon',...['bluff','perception','sense-motive','survival',...['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'].map(x=>'knowledge-'+x)].map(x=>'skill.'+x)])add(target,enemy,'Favoured enemy');
 const terrain=favoredBonuses(c,'terrain')[conditions['class-option.terrain']];
 if(terrain)for(const target of ['initiative','skill.knowledge-geography','skill.perception','skill.stealth','skill.survival'])add(target,terrain,'Favoured terrain');
 return effects;
}
export function martialScenarios(c){
 let rows=[{id:'',label:'',conditions:{}}];
 for(const kind of ['enemy','terrain']){
  const previous=rows;
  rows=[...previous,...previous.flatMap(base=>Object.entries(favoredBonuses(c,kind)).map(([id,bonus])=>({id:base.id+(base.id?'|':'')+`${kind}:${id}`,label:base.label+(base.label?' + ':'')+`${kind==='enemy'?'Against':'In'} ${id.replace(/-/g,' ')} (+${bonus})`,conditions:{...base.conditions,['class-option.'+kind]:id}})))];
 }
 return rows.filter(x=>x.id);
}
