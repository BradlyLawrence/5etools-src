import {PALADIN_ARCHETYPES,paladinProgression,BARD_ARCHETYPES,bardProgression,RANGER_ARCHETYPES,rangerProgression,ROGUE_ARCHETYPES,rogueProgression,BARBARIAN_ARCHETYPES,barbarianProgression,FIGHTER_ARCHETYPES,archetypeIds,conflicts,fighterProgression,selectedArchetypes} from './engine/archetypes.mjs';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const slot=s=>s.replace(/-/g,' ');

function renderFighterArchetypes(c){

 if(!c.builder.classOrder.includes('fighter'))return '';

 const selected=archetypeIds(c),level=c.builder.classOrder.filter(x=>x==='fighter').length;

 let html=`<details class="archetype-section" ${selected.length?'open':''}><summary>Fighter archetypes${selected.length?' — '+esc(selectedArchetypes(c).map(p=>p.name).join(', ')):''}</summary><p>Select compatible archetypes. Replaced or altered features are reserved across all 20 fighter levels, including future levels. Untick a selection to release its features.</p>`;

 for(const p of FIGHTER_ARCHETYPES){const checked=selected.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length>0;

 html+=`<div style="margin:12px 0;${disabled?'opacity:0.5;':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto;margin:0;flex:0 0 auto" type="checkbox" data-field="archetype.${esc(p.id)}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>${esc(p.role)}</p><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?`<p>Unavailable: ${esc([...new Set(blocked.map(x=>x.name+' — '+slot(x.slot)))].join('; '))}.</p>`:''}<details><summary>Features and replacements</summary>${p.features.map(f=>`<p><strong>Level ${f.level}: ${esc(f.name)}</strong><br>${esc(f.rulesText)}<br><small>Replaces: ${esc(f.replaces.map(slot).join(', ')||'None')}; alters: ${esc(f.alters.map(slot).join(', ')||'None')}.</small></p>`).join('')}</details></div>`;

 }

 if(selected.length)html+='<p>Replaced bonus-feat and weapon-training choices are suppressed. Tech Fighter’s fixed feats, Tech Use and technological weapon training are calculated. Weapon Master’s training, Weapon Guard and critical save DC bonus are calculated, with conditional Mirror Move and weapon-targeted saves shown separately. Two-Handed Fighter’s bonuses and attack-specific rows are calculated; hit resolution and follow-up maneuvers remain table actions. Phalanx Soldier’s spear handling, shield penalties, maneuvers and personal conditional defenses are calculated; ally benefits are listed separately. Mobile Fighter’s conditional attack/save bonuses and Fleet Footed speed are calculated; attack sequencing remains table-resolved. Armour Master’s touch AC, DR, fortification and capstone defenses are calculated separately from ordinary AC. Archer’s bow bonuses, trick-shot checks, ranged-defense row and selected bow mastery are calculated; target resolution remains at the table. Brawler’s close-group and maneuver bonuses, Stand Still grant and chosen mastery are calculated; Menacing Stance reports penalties for adjacent enemies. Siegebreaker reports success-only maneuver damage, Vigor and distraction values; Persistent Menace constrains its bonus-feat slot. Shielded Fighter, Polearm Master, Roughrider, Crossbowman and Drill Sergeant bonuses and conditional rows are connected. Retained fighter Armour Training, Armour Mastery and Weapon Mastery are calculated. Target effects, positioning, ally support and action resolution remain table-side.</p>';

 html+='</details>';

 html+=`<details class="progression-section" data-class-progression="fighter"><summary>Fighter progression${selected.length?' — '+esc(selectedArchetypes(c).map(p=>p.name).join(' + ')):''}</summary><p>Uses fighter class level, not total character level. Highlighted row is your current fighter level.</p><div style="overflow-x:auto"><table><thead><tr><th>Level</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th><th>Features after replacements</th></tr></thead><tbody>${fighterProgression(c).map(r=>`<tr ${r.level===level?'style="background:#28394a"':''}><th>${r.level}</th><td>${r.bab.map(n=>'+'+n).join('/')}</td><td>+${r.fortitude}</td><td>+${r.reflex}</td><td>+${r.will}</td><td>${r.features.map(f=>esc(f.label)+(f.origin!=='Fighter'?' <small>('+esc(f.origin)+')</small>':'')).join('<br>')||'—'}</td></tr>`).join('')}</tbody></table></div></details>`;



 return html;

}



function renderSupportedArchetypes(c){

 let html=renderPaladinArchetypes(c)+renderFighterArchetypes(c)+renderRogueArchetypes(c)+renderRangerArchetypes(c)+renderBardArchetypes(c);

 const level=c.builder.classOrder.filter(id=>id==='barbarian').length;if(!level)return html;

 const chosen=archetypeIds(c,'barbarian');

 html+='<details class="archetype-section" '+(chosen.length?'open':'')+'><summary>Barbarian archetypes</summary><p>Select compatible archetypes. Replacements are reserved across all 20 class levels.</p>';

 for(const p of BARBARIAN_ARCHETYPES){const checked=chosen.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length;

 html+=`<div style="margin:12px 0;${disabled?'opacity:.5':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" type="checkbox" data-field="archetype.${p.id}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?'<p>Unavailable: '+esc(blocked.map(b=>b.name+' — '+slot(b.slot)).join('; '))+'</p>':''}<details><summary>Features</summary>${p.features.map(f=>'<p style="white-space:pre-line"><strong>Level '+f.level+': '+esc(f.name)+'</strong><br>'+esc(f.rulesText)+'</p>').join('')}</details></div>`;

 }

 html+='</details><details class="progression-section" data-class-progression="barbarian"><summary>Barbarian progression</summary><p>Uses barbarian class level. Conditional effects are shown separately on the sheet.</p><div style="overflow-x:auto"><table><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Features</th></tr>';

 for(const r of barbarianProgression(c))html+=`<tr ${r.level===level?'style="background:#28394a"':''}><td>${r.level}</td><td>${r.bab.join('/')}</td><td>${r.fortitude} / ${r.reflex} / ${r.will}</td><td>${r.features.map(f=>esc(f.label)+' ('+esc(f.origin)+')').join('<br>')}</td></tr>`;

 return html+'</table></div></details>';

}



function renderRogueArchetypes(c){

 const level=c.builder.classOrder.filter(id=>id==='rogue').length;if(!level)return '';

 const chosen=archetypeIds(c,'rogue');let html='<details class="archetype-section" '+(chosen.length?'open':'')+'><summary>Rogue archetypes</summary><p>Replaced and altered features are reserved across all 20 rogue levels. Untick an archetype to release its features.</p>';

 for(const p of ROGUE_ARCHETYPES){const checked=chosen.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length;html+=`<div style="margin:12px 0;${disabled?'opacity:.5':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" type="checkbox" data-field="archetype.${p.id}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>${esc(p.role)}</p><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?'<p>Unavailable: '+esc(blocked.map(b=>b.name+' — '+slot(b.slot)).join('; '))+'</p>':''}<details><summary>Features</summary>${p.features.map(f=>'<p style="white-space:pre-line"><strong>Level '+f.level+': '+esc(f.name)+'</strong><br>'+esc(f.rulesText)+'</p>').join('')}</details></div>`;}

 html+='</details><details class="progression-section" data-class-progression="rogue"><summary>Rogue progression</summary><p>Uses rogue class level. Conditional bonuses appear separately on the sheet.</p><div style="overflow-x:auto"><table><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Features</th></tr>';

 for(const r of rogueProgression(c))html+=`<tr ${r.level===level?'style="background:#28394a"':''}><td>${r.level}</td><td>${r.bab.join('/')}</td><td>${r.fortitude} / ${r.reflex} / ${r.will}</td><td>${r.features.map(f=>esc(f.label)+' ('+esc(f.origin)+')').join('<br>')}</td></tr>`;

 return html+'</table></div></details>';

}


function renderRangerArchetypes(c){

 const level=c.builder.classOrder.filter(id=>id==='ranger').length;if(!level)return '';

 const chosen=archetypeIds(c,'ranger');let html='<details class="archetype-section" '+(chosen.length?'open':'')+'><summary>Ranger archetypes</summary><p>Replaced and altered features are reserved across all 20 ranger levels. Untick an archetype to release its features.</p>';

 for(const p of RANGER_ARCHETYPES){const checked=chosen.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length;html+=`<div style="margin:12px 0;${disabled?'opacity:.5':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" type="checkbox" data-field="archetype.${p.id}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>${esc(p.role)}</p><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?'<p>Unavailable: '+esc(blocked.map(b=>b.name+' — '+slot(b.slot)).join('; '))+'</p>':''}<details><summary>Features</summary>${p.features.map(f=>'<p style="white-space:pre-line"><strong>Level '+f.level+': '+esc(f.name)+'</strong><br>'+esc(f.rulesText)+'</p>').join('')}</details></div>`;}

 html+='</details><details class="progression-section" data-class-progression="ranger"><summary>Ranger progression</summary><p>Uses ranger class level. Conditional bonuses appear separately on the sheet.</p><div style="overflow-x:auto"><table><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Features</th></tr>';

 for(const r of rangerProgression(c))html+=`<tr ${r.level===level?'style="background:#28394a"':''}><td>${r.level}</td><td>${r.bab.join('/')}</td><td>${r.fortitude} / ${r.reflex} / ${r.will}</td><td>${r.features.map(f=>esc(f.label)+' ('+esc(f.origin)+')').join('<br>')}</td></tr>`;

 return html+'</table></div></details>';

}


function renderBardArchetypes(c){

 const level=c.builder.classOrder.filter(id=>id==='bard').length;if(!level)return '';

 const chosen=archetypeIds(c,'bard');let html='<details class="archetype-section" '+(chosen.length?'open':'')+'><summary>Bard archetypes</summary><p>Replaced and altered features are reserved across all 20 bard levels. Untick an archetype to release its features.</p>';

 for(const p of BARD_ARCHETYPES){const checked=chosen.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length;html+=`<div style="margin:12px 0;${disabled?'opacity:.5':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" type="checkbox" data-field="archetype.${p.id}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>${esc(p.role)}</p><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?'<p>Unavailable: '+esc(blocked.map(b=>b.name+' — '+slot(b.slot)).join('; '))+'</p>':''}<details><summary>Features</summary>${p.features.map(f=>'<p style="white-space:pre-line"><strong>Level '+f.level+': '+esc(f.name)+'</strong><br>'+esc(f.rulesText)+'</p>').join('')}</details></div>`;}

 html+='</details><details class="progression-section" data-class-progression="bard"><summary>Bard progression</summary><p>Uses bard class level. Conditional bonuses appear separately on the sheet.</p><div style="overflow-x:auto"><table><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Features</th></tr>';

 for(const r of bardProgression(c))html+=`<tr ${r.level===level?'style="background:#28394a"':''}><td>${r.level}</td><td>${r.bab.join('/')}</td><td>${r.fortitude} / ${r.reflex} / ${r.will}</td><td>${r.features.map(f=>esc(f.label)+' ('+esc(f.origin)+')').join('<br>')}</td></tr>`;

 return html+'</table></div></details>';

}

function renderPaladinArchetypes(c){

 const level=c.builder.classOrder.filter(id=>id==='paladin').length;if(!level)return '';

 const chosen=archetypeIds(c,'paladin');let html='<details class="archetype-section" '+(chosen.length?'open':'')+'><summary>Paladin archetypes and mechanical oaths</summary><p>Replaced and altered features are reserved across all 20 paladin levels. Untick an archetype to release its features.</p>';

 for(const p of PALADIN_ARCHETYPES){const checked=chosen.includes(p.id),blocked=conflicts(c,p.id),disabled=!checked&&blocked.length;html+=`<div style="margin:12px 0;${disabled?'opacity:.5':''}"><label style="display:flex;align-items:center;gap:8px"><input style="width:auto" type="checkbox" data-field="archetype.${p.id}" ${checked?'checked':''} ${disabled?'disabled':''}><strong>${esc(p.name)}</strong></label><p>${esc(p.role)}</p><p>Replaces: ${esc(p.replacements.map(slot).join(', ')||'None')}. Alters: ${esc(p.alterations.map(slot).join(', ')||'None')}.</p>${disabled?'<p>Unavailable: '+esc(blocked.map(b=>b.name+' — '+slot(b.slot)).join('; '))+'</p>':''}<details><summary>Features</summary>${p.features.map(f=>'<p style="white-space:pre-line"><strong>Level '+f.level+': '+esc(f.name)+'</strong><br>'+esc(f.rulesText)+'</p>').join('')}</details></div>`;}

 html+='</details><details class="progression-section" data-class-progression="paladin"><summary>Paladin progression</summary><p>Uses paladin class level. Conditional bonuses appear separately on the sheet.</p><div style="overflow-x:auto"><table><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Features</th></tr>';

 for(const r of paladinProgression(c))html+=`<tr ${r.level===level?'style="background:#28394a"':''}><td>${r.level}</td><td>${r.bab.join('/')}</td><td>${r.fortitude} / ${r.reflex} / ${r.will}</td><td>${r.features.map(f=>esc(f.label)+' ('+esc(f.origin)+')').join('<br>')}</td></tr>`;

 return html+'</table></div></details>';

}

// Reference-only classes use their existing published progression; supported
// archetypes retain the calculated tables above, including replacements.
export function renderArchetypes(c, classes = []) {
 let html = renderSupportedArchetypes(c);
 const supported = new Set(['scoundrel', 'fighter', 'barbarian', 'rogue', 'ranger', 'bard', 'paladin']);
 for (const id of new Set(c.builder.classOrder)) {
  if (supported.has(id)) continue;
  const entry = classes.find(item => item.id === id);
  if (!entry) continue;
  html += `<p>${esc(entry.name)} archetypes: not available in the creator yet.</p>`;
  const table = (entry.rulesHtml || '').match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)?.find(table => /<th\b[^>]*>\s*Level\s*<\/th>/i.test(table) && /Base\s+attack\s+bonus/i.test(table));
  html += `<details class="progression-section" data-class-progression="${esc(id)}"><summary>${esc(entry.name)} progression</summary><p>Current class level: ${c.builder.classOrder.filter(value => value === id).length}. Uses class level, not total character level.</p>${table ? `<div style="overflow-x:auto">${table}</div>` : '<p>See the full class rules for progression details.</p>'}</details>`;
 }
 return html;
}
