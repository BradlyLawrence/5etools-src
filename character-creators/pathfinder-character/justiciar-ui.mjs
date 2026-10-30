const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {prestigeProgression} from './engine/justiciar.mjs';
export function renderPrestigeSummary(rows=[],bloodline=null){
 let html='';for(const p of rows){html+=`<h3>${esc(p.name)} ${p.level}</h3><p>Spellcasting advancement: +${p.castingAdvancement} ${esc(p.arcane)}${p.divine?' and +'+p.castingAdvancement+' '+esc(p.divine):''}. Other base-class features do not advance.</p><p>${p.armourReduction?'Proficient body-armour spell failure reduction '+p.armourReduction+' percentage points; stacks with activated armour feats.':'Ignore proficient light/medium'+(p.ignoreArmour==='heavy'?'/heavy':'')+' body-armour failure.'} Applies to the selected arcane class; shields remain separate.</p>`;
 html+='<details><summary>Full prestige progression</summary><table><thead><tr><th>Level</th><th>BAB</th><th>Fort / Ref / Will</th><th>Casting</th><th>Features</th></tr></thead><tbody>'+prestigeProgression(p.id,p.mounted).map(r=>`<tr><td>${r.level}</td><td>+${r.bab}</td><td>+${r.fort} / +${r.ref} / +${r.will}</td><td>${esc(r.casting)}</td><td>${esc(r.features.join('; '))}</td></tr>`).join('')+'</tbody></table></details>';
 if(p.mounted)html+=`<p>Existing divine mount gains +${p.level} effective druid levels; no celestial/SR milestone or summon-use advancement. Gives up ${p.id==='covenant-theurge'?'Interdict at 10':'Order Training at 4'}.</p>`;
 if(p.investigator)html+='<p>Arcane Investigator: +2 Spellcraft to identify casting and ongoing spell effects (conditional).</p>';
 if(p.markBonus)html+=`<p>Marked Caster: ${p.markUses}/day; swift action, visible caster within 60 feet observed casting this encounter, one minute, one active mark. +${p.markBonus} insight on saves against its spells and dispel/counterspell checks against those spells. Does not grant a counterspell action.</p>`;
 if(p.ridersWard)html+='<p>Rider’s Ward: your ridden living mount shares Marked Caster’s saving-throw bonus against the marked caster.</p>';
 if(p.battlefieldConcentration)html+='<p>Battlefield Concentration: +4 concentration against vigorous/violent motion, including riding.</p>';
 if(p.interdict)html+='<p>Interdict: once/day, immediate-action counterspell against the marked caster using a known dispel magic or greater dispel magic and an appropriate spell slot. Normal dispel check; uses your next swift action.</p>';
 }
 if(bloodline){html+=`<h3>${esc(bloodline.name)} bloodline powers</h3><p>Effective bloodline level ${bloodline.level}${bloodline.robe?' including the equipped robe':''}; casting, bonus spells and bonus feats advance separately.</p>`;
 const d=bloodline.draconic;if(d){html+=`<p>Medium claws: ${d.claws} + Strength; ${d.clawRounds} rounds/day${d.magicClaws?'; magic for DR':''}. Energy resistance ${d.resistance}; natural armour +${d.naturalArmor} (apply normal stacking).</p>`;if(d.breath)html+=`<p>Breath: ${d.breath.dice}, Reflex DC ${d.breath.dc} half, ${d.breath.uses}/day.</p>`;if(d.wings)html+='<p>Wings: standard action to manifest, fly 60 ft. (average); free action to dismiss.</p>';if(d.powerOfWyrms)html+='<p>Power of Wyrms: immunity to sleep, paralysis and ancestry energy; blindsense 60 ft.</p>';}
 for(const text of bloodline.powers)html+=`<details><summary>${esc(text.split(':')[0])}</summary><p>${esc(text)}</p></details>`;
 }return html;
}
