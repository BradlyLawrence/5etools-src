import data from './spellcasting-data.mjs';
export const SPELLCASTING=data;
const byId=new Map(data.spells.map(s=>[s.id,s]));
export const spellById=id=>byId.get(id);
const mod=score=>Math.floor((score-10)/2);
const list=(state,kind,level)=>state?.[kind]?.[level]??[];
export function validateSpellcasting(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid spellcasting choices.');
 for(const [cls,state] of Object.entries(value)){
  if(!data.classes[cls]||!state||typeof state!=='object'||Array.isArray(state))throw Error('Invalid spellcasting class.');
  for(const [kind,rows] of Object.entries(state)){
   if(!['known','book','prepared','special','arcane'].includes(kind)||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('Invalid spell selection group.');
   for(const [level,ids] of Object.entries(rows))if(!/^\d$/.test(level)||!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||id&&!byId.has(id)))throw Error('Invalid saved spell selection.');
  }
 }
}
export function spellcasting(c,r){
 const result=[],choices=c.builder?.classOptions??{};
 for(const [cls,level] of Object.entries(r.classes)){
  const def=data.classes[cls];if(!def||!level)continue;
  const state=c.builder?.spellcasting?.[cls]??{},score=r.abilities[def.ability],abilityMod=mod(score),table=def.daily[level-1],known=def.known[level-1]??{},issues=[],rows=[];
  const opposition=cls==='wizard'&&choices['wizard-school']!=='universalist'?[choices['wizard-opposition-1'],choices['wizard-opposition-2']].filter(Boolean):[];
  const domains=cls==='cleric'?[choices['cleric-domain-1'],choices['cleric-domain-2']]:cls==='druid'&&choices['druid-bond']==='domain'?[choices['druid-domain']]:[];
  const bloodline=cls==='sorcerer'?data.bonus.bloodlines[choices['sorcerer-bloodline']]??{}:{};
  const auto=Object.entries(bloodline).filter(([n])=>+n<=level).map(([n,id])=>({id,level:(+n-1)/2}));
  const arcaneBonus=[];
  if(cls==='sorcerer'&&choices['sorcerer-bloodline']==='arcane')for(const [index,at] of [9,13,17].entries())if(level>=at){const maximum=Math.max(...Object.entries(def.daily[at-1]).filter(([,v])=>v!==null).map(([n])=>+n)),options=data.spells.filter(s=>s.levels.sorcerer<=maximum),id=list(state,'arcane',0)[index];if(!options.some(s=>s.id===id))issues.push(`Choose the New Arcana spell gained at sorcerer level ${at}.`);else arcaneBonus.push({id,level:byId.get(id).levels.sorcerer});}
  const levels=[...new Set([...Object.keys(table),...Object.keys(known)])].map(Number).sort((a,b)=>a-b);
  for(const n of levels){
   const base=table[n]??null,knownCount=known[n]??0;if(base===null&&!knownCount)continue;
   const eligible=score>=10+n,bonus=n>0&&base!==null&&abilityMod>=n?1+Math.floor((abilityMod-n)/4):0;
   const slots=eligible?(base??0)+bonus:0,options=data.spells.filter(s=>s.levels[cls]===n);
   const automatic=[...auto,...arcaneBonus].filter(x=>x.level===n).map(x=>x.id);
   const selected=list(state,def.mode==='book'?'book':'known',n);
   const bookAuto=cls==='wizard'&&n===0?options.filter(s=>!opposition.includes(s.school)).map(s=>s.id):[];
   const valid=selected.filter(id=>options.some(s=>s.id===id)),available=def.mode==='prepared'?options.map(s=>s.id):[...new Set([...valid,...automatic,...bookAuto])];
   if(selected.some(id=>id&&!valid.includes(id)))issues.push(`${cls}: a level ${n} spell is no longer on this class list.`);
   if(new Set(valid).size!==valid.length)issues.push(`${cls}: duplicate level ${n} spells known or book entries.`);
   if(def.mode==='known'&&valid.length!==knownCount)issues.push(`${cls}: choose ${knownCount} level ${n} spells known (${valid.length} selected).`);
   let special=[];
   if(n>0&&base!==null&&eligible){
    if(cls==='wizard'&&choices['wizard-school']&&choices['wizard-school']!=='universalist')special=options.filter(s=>s.school===choices['wizard-school']&&available.includes(s.id)).map(s=>({id:s.id,note:s.name}));
    else special=domains.flatMap(domain=>data.bonus.domains[domain]?.[n]?[data.bonus.domains[domain][n]]:[]);
   }
   const specialSlots=n>0&&eligible&&base!==null&&(cls==='wizard'&&choices['wizard-school']&&choices['wizard-school']!=='universalist'||domains.filter(Boolean).length)?1:0;
   const prepared=list(state,'prepared',n),specialPrepared=list(state,'special',n);
   const cost=id=>cls==='wizard'&&opposition.includes(byId.get(id)?.school)?2:1;
   const used=prepared.filter(Boolean).reduce((sum,id)=>sum+cost(id),0);
   if(def.mode!=='known'){
    if(used>slots)issues.push(`${cls}: level ${n} preparations exceed the ${slots} available slots.`);
    if(prepared.some(id=>id&&!available.includes(id)))issues.push(`${cls}: a prepared level ${n} spell is not available in this spellbook or class list.`);
    if(specialPrepared.filter(Boolean).length>specialSlots||specialPrepared.some(id=>id&&!special.some(s=>s.id===id)))issues.push(`${cls}: review the level ${n} domain or specialist preparation.`);
   }
   rows.push({level:n,base,bonus,slots,eligible,knownCount,selected,automatic,available,options,bookAuto,special,specialSlots,prepared,specialPrepared,used,cost,dc:10+n+abilityMod,atWill:n===0});
  }
  for(const kind of ['known','prepared','special','book'])for(const [n,ids] of Object.entries(state[kind]??{}))if(!rows.some(row=>row.level===+n)&&ids.some(Boolean))issues.push(`${cls}: saved level ${n} ${kind} selections are unavailable at this class level.`);
  const bookMinimum=def.mode==='book'?Math.max(0,(cls==='wizard'?3:2)+abilityMod)+(cls==='wizard'?2:1)*(level-1):0;
  const bookCount=rows.filter(row=>row.level>0).reduce((n,row)=>n+row.selected.filter(id=>row.options.some(s=>s.id===id)).length,0);
  if(def.mode==='book'&&bookCount<bookMinimum)issues.push(`${cls}: add spells or formulae to the book (${bookCount} entered; ${bookMinimum} gained from starting Intelligence and class levels).`);
  result.push({id:cls,name:def.name,level,mode:def.mode,ability:def.ability,score,abilityMod,casterLevel:['paladin','ranger'].includes(cls)?Math.max(0,level-3):level,concentration:(['paladin','ranger'].includes(cls)?Math.max(0,level-3):level)+abilityMod,rows,issues,bookMinimum,bookCount,state,opposition});
 }
 return result;
}
export function setSpell(c,r,cls,kind,level,index,id){
 if(!['known','book','prepared','special','arcane'].includes(kind)||!Number.isInteger(index)||index<0||index>99)throw Error('Invalid spell choice.');
 const casting=spellcasting(c,r).find(x=>x.id===cls),row=casting?.rows.find(x=>x.level===level);if(!casting||!row)throw Error('This class cannot select spells of that level.');
 let options=[],maximum=100;
 if(kind==='known'){if(casting.mode!=='known')throw Error('This class prepares spells.');options=row.options.map(s=>s.id).filter(id=>!row.automatic.includes(id));maximum=row.knownCount;}
 if(kind==='book'){if(casting.mode!=='book')throw Error('This class has no spellbook.');options=row.options.map(s=>s.id).filter(id=>!row.bookAuto.includes(id));}
 if(kind==='prepared'){if(casting.mode==='known')throw Error('Spontaneous casters do not prepare spells.');options=row.available;maximum=row.slots;}
 if(kind==='special'){options=row.special.map(s=>s.id);maximum=row.specialSlots;}
 if(kind==='arcane'){
  const at=[9,13,17][index];if(cls!=='sorcerer'||c.builder?.classOptions?.['sorcerer-bloodline']!=='arcane'||!at||casting.level<at)throw Error('New Arcana is unavailable.');
  const max=Math.max(...Object.entries(data.classes.sorcerer.daily[at-1]).filter(([,v])=>v!==null).map(([n])=>+n));options=data.spells.filter(s=>s.levels.sorcerer<=max).map(s=>s.id);
 }
 if(id&&(index>=maximum||!options.includes(id)))throw Error('Choose an available spell for this slot.');
 const saved=structuredClone(c.builder.spellcasting??{});saved[cls]??={};saved[cls][kind]??={};const selected=[...(saved[cls][kind][level]??[])];while(selected.length<=index)selected.push('');selected[index]=id;
 if(['known','book','arcane'].includes(kind)&&new Set(selected.filter(Boolean)).size!==selected.filter(Boolean).length)throw Error('That spell is already selected.');
 if(kind==='prepared'&&selected.filter(Boolean).reduce((n,id)=>n+row.cost(id),0)>row.slots)throw Error('Not enough preparation slots. Opposition-school spells use two slots.');
 saved[cls][kind][level]=selected;c.builder.spellcasting=saved;
}
