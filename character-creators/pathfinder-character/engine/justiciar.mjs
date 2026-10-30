import {classCounts} from './practiced.mjs';
import casting from './spellcasting-data.mjs';
export const PRESTIGE_IDS=['wyrmward-justiciar','covenant-theurge'];
const options=c=>c.builder?.classOptions??{};
export const ORDER_FEATS=['mounted-combat','ride-by-attack','spirited-charge','mounted-archery','trample','combat-casting','improved-counterspell','iron-will'];
export const PRESTIGE_CLASSES=PRESTIGE_IDS.map((id,i)=>({id,name:i?'Covenant Theurge':'Wyrmward Justiciar',status:'approved',text:'Ten-level draconic prestige class. Casting advances at levels 2–5 and 7–10. See class choices for progression and eligibility.'}));
export function prestigeSpecs(c){
 const counts=classCounts(c),out=[];
 for(const id of PRESTIGE_IDS)if(counts[id]){
  const add=(key,label,values)=>out.push({id:id+'-'+key,label,options:values.map(v=>({id:v,name:v.replaceAll('-',' ')}))});
  add('arcane','Existing spontaneous arcane class', ['sorcerer','bard'].filter(x=>counts[x]));
  if(id==='covenant-theurge')add('divine','Existing divine casting class',['cleric','druid','inquisitor','paladin','ranger'].filter(x=>counts[x]&&(!['paladin','ranger'].includes(x)||counts[x]>=4)&&!(x==='paladin'&&(c.builder?.archetypes?.paladin??[]).includes('warrior-of-the-holy-light'))));
  add('path','Prestige path',['standard','mounted']);
 }
 if(PRESTIGE_IDS.some(id=>counts[id])){
  out.push({id:'justiciar-induction',label:'Order induction',options:[{id:'confirmed',name:'Inducted into the draconic order'}]});
  out.push({id:'justiciar-heritage',label:'Draconic heritage',options:[{id:'dragonborn',name:'Dragonborn ancestry'},{id:'half-dragon',name:'GM-confirmed half-dragon heritage'},{id:'draconic-bloodline',name:'Draconic sorcerer bloodline'}]});
 }
 return out;
}
export function prestigeProgression(id,mounted=false){return Array.from({length:10},(_,i)=>{
 const n=i+1,theurge=id==='covenant-theurge',features=[];
 if(n===1)features.push(theurge?'Armour failure reduction 5%':'Proficient light/medium armour casting',...(mounted?['Existing divine mount advancement']:[]));
 if(n===2)features.push('Arcane Investigator');if(n===3)features.push('Marked Caster +2');
 if(theurge&&[4,7,10].includes(n))features.push('Armour failure reduction '+(5+5*Math.floor((n-1)/3))+'%');
 if(!theurge&&[4,8].includes(n)&&!(mounted&&n===4))features.push('Order Training bonus feat');
 if(!theurge&&n===5)features.push('Proficient heavy armour casting');if(!theurge&&n===6)features.push('Rider Ward');
 if(n===7)features.push('Marked Caster +3');if(n===9)features.push('Battlefield Concentration');if(n===10)features.push('Marked Caster +4',...(!theurge||!mounted?['Interdict']:[]));
 return {level:n,bab:Math.floor(n*(theurge?.75:1)),fort:Math.floor(n/3),ref:Math.floor(n/3),will:2+Math.floor(n/2),casting:[1,6].includes(n)?'None':theurge?'+1 arcane / +1 divine':'+1 arcane',features};
});}
export function castingLevels(c){
 const counts=classCounts(c),out={...counts},b=options(c);
 for(const id of PRESTIGE_IDS){const n=Math.min(10,counts[id]??0),advance=Math.max(0,n-1-(n>=6?1:0));
  for(const kind of id==='covenant-theurge'?['arcane','divine']:['arcane']){const cls=b[id+'-'+kind];if((kind==='arcane'?['sorcerer','bard']:['cleric','druid','inquisitor','paladin','ranger']).includes(cls)&&counts[cls]&&casting.classes[cls])out[cls]=Math.min(20,out[cls]+advance);}
 }
 return out;
}
const rates={fighter:1,paladin:1,barbarian:1,ranger:1,gunslinger:1,cavalier:1,ironwright:1,sorcerer:.5,wizard:.5,'wyrmward-justiciar':1,'covenant-theurge':.75};
export function prestigeIssues(c){
 const order=c.builder?.classOrder??[],b=options(c),issues=[],seen=new Set(),counts=classCounts(c);
 if(PRESTIGE_IDS.every(id=>counts[id]))issues.push('Choose Justiciar or Covenant Theurge; they are variants of the same prestige class, not separate progressions.');
 for(const id of PRESTIGE_IDS){if((counts[id]??0)>10)issues.push('Prestige classes have a maximum of ten levels.');}
 order.forEach((id,index)=>{if(!PRESTIGE_IDS.includes(id)||seen.has(id))return;seen.add(id);
  const prior=classCounts({builder:{classOrder:order.slice(0,index)}}),prefix={...c,classes:prior,builder:{...c.builder,classOrder:order.slice(0,index)}};
  const fail=message=>issues.push(`Before character level ${index+1}: ${message}`);
  if(Object.entries(prior).reduce((n,[x,l])=>n+Math.floor(l*(rates[x]??.75)),0)<4)fail('Justiciar requires BAB +4.');
  if(!['fighter','paladin','ranger','barbarian','cleric','druid','cavalier','gunslinger','inquisitor','ironwright'].some(x=>prior[x])&&!(c.feats??[]).some(f=>f.featId==='armor-proficiency-medium'&&(!f.creatorSlot||f.creatorSlot==='starting'||Number(f.creatorSlot.match(/^level-(\d+)$/)?.[1])<=index)))fail('Medium armour proficiency is required before prestige entry.');
  const ranks=c.builder?.skills?.spellcraft;const total=typeof ranks==='object'?(ranks.normal??0)+(ranks.background??0):c.skillRanks?.spellcraft??0;
  if(total<5||index<5)fail('Spellcraft 5 ranks is required; confirm those ranks were gained before entry.');
  const heritage=b['justiciar-heritage'];if(!(heritage==='half-dragon'||heritage==='dragonborn'&&c.builder?.raceId==='dragonborn'||heritage==='draconic-bloodline'&&prior.sorcerer&&b['sorcerer-bloodline']==='draconic'))fail('Choose qualifying draconic heritage.');
  if(b['justiciar-induction']!=='confirmed')fail('Confirm induction into the order.');
  const arc=b[id+'-arcane'];if(!['sorcerer','bard'].includes(arc)||!prior[arc]||(c.abilities?.cha??10)<11)fail('Existing first-level spontaneous arcane casting is required.');
  if(id==='covenant-theurge'){
   const div=b[id+'-divine'],l=prior[div]??0,def=casting.classes[div],holy=(c.builder?.archetypes?.paladin??[]).includes('warrior-of-the-holy-light');
   const score=c.abilities?.[def?.ability]??10,base=def?.daily[l-1]?.[1];
   if(!['cleric','druid','inquisitor','paladin','ranger'].includes(div)||!l||score<11||base==null||base===0&&score<12||div==='paladin'&&holy)fail('Existing first-level divine casting is required; Holy Light does not qualify.');
  }
  if(b[id+'-path']==='mounted'&&(!(prior.paladin>=5)||(c.builder?.archetypes?.paladin??[]).some(x=>['divine-defender','oath-of-charity','oath-against-the-wyrm'].includes(x))||!((c.builder?.archetypes?.paladin??[]).includes('shining-knight')||b['paladin-bond']==='mount')))fail('Mounted path requires an existing paladin divine mount before prestige entry.');
 });return issues;
}
export function prestigeSummary(c){
 const counts=classCounts(c),b=options(c);return PRESTIGE_IDS.filter(id=>counts[id]).map(id=>{const n=Math.min(10,counts[id]),theurge=id==='covenant-theurge',mounted=b[id+'-path']==='mounted';return {id,name:theurge?'Covenant Theurge':'Wyrmward Justiciar',level:n,mounted,castingAdvancement:Math.max(0,n-1-(n>=6?1:0)),arcane:b[id+'-arcane'],divine:theurge?b[id+'-divine']:null,armourReduction:theurge?5+5*Math.floor((n-1)/3):0,ignoreArmour:!theurge?(n>=5?'heavy':'medium'):null,markBonus:n>=3?(n>=10?4:n>=7?3:2):0,markUses:Math.max(1,3+Math.floor(((c.abilities?.cha??10)-10)/2)),ridersWard:!theurge&&n>=6,interdict:n>=10&&!(theurge&&mounted),battlefieldConcentration:n>=9,investigator:n>=2};});
}
export const mountAdvancement=c=>prestigeSummary(c).filter(x=>x.mounted).reduce((n,x)=>n+x.level,0);
export function prestigeEffects(c,conditions={}){
 const out=[],add=(target,value,name,bonusType='untyped')=>out.push({kind:'modifier',target,value,name,bonusType,featId:'justiciar.'+name});
 for(const p of prestigeSummary(c)){
  if(p.investigator&&conditions['class-option.justiciar-identify'])add('skill.spellcraft',2,'Arcane Investigator');
  if(p.markBonus&&conditions['class-option.justiciar-mark'])for(const save of ['fortitude','reflex','will'])add('save.'+save,p.markBonus,'Marked Caster','insight');
  if(p.battlefieldConcentration&&conditions['class-option.justiciar-motion'])add('concentration.bonus',4,'Battlefield Concentration');
 }return out;
}
export function prestigeScenarios(c){return prestigeSummary(c).length?['identify','mark','motion'].map(id=>({id:'justiciar-'+id,label:{identify:'Identify spell being cast or ongoing spell',mark:'Save against designated caster spell',motion:'Concentration during vigorous or violent motion'}[id],conditions:{['class-option.justiciar-'+id]:true}})):[];}
