import {spellcasting,spellById,SPELLCASTING} from './engine/spellcasting.mjs';
import {calculate} from './character.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function spellBrief(id){
 const spell=spellById(id);if(!spell)return '';
 const lines=spell.text.split('\n');
 const end=lines.findIndex(line=>/^Saving Throw|^Spell Resistance/i.test(line));
 const body=lines.slice(end<0?1:end+1).filter(line=>!/^Spell Resistance/i.test(line)).join(' ').trim();
 return body.length>420?body.slice(0,417).replace(/\s+\S*$/,'')+'…':body;
}
export function renderSpellcasting(c,sheet=null,review=false){
 const casters=spellcasting(c,calculate(c));if(!casters.length)return '<p>Your selected classes do not grant spellcasting.</p>';
 let html='';
 const select=(caster,kind,row,index,ids,value,label)=>{
  const field=`spell.${caster.id}.${kind}.${row.level}.${index}`;
  const placeholder=kind==='prepared'||kind==='special'?'Leave unprepared':'Choose a spell';
  const choices=[...new Set([...(value?[value]:[]),...ids])].sort((a,b)=>(spellById(a)?.name??a).localeCompare(spellById(b)?.name??b));
  return `<div class="spell-choice"><span>${esc(label)}</span><details class="spell-picker"><summary aria-label="${esc(label)}">${esc(value?(spellById(value)?.name??value):placeholder)}</summary><div class="spell-options" role="group" aria-label="${esc(label)} options"><button type="button" data-spell-field="${field}" data-spell-id="">${placeholder}</button>${choices.map(id=>`<button type="button" data-spell-field="${field}" data-spell-id="${esc(id)}" aria-pressed="${id===value}"><span>${esc(spellById(id)?.name??id)}${!ids.includes(id)?' (unavailable)':''}${kind==='prepared'&&row.cost(id)===2?' — costs 2 slots':''}</span><small class="spell-preview">${esc(spellBrief(id))}</small></button>`).join('')}</div></details></div>`;
 };
 for(const caster of casters){
  html+=`<section><h3>${caster.name} ${caster.id==='alchemist'?'extracts':'spellcasting'}</h3><p>${caster.ability.toUpperCase()} ${caster.score} · ${caster.id==='alchemist'?'Extract caster level':'Caster level'} ${caster.casterLevel}${caster.id==='alchemist'?'':` · Concentration ${caster.concentration>=0?'+':''}${caster.concentration+(sheet?.stats['concentration.bonus']?.total??0)}`}.</p>`;
  if(!caster.rows.length){html+='<p>Spellcasting begins at class level 4.</p></section>';continue;}
  if(caster.mode==='book')html+=`<p>${caster.id==='alchemist'?'Formula book':'Spellbook'}: ${caster.bookCount} levelled spells entered. Class levels and starting Intelligence grant ${caster.bookMinimum}; additional spells can be copied during play. This estimate uses your current permanent Intelligence modifier.</p>`;
  if(caster.mode==='known')html+='<p>Choose spells known. Cast them using this class’s daily slots; preparation is not required. Level 0 spells are usable at will.</p>';
  else html+='<p>Prepare each copy you want available. Slots can be left open. Prepared level 0 spells remain available after casting.</p>';
  if(caster.opposition.length)html+='<p>Each opposition-school spell costs two normal preparation slots. Specialist slots accept only spells from your chosen school.</p>';
  if(caster.id==='cleric'||caster.id==='druid')html+='<p>Choose spells permitted by your alignment and faith. Spontaneous cure, inflict or summon conversions are resolved when casting.</p>';
  if(!review&&caster.id==='sorcerer'&&c.builder.classOptions?.['sorcerer-bloodline']==='arcane')for(const [index,at] of [9,13,17].entries())if(caster.level>=at){const max=Math.max(...Object.entries(SPELLCASTING.classes.sorcerer.daily[at-1]).filter(([,v])=>v!==null).map(([n])=>+n));html+=select(caster,'arcane',caster.rows.find(x=>x.level===0),index,SPELLCASTING.spells.filter(s=>s.levels.sorcerer<=max).map(s=>s.id),caster.state.arcane?.[0]?.[index],`New Arcana (gained at level ${at})`);}
  for(const row of caster.rows){
   html+=`<details open><summary><strong>Level ${row.level}</strong> — ${row.atWill?'at will':`${row.slots} daily slots${row.specialSlots?' + 1 domain/specialist slot':''}`}</summary>`;
   if(!row.eligible)html+=`<p>Requires ${caster.ability.toUpperCase()} ${10+row.level} to cast.</p>`;
   if(row.level>0)html+=`<p>Base slots ${row.base??0} + ability bonus ${row.bonus}. Base save DC ${row.dc}; spell-school feat bonuses appear with each selected spell.</p>`;
   if(!review){
    if(caster.mode==='known')for(let i=0;i<Math.max(row.knownCount,row.selected.length);i++)html+=select(caster,'known',row,i,row.options.filter(s=>!row.automatic.includes(s.id)).map(s=>s.id),row.selected[i],`Known spell ${i+1} of ${row.knownCount}`);
    if(caster.mode==='book'){
     for(let i=0;i<row.selected.length;i++)html+=select(caster,'book',row,i,row.options.filter(s=>!row.bookAuto.includes(s.id)).map(s=>s.id),row.selected[i],`Book entry ${i+1}`);
     if(row.selected.length<100)html+=select(caster,'book',row,row.selected.length,row.options.filter(s=>!row.bookAuto.includes(s.id)&&!row.selected.includes(s.id)).map(s=>s.id),'','Add to book');
     if(row.bookAuto.length)html+='<p>Starting cantrips are included automatically, except opposition-school cantrips.</p>';
    }
    if(caster.mode!=='known'){
     html+=`<p>${row.used} of ${row.slots} preparation slots filled.</p>`;
     for(let i=0;i<Math.max(row.slots,row.prepared.length);i++)html+=select(caster,'prepared',row,i,row.available,row.prepared[i],`Preparation ${i+1}`);
     for(let i=0;i<Math.max(row.specialSlots,row.specialPrepared.length);i++)html+=select(caster,'special',row,i,row.special.map(s=>s.id),row.specialPrepared[i],caster.id==='wizard'?'School preparation':'Domain preparation');
    }
   }
   if(row.automatic.length)html+=`<p>Additional spells known: ${row.automatic.map(id=>esc(spellById(id)?.name??id)).join(', ')}.</p>`;
   const displayed=caster.mode==='known'?[...row.selected,...row.automatic]:[...row.prepared,...row.specialPrepared];
   for(const id of new Set(displayed.filter(Boolean))){const s=spellById(id);if(!s)continue;const dc=row.dc+(sheet?.stats['spell.dc.'+s.school]?.total??0),copies=displayed.filter(x=>x===id).length;html+=`<details><summary>${esc(s.name)}${copies>1?' ×'+copies:''} · DC ${dc}</summary><div style="white-space:pre-line">${esc(s.text)}</div></details>`;}
   html+='</details>';
  }
  if(caster.issues.length)html+='<ul>'+caster.issues.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
  html+='</section>';
 }
 return html;
}
