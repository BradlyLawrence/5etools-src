import {replacedFighterSlot,archetypeIds,priorStandStill} from './archetypes.mjs';
import {selectedAbilities} from './selectable-abilities.mjs';
import data from './feat-progression-data.mjs';
// Slot IDs are stable across save/import and preserve existing starting-feat saves.
const monk={1:['catch-off-guard','combat-reflexes','deflect-arrows','dodge','improved-grapple','scorpion-style','throw-anything'],6:['gorgon-s-fist','improved-bull-rush','improved-disarm','improved-feint','improved-trip','mobility'],10:['improved-critical','medusa-s-wrath','snatch-arrows','spring-attack']};
const ranger={archery:{2:['far-shot','point-blank-shot','precise-shot','rapid-shot','focused-shot'],6:['improved-precise-shot','manyshot','parting-shot'],10:['pinpoint-targeting','shot-on-the-run']},'two-weapon':{2:['double-slice','improved-shield-bash','quick-draw','two-weapon-fighting'],6:['improved-two-weapon-fighting','two-weapon-defense'],10:['greater-two-weapon-fighting','two-weapon-rend']}};
const through=(table,level)=>Object.entries(table).filter(([n])=>+n<=level).flatMap(([,ids])=>ids);
export function featSlots(c,baseOnly=false){
 const b=c.builder??{},order=b.classOrder??[],slots=[],counts={};
 order.forEach((cls,i)=>{
  if(!cls)return;const level=i+1,n=counts[cls]=(counts[cls]??0)+1;
  if(level%2)slots.push({id:level===1?'starting':'level-'+level,name:`Level ${level} feat`,level});
  if(level===1&&b.raceId==='humans'&&!b.racialAlternates?.includes('eye-for-talent'))slots.push({id:'human',name:'Human bonus feat',level});
  const add=(label,extra={})=>slots.push({id:cls==='fighter'&&level===1?'fighter-starting':`${cls}-bonus-${n}`,name:`${label} (class level ${n})`,level,classId:cls,classLevel:n,...extra});
  if(cls==='fighter'&&(n===1||n%2===0)&&!replacedFighterSlot(c,'bonus-feat-'+n))add('Fighter combat feat',{combat:true,...(n===4&&archetypeIds(c).includes('siegebreaker')?{allowed:['step-up','disruptive'],waive:true}:{})});
  if(cls==='fighter'&&n===13&&archetypeIds(c).includes('brawler')&&priorStandStill(c))slots.push({id:'brawler-stand-still-replacement',name:'Brawler: replacement combat feat',level,classId:cls,classLevel:n,combat:true});
  if(cls==='fighter'&&[2,9,17].includes(n)&&archetypeIds(c).includes('drill-sergeant'))slots.push({id:`drill-sergeant-teamwork-${n}`,name:`Drill Sergeant teamwork feat (fighter level ${n})`,level,classId:cls,classLevel:n,category:'teamwork'});
  if(cls==='gunslinger'&&n%4===0)add('Gunslinger combat feat',{combat:true});
  if(cls==='sorcerer'&&[7,13,19].includes(n)){const blood=data.bloodlines[b.classOptions?.['sorcerer-bloodline']];add('Bloodline bonus feat',{allowed:blood?.feats??[],skills:blood?.skills??[]});}
  if(cls==='wizard'&&n%5===0)add('Wizard bonus feat',{category:'wizard'});
  if(cls==='monk'&&[1,2,6,10,14,18].includes(n))add('Monk bonus feat',{allowed:through(monk,n),waive:true});
  if(cls==='ranger'&&[2,6,10,14,18].includes(n))add('Ranger combat style feat',{allowed:through(ranger[b.classOptions?.['ranger-style']]??{},n),waive:true,style:true});
  if(cls==='inquisitor'&&n%3===0)add('Inquisitor teamwork feat',{category:'teamwork'});
  if(cls==='cavalier'&&n%6===0)add('Cavalier combat feat',{combat:true});
  if(cls==='cavalier'&&[1,9,17].includes(n))slots.push({id:`cavalier-teamwork-${n}`,name:`Cavalier teamwork feat (class level ${n})`,level,classId:cls,classLevel:n,category:'teamwork'});
 });
 for(const a of selectedAbilities({...c,classes:counts},baseOnly))if(a.classId==='rogue'&&['combat-trick','weapon-training','feat'].includes(a.id)){let n=0;const level=a.slot.characterLevel??order.findIndex(id=>id==='rogue'&&++n===a.slot.level)+1;slots.push({id:a.slot.extra?'rogue-talent-feat-'+a.slot.id:'rogue-talent-feat-'+a.slot.level,name:'Rogue talent: '+a.name,level,...(a.id==='combat-trick'?{combat:true}:a.id==='weapon-training'?{allowed:['weapon-focus']}: {})});}
 return slots;
}
export function slotAllows(slot,def){
 if(!def||def.selectable===false||slot.combat&&!def.combat)return false;
 if(slot.allowed&&!slot.allowed.includes(def.id))return false;
 if(slot.category==='wizard'&&def.id!=='spell-mastery'&&!/\((Metamagic|Item Creation)\)/i.test(def.name))return false;
 if(slot.category==='teamwork'&&!data.teamwork.includes(def.id)&&!def.name.includes('Teamwork'))return false;
 return true;
}
export function featSlotWaives(c,selection,def){
 const slot=featSlots(c).find(s=>s.id===selection.creatorSlot);
 return !!slot?.waive&&slotAllows(slot,def)&&(c.classes?.[slot.classId]??0)>=slot.classLevel;
}
