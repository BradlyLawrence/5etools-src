import {renderCombatPassives} from './combat-passives.mjs';
import {renderCombatBuffs} from './combat-buffs.mjs';
import {renderCombatEquipment} from './combat-equipment.mjs';
import {calculate,materialize} from './character.mjs';
import {spellcasting,spellById} from './engine/spellcasting.mjs';
import {METAMAGIC,selectedMetamagic,slotUsage,spellCastPreview} from './engine/spell-use.mjs';
import {renderSpellcasting} from './spellcasting-ui.mjs';
import {equipmentSheet} from './equipment.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCombatSpells(input,rules,sheet=equipmentSheet(input,rules)){
 const c=materialize(input),r=calculate(c),casters=spellcasting(c,r);
 if(!casters.length)return '<p>No spellcasting classes.</p>';
 let html='<details class="spell-list" data-sheet-disclosure="spell-list" open><summary>Spells & slots</summary><details data-sheet-disclosure="casting-help"><summary>Casting help</summary><p class="sheet-hint">Choose metamagic to preview a spell. Cast spends and saves its slot; it does not roll attacks, resolve spell failure or apply buffs to a target. A failed cast still spends its slot.</p></details>';
 if(c.spellUse?.lastCast)html+='<button type="button" data-spell-undo>Undo last slot expenditure</button>';
 for(const caster of casters){
  html+=`<section class="combat-caster"><h4>${esc(caster.name)} · caster level ${caster.casterLevel}</h4>`;
  if(c.builder?.classOptions?.['barbarian-raging']==='on')html+='<p class="spell-cast-error">Rage is active. Check your rage and any casting exceptions before recording a cast.</p>';
  if(caster.mode!=='known'){html+='<p>Prepared casting: use the preparation list in Classic/Spells. Prepared-use tracking is not yet available here.</p></section>';continue;}
  html+=`<div class="sheet-stats">${caster.rows.filter(x=>!x.atWill).map(row=>{const u=slotUsage(c,caster,row);return `<div class="sheet-stat"><span>Level ${row.level} slots</span><strong>${u.available} available / ${u.total}</strong><small>${u.spent} used</small></div>`;}).join('')}</div><p><button type="button" data-spell-restore="${esc(caster.id)}">Restore ${esc(caster.name)} daily slots…</button></p>`;
  const owned=(sheet.feats??[]).filter(x=>x.active).map(x=>x.featId),metamagic=Object.entries(METAMAGIC).filter(([id])=>owned.includes(id));
  const unsupported=rules.feats.filter(f=>owned.includes(f.id)&&f.name.includes('(Metamagic)')&&!METAMAGIC[f.id]);
  if(unsupported.length)html+=`<p>Not yet automated: ${unsupported.map(f=>esc(f.name)).join(', ')}. These modifiers cannot be selected in this first casting panel.</p>`;
  for(const row of caster.rows){
   html+=`<details class="spell-level" data-sheet-disclosure="${esc(caster.id)}-level-${row.level}" open><summary>${row.atWill?'Cantrips · at will':'Level '+row.level+' spells'} <small>${new Set(row.available).size} spells</small></summary>`;
   for(const id of new Set(row.available)){
    const spell=spellById(id);if(!spell)continue;
    const selected=selectedMetamagic(c,caster.id,id),key=`${caster.id}|${id}`;
    let p;try{p=spellCastPreview(c,r,caster.id,id,selected,sheet.stats['spell.dc.'+spell.school]?.total??0);}catch(error){html+=`<article class="combat-spell"><h4>${esc(spell.name)}</h4><p>${esc(error.message)}</p><button type="button" data-spell-clear="${esc(key)}">Clear metamagic selections</button></article>`;continue;}
    html+=`<article class="combat-spell"><div class="spell-action-row"><h4>${esc(spell.name)}</h4><span class="spell-slot-label">${p.atWill?'Level 0 · at will':'Level '+p.baseLevel+' · uses level '+p.slotLevel+' slot'}</span><div class="spell-metamagic">${metamagic.map(([feat,def])=>`<label><input type="checkbox" data-spell-meta="${esc(key)}" data-metamagic="${feat}" ${selected.includes(feat)?'checked':''}> ${def.name} (+${def.adjustment})</label>`).join('')}</div><button type="button" data-spell-cast="${esc(key)}" ${p.canCast?'':'disabled'} aria-label="Cast ${esc(spell.name)}${p.atWill?'':' using a level '+p.slotLevel+' slot'}">Cast</button></div>${p.errors.length?`<p class="spell-cast-error">${p.errors.map(esc).join(' ')}</p>`:''}<details data-sheet-disclosure="spell-details-${esc(caster.id)}-${esc(id)}"><summary>Spell details</summary><dl class="spell-preview-stats"><div><dt>Save DC</dt><dd>${p.dc} <small>Only if the spell allows a save</small></dd></div><div><dt>Casting time</dt><dd>${esc(p.castingTime)}</dd></div><div><dt>Duration</dt><dd>${esc(p.duration)}</dd></div><div><dt>Range</dt><dd>${esc(p.range)}</dd></div><div><dt>Damage / effect</dt><dd>${esc(p.damage)}</dd></div></dl>${metamagic.map(([,def])=>`<p class="sheet-hint"><strong>${def.name}:</strong> ${esc(def.description)}</p>`).join('')}<p style="white-space:pre-line">${esc(spell.text)}</p></details></article>`;
   }
   html+='</details>';
  }
  html+='</section>';
 }
 if(casters.some(x=>x.mode!=='known'))html+=`<details><summary>Full spell preparation reference</summary>${renderSpellcasting(c,sheet,true)}</details>`;
 return html+'</details>';
}
export function renderCombatSheet(c,rules){
 const s=equipmentSheet(c,rules),stat=id=>s.stats[id]?.total;
 return `<article class="classic-sheet"><header class="sheet-heading"><div><span class="sheet-eyebrow">PATHFINDER · COMBAT</span><h2>${esc(c.name)}</h2><p>HP maximum ${s.hitPoints.total} · AC ${stat('ac')} / Touch ${stat('ac.touch')} / Flat-footed ${stat('ac.flat-footed')} · Initiative ${stat('initiative')>=0?'+':''}${stat('initiative')} · Speed ${s.equipment.speedFt} ft.</p><p>${esc(rules.equipment.items.find(i=>i.id===c.equipment?.armorId)?.name??'No armour')} · Arcane spell failure ${s.equipment.arcaneFailurePercent}%</p><p>Fort ${stat('save.fortitude')} · Ref ${stat('save.reflex')} · Will ${stat('save.will')}</p>${s.uncannyDodge?'<p class="sheet-hint">Uncanny Dodge retains Dexterity when flat-footed.</p>':''}</div></header><div class="combat-layout">${renderCombatBuffs(c,rules,s)}<div class="combat-main">${renderCombatEquipment(c,rules)}<section class="sheet-block"><h3>Shared character notes</h3><label>Notes<textarea data-field="notes" rows="5">${esc(c.notes??'')}</textarea></label></section><section class="sheet-block"><h3>Spellcasting</h3>${renderCombatSpells(c,rules,s)}</section>${renderCombatPassives(c,rules)}</div></div></article>`;
}
