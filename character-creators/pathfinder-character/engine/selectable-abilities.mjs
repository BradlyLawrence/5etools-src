import {applyBarbarianScores,barbarianRage} from './barbarian-archetypes.mjs';
import {featSlots,slotAllows} from './feat-progression.mjs';
import data from './selectable-abilities-data.mjs';
import {SKILLS} from './skills.mjs';
export const SELECTABLE_ABILITIES=data.abilities;
const labels={rogue:'Rogue talent',barbarian:'Rage power',alchemist:'Discovery',paladin:'Mercy'};
export function abilitySlots(c,baseOnly=false){
 const slots=[];
 for(const cls of Object.keys(labels)){
  const step=cls==='paladin'?3:2,max=Math.min(c.classes?.[cls]??0,cls==='alchemist'?18:20);
  for(let level=step;level<=max;level+=step)slots.push({id:`${cls}-ability-${level}`,classId:cls,level,label:`${labels[cls]} (class level ${level})`});
 }
 if(c.classes?.alchemist>=20)for(const suffix of ['a','b','grand'])slots.push({id:'alchemist-ability-20-'+suffix,classId:'alchemist',level:20,grand:suffix==='grand',label:suffix==='grand'?'Grand discovery':'Discovery (class level 20)'});
 if(!baseOnly){
  const defs={'extra-discovery':'alchemist','extra-rage-power':'barbarian','extra-rogue-talent':'rogue'},order=c.builder?.classOrder,baseSlots=order?featSlots(c,true):[];
  const seen=new Set(),processed=new Set();let changed=true;
  while(changed){changed=false;
  for(const [index,f]of (c.feats??[]).entries()){
   if(processed.has(index))continue;
   const cls=defs[f.featId];if(!cls)continue;
   const origin=f.creatorSlot?baseSlots.find(s=>s.id===f.creatorSlot):null;
   if(f.creatorSlot&&(!origin||!slotAllows(origin,{id:f.featId,combat:false,name:f.featId})))continue;
   if(f.creatorSlot&&seen.has(f.creatorSlot))continue;
   if(f.creatorSlot)seen.add(f.creatorSlot);
   const level=origin?order.slice(0,origin.level).filter(id=>id===cls).length:c.classes?.[cls]??0;
   if(level<2)continue;
   processed.add(index);changed=true;
   const count=Math.min(100,Math.max(1,f.count??1));
   for(let n=0;n<count;n++)slots.push({id:`${cls}-ability-extra-${f.creatorSlot??index}-${n}`,classId:cls,level,characterLevel:origin?.level,extra:true,label:`${labels[cls]} (${f.featId.replaceAll('-',' ')}${origin?' at character level '+origin.level:''})`});
  }
  slots.sort((a,b)=>a.classId.localeCompare(b.classId)||a.level-b.level||Number(!!a.extra)-Number(!!b.extra));
  // A legal advanced rogue talent can itself grant a feat. Resolve only from
  // already available slots, so a circular saved selection cannot unlock itself.
  const selected=[];
  for(const slot of slots){const a=allowed(c,slot,selected).find(a=>a.id===c.builder?.classOptions?.[slot.id]);if(!a)continue;selected.push(a);
   if(slot.extra&&a.classId==='rogue'&&a.id==='feat'){const id='rogue-talent-feat-'+slot.id;if(!baseSlots.some(s=>s.id===id))baseSlots.push({id,level:slot.characterLevel});}
  }
  }
 }
 return slots;
}
function allowed(c,slot,previous){
 const b=c.builder?.classOptions??{};
 return data.abilities.filter(a=>a.classId===slot.classId&&a.minimumLevel<=slot.level&&!!a.grand===!!slot.grand&&a.id!=='finesse-rogue'&&previous.filter(x=>x.classId===a.classId&&x.id===a.id).length<a.maximum&&a.requires.every(id=>previous.some(x=>x.classId===a.classId&&x.id===id))&&(!a.intelligence||(c.abilities?.int??c.builder?.baseScores?.int??10)>=a.intelligence)&&(a.id!=='night-vision'||previous.some(x=>x.id==='low-light-vision')||['elves','half-elves','gnomes'].includes(c.builder?.raceId)));
}
export function selectedAbilities(c,baseOnly=false){
 const selected=[];
 for(const slot of abilitySlots(c,baseOnly)){const a=allowed(c,slot,selected).find(a=>a.id===c.builder?.classOptions?.[slot.id]);if(a)selected.push({...a,slot});}
 return selected;
}
export function selectableSpecs(c){
 const selected=[],specs=[];
 for(const slot of abilitySlots(c)){
  const options=allowed(c,slot,selected);specs.push({...slot,options});const a=options.find(x=>x.id===c.builder?.classOptions?.[slot.id]);if(a)selected.push({...a,slot});
 }
 const b=c.builder?.classOptions??{},add=(id,label,options)=>specs.push({id,label,options});
 if(c.classes?.barbarian)add('barbarian-raging','Rage',[{id:'off',name:'Not raging'},{id:'on',name:'Raging'}]);
 if(c.classes?.alchemist){
  add('alchemist-mutagen','Mutagen',[{id:'off',name:'Inactive'},...['str','dex','con'].map(id=>({id,name:{str:'Strength',dex:'Dexterity',con:'Constitution'}[id]}))]);
  if(['str','dex','con'].includes(b['alchemist-mutagen'])&&selected.some(x=>['greater-mutagen','grand-mutagen'].includes(x.id)))add('mutagen-secondary','Secondary mutagen ability',['str','dex','con'].filter(id=>id!==b['alchemist-mutagen']).map(id=>({id,name:id.toUpperCase()})));
  add('alchemist-bomb','Bomb type',[{id:'standard',name:'Fire bomb'},...selected.filter(x=>['acid-bomb','frost-bomb','shock-bomb','concussive-bomb','force-bomb','dispelling-bomb','explosive-bomb','smoke-bomb','stink-bomb','poison-bomb','inferno-bomb','madness-bomb'].includes(x.id)).map(x=>({id:x.id,name:x.name}))]);
 }
 for(const a of selected){
  if(['minor-magic','major-magic'].includes(a.id))add(a.slot.id+'-spell',a.name+' spell',data.spells.filter(x=>x.level===(a.id==='minor-magic'?0:1)));
  if(a.id==='skill-mastery')for(let n=1;n<=Math.max(0,3+Math.floor(((c.abilities?.int??10)-10)/2));n++){
   const field=a.slot.id+'-skill-'+n,other=new Set(Object.entries(b).filter(([id])=>id!==field&&/-ability-.+-skill-\d+$/.test(id)).map(([,v])=>v));
   add(field,'Skill mastery: skill '+n,Object.keys({...SKILLS,...c.skillRanks}).filter(id=>!['craft','perform','profession','lore','artistry'].includes(id)&&!other.has(id)).map(id=>({id,name:id.replace(/-/g,' ')})));
  }
 }
 return specs;
}
export function selectableIssues(c){
 return selectableSpecs(c).filter(s=>!s.options.some(x=>x.id===c.builder?.classOptions?.[s.id])).map(s=>'Choose '+s.label.toLowerCase()+'.');
}
export function permanentAbilityBonus(c){return selectedAbilities(c).some(a=>a.id==='awakened-intellect')?2:0;}
export function activeAbilityScores(input){
 const c=structuredClone(input),b=c.builder?.classOptions??{},selected=selectedAbilities(c),has=id=>selected.some(a=>a.id===id);
 applyBarbarianScores(c);
 if(c.classes?.alchemist&&['str','dex','con'].includes(b['alchemist-mutagen'])){
  const first=b['alchemist-mutagen'],second=b['mutagen-secondary'],mental={str:'int',dex:'wis',con:'cha'};
  let bonuses={[first]:4};
  if(has('true-mutagen'))bonuses={str:8,dex:8,con:8};
  else if(has('grand-mutagen')){bonuses={[first]:8};if(second&&second!==first){bonuses[second]=6;bonuses[['str','dex','con'].find(x=>x!==first&&x!==second)]=4;}}
  else if(has('greater-mutagen')){bonuses={[first]:6};if(second&&second!==first)bonuses[second]=4;}
  for(const [ability,amount] of Object.entries(bonuses)){c.abilities[ability]+=amount;c.abilities[mental[ability]]=Math.max(1,c.abilities[mental[ability]]-2);}
 }
 return c;
}
export function selectableEffects(c,conditions={}){
 const b=c.builder?.classOptions??{},selected=selectedAbilities(c),has=id=>selected.some(a=>a.id===id),effects=[];
 const add=(target,value,name,type='untyped')=>effects.push({kind:'modifier',target,value,bonusType:type,featId:'class-ability.'+name,name});
 if(c.classes.barbarian&&b['barbarian-raging']==='on'){
  const level=c.classes.barbarian,rage=barbarianRage(c);add('ac',rage.ac,'Rage');add('save.will',rage.will,'Rage','morale');
  for(const [id,skill] of [['raging-climber','climb'],['raging-swimmer','swim']])if(has(id))add('skill.'+skill,level,id,'enhancement');
  if(has('swift-foot'))add('speed.bonus',5*selected.filter(x=>x.id==='swift-foot').length,'Swift Foot','enhancement');
  if(has('quick-reflexes'))add('opportunity.extra',1,'Quick Reflexes');
  const variant=conditions['class-option.power'];
  if(has(variant)){
   if(['guarded-stance','rolling-dodge'].includes(variant))add('ac',1+Math.floor(level/6),variant,'dodge');
   if(variant==='superstition')for(const save of ['fortitude','reflex','will'])add('save.'+save,2+Math.floor(level/4),'Superstition','morale');
   if(variant==='raging-leaper')add('skill.acrobatics',level,'Raging Leaper','enhancement');
   if(variant==='powerful-blow')add('damage.weapon',1+Math.floor(level/4),'Powerful Blow');
   if(variant==='surprise-accuracy')add('attack.weapon',1+Math.floor(level/4),'Surprise Accuracy','morale');
   if(variant==='strength-surge'){add('combatManeuver.check',level,'Strength Surge');add('combatManeuver.defense',level,'Strength Surge');}
  }
 }
 if(c.classes.alchemist&&['str','dex','con'].includes(b['alchemist-mutagen'])){
  add('ac',has('true-mutagen')?8:has('grand-mutagen')?6:has('greater-mutagen')?4:2,'Mutagen','natural-armor');
  if(has('feral-mutagen'))add('skill.intimidate',2,'Feral Mutagen','competence');
 }
 return effects;
}
export function selectableScenarios(c){
 if(!c.classes.barbarian||c.builder?.classOptions?.['barbarian-raging']!=='on')return [];
 const labels={'guarded-stance':'Guarded Stance active, against melee','rolling-dodge':'Rolling Dodge active, against ranged','superstition':'Against spells and magical abilities','raging-leaper':'Jumping','powerful-blow':'Powerful Blow (one roll)','surprise-accuracy':'Surprise Accuracy (one roll)','strength-surge':'Strength Surge (one maneuver)'};
 return selectedAbilities(c).filter(a=>labels[a.id]).map(a=>({id:a.id,label:labels[a.id],conditions:{'class-option.power':a.id}}));
}
export function selectableSummary(c){
 const chosen=selectedAbilities(c),level=c.classes.alchemist??0,mod=a=>Math.floor((c.abilities[a]-10)/2),has=id=>chosen.some(a=>a.id===id);
 const summary={chosen:chosen.map(a=>({id:a.id,name:a.name,text:a.text,classId:a.classId})),abilities:{...c.abilities}};
 if(c.classes.paladin>=2)summary.layOnHands={dice:Math.floor(c.classes.paladin/2)+'d6',mercies:chosen.filter(a=>a.classId==='paladin').map(a=>({name:a.name,text:a.text})),casterLevel:c.classes.paladin};
 if(level){
  const requested=c.builder?.classOptions?.['alchemist-bomb'],variant=has(requested)?requested:'standard',types={'acid-bomb':'acid','frost-bomb':'cold','shock-bomb':'electricity','concussive-bomb':'sonic','force-bomb':'force'},dice=Math.max(0,Math.ceil(level/2)-(variant==='madness-bomb'?2:0)),dispel=variant==='dispelling-bomb';
  summary.bombs={damage:dispel?'No damage':dice+(['concussive-bomb','force-bomb'].includes(variant)?'d4':'d6'),bonus:dispel?0:mod('int'),energy:types[variant]??'fire',dc:10+Math.floor(level/2)+mod('int'),splash:dispel?0:dice+mod('int'),excludedSquares:has('precise-bombs')?Math.max(0,mod('int')):0,text:chosen.find(x=>x.id===variant)?.text??'',variants:chosen.filter(a=>a.id.includes('bomb')).map(a=>({name:a.name,text:a.text}))};
 }
 if(has('resiliency'))summary.resiliency=c.classes.rogue;
 if(has('increased-damage-reduction')&&c.builder?.classOptions?.['barbarian-raging']==='on')summary.damageReduction=Math.max(0,1+Math.floor((c.classes.barbarian-7)/3))+chosen.filter(a=>a.id==='increased-damage-reduction').length;
 if(has('fast-healing'))summary.fastHealing=5;
 summary.magic=chosen.filter(a=>['minor-magic','major-magic'].includes(a.id)).map(a=>{const spell=data.spells.find(x=>x.id===c.builder?.classOptions?.[a.slot.id+'-spell']&&x.level===(a.id==='minor-magic'?0:1));return {name:a.name,spell:spell?.name??'Choose a spell',dc:(a.id==='minor-magic'?10:11)+mod('int'),casterLevel:c.classes.rogue,uses:a.id==='minor-magic'?3:2};});
 summary.masteredSkills=chosen.filter(a=>a.id==='skill-mastery').flatMap(a=>Object.entries(c.builder?.classOptions??{}).filter(([id])=>id.startsWith(a.slot.id+'-skill-')).map(([,value])=>value));
 if(has('feral-mutagen')&&['str','dex','con'].includes(c.builder?.classOptions?.['alchemist-mutagen']))summary.naturalAttacks=[{id:'feral-claw',name:'Claw (two attacks)',medium:'1d6',small:'1d4',type:'slashing'},{id:'feral-bite',name:'Bite',medium:'1d8',small:'1d6',type:'piercing'}];
 if(has('animal-fury')&&c.builder?.classOptions?.['barbarian-raging']==='on')summary.naturalAttacks=[...(summary.naturalAttacks??[]),{id:'animal-fury-bite',name:'Animal Fury bite (secondary)',medium:'1d4',small:'1d3',secondary:true,type:'piercing'}];
 return summary;
}
