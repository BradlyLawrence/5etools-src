import {choicePicker} from './choice-picker.mjs';
import {featSlots,slotAllows} from './engine/feat-progression.mjs';
import {replacedTrait} from './engine/racial.mjs';
import {equipmentSheet} from './equipment.mjs';
export const startingSlots=featSlots;
export function startingSheet(c,rules,level=1){
 const draft=structuredClone(c);draft.builder.classOrder=draft.builder.classOrder.slice(0,level);draft.builder.targetLevel=level;draft.builder.increases=draft.builder.increases.slice(0,Math.floor(level/4));
 for(const allocation of Object.values(draft.builder.skills??{})){allocation.normal=Math.min(level,allocation.normal);allocation.background=Math.min(level-allocation.normal,allocation.background);}
 draft.feats=draft.feats.filter(f=>f.creatorSlot&&startingSlots(draft).some(s=>s.id===f.creatorSlot));
 return equipmentSheet(draft,rules);
}
export function availableStartingFeats(c,rules,slotId,sheet=null){
 const slot=startingSlots(c).find(s=>s.id===slotId);if(!slot)return [];
 sheet??=startingSheet(c,rules,slot.level);
 const granted=new Set(sheet.feats.filter(f=>f.sources.some(s=>s.kind==='class-grant')).map(f=>f.featId));
 const chosen=new Set(c.feats.map(f=>f.featId));
 return rules.feats.filter(f=>slotAllows(slot,f)&&!granted.has(f.id)&&(!chosen.has(f.id)||f.repeatable===true)).filter(f=>{
  const checks=sheet.eligibility.find(e=>e.featId===f.id)?.prerequisites??[];
  if(!slot.waive&&checks.some(p=>!p.met&&!['weapon-choice','weapon-proficiency','sheet-choice'].includes(p.kind)&&!(p.kind==='feat'&&p.sameWeapon)))return false;
  const choices=Object.fromEntries(featChoices(rules,f.id).map(choice=>[choice.id,c.ruleState?.choices?.[choice.id]??choice.options.find(value=>!slot.skills||slot.skills.includes(value))??choice.options[0]]));
  const weapons=f.parameter==='weaponId'?rules.equipment.items.filter(i=>i.kind==='weapon').map(i=>i.id):[undefined];
  return weapons.some(weapon=>{try{selectStartingFeat(structuredClone(c),rules,slotId,f.id,weapon,choices);return true;}catch{return false;}});
 });
}
export const featChoices=(rules,id)=>id?rules.abilities.rules.filter(r=>r.acquisition.kind==='feat'&&r.acquisition.featId===id).flatMap(r=>r.choices??[]).filter(choice=>choice.creation!==false):[];
export function selectStartingFeat(c,rules,slotId,featId,weaponId,choices={}){
 const slot=startingSlots(c).find(s=>s.id===slotId);if(!slot)throw Error('This feat slot is not available.');
 const others=c.feats.filter(f=>f.creatorSlot!==slotId);
 if(!featId){c.feats=others;return;}
 const def=rules.feats.find(f=>f.id===featId&&f.selectable!==false);
 if(!slotAllows(slot,def))throw Error('Choose an eligible feat for this slot.');
 if(def.parameter==='weaponId'&&!weaponId)throw Error('Choose a weapon for this feat.');
 if(def.repeatability?.mode!=='stack'&&others.some(f=>f.featId===featId&&(f.weaponId??null)===(weaponId??null)))throw Error('This feat is already selected.');
 const candidate=structuredClone(c);candidate.feats=[...others,{featId,creatorSlot:slotId,...(weaponId?{weaponId}:{})}];
 // Resolve proficiency for the weapon being chosen, even when it is not equipped.
 if(weaponId){candidate.equipment={...candidate.equipment,weaponId};if(candidate.techEquipment)candidate.techEquipment.selectedInstanceId=null;}
 for(const choice of featChoices(rules,featId)){const value=choices[choice.id]??candidate.ruleState?.choices?.[choice.id];if(!choice.options.includes(value))throw Error('Choose '+choice.label+'.');candidate.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};candidate.ruleState.choices[choice.id]=value;}
 const eligibilityCandidate=structuredClone(candidate);if(slot.style)eligibilityCandidate.equipment={...eligibilityCandidate.equipment,armorId:null};
 const sheet=startingSheet(eligibilityCandidate,rules,slot.level),result=sheet.feats.find(f=>f.featId===featId&&(f.weaponId??null)===(weaponId??null));
 if(!result?.active)throw Error(`You do not meet this feat’s prerequisites at character level ${slot.level}.`);
 if(result.sources.some(s=>s.kind==='class-grant'))throw Error('Your class already grants this feat.');
 c.feats=candidate.feats;if(candidate.ruleState)c.ruleState=candidate.ruleState;
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderStartingFeats(c,rules,drafts={}){
 if(!rules)return '<h3>Feats</h3><p>Loading feat rules…</p>';
 if(!c.builder.classOrder[0])return '<h3>Feats</h3><p>Choose your first class to select feats.</p>';
 let html='<h3>Feats</h3><p>Choose the feats earned at each character or class level. Automatic class grants do not use these slots.</p>';
 try{
 const sheet=equipmentSheet(c,rules);
 for(const slot of startingSlots(c)){
  const selected=c.feats.find(f=>f.creatorSlot===slot.id),def=rules.feats.find(f=>f.id===(drafts[slot.id]??selected?.featId));
  html+=`<fieldset><legend>${slot.name}</legend><input type="hidden" id="feat-${slot.id}" value="${esc(def?.name??'')}">${choicePicker({label:'Feat',value:def?.id,name:def?.name,field:'feat.'+slot.id,placeholder:'Choose a feat',groups:[{items:availableStartingFeats(c,rules,slot.id).sort((a,b)=>a.name.localeCompare(b.name)).map(f=>({id:f.id,name:f.name,description:f.description}))}]})}${def?`<div class="feat-description" style="white-space:pre-line">${esc(def.description)}</div>`:''}${def?.parameter==='weaponId'?`<label>Weapon<select id="feat-weapon-${slot.id}"><option value="">Choose a weapon</option>${rules.equipment.items.filter(i=>i.kind==='weapon').map(i=>`<option value="${esc(i.id)}" ${i.id===selected?.weaponId?'selected':''}>${esc(i.name)}</option>`).join('')}</select></label>`:''}${featChoices(rules,def?.id).map(choice=>`<label>${esc(choice.label)}<select id="feat-choice-${slot.id}-${esc(choice.id)}"><option value="">Choose an option</option>${choice.options.map(value=>`<option value="${esc(value)}" ${c.ruleState?.choices?.[choice.id]===value?'selected':''}>${esc(value.replace(/-/g,' ').replace(/\b\w/g,x=>x.toUpperCase()))}</option>`).join('')}</select></label>`).join('')}<button type="button" data-save-feat="${slot.id}">Apply feat</button><button type="button" data-clear-feat="${slot.id}">Clear</button>`;
  html+='</fieldset>';
 }
 html+='<details><summary>Class-granted feats</summary><ul>'+sheet.feats.filter(f=>f.sources.some(s=>s.kind==='class-grant')).map(f=>`<li>${esc(f.name)}${f.active?'':' — needs a choice or prerequisite'}</li>`).join('')+'</ul></details>';
 const imported=c.feats.filter(f=>!f.creatorSlot);if(imported.length)html+='<p>Previously imported feats are preserved separately. They have not been assigned to starting slots.</p>';
 html+='<p>Prerequisites are checked at the level each slot is earned. Skill ranks are capped at that level; confirm when those ranks were gained. Ranger style feats apply only without heavy armour.</p>';
 }catch(e){html+=`<p>${esc(e.message)}</p>`;}
 return html;
}

export function renderFeatReview(c,rules){
 let html='<h3>Feats</h3><ul>';
 const slots=startingSlots(c);
 for(const slot of slots){
  const chosen=c.feats.find(f=>f.creatorSlot===slot.id);
  if(!chosen){html+=`<li>${esc(slot.name)}: choose a feat.</li>`;continue;}
  const def=rules.feats.find(f=>f.id===chosen.featId);
  let issue='';try{const copy=structuredClone(c);selectStartingFeat(copy,rules,slot.id,chosen.featId,chosen.weaponId);}catch(e){issue=e.message;}
  html+=`<li>${esc(slot.name)}: ${esc(def?.name??chosen.featId)}${chosen.weaponId?' ('+esc(chosen.weaponId)+')':''}${issue?' — '+esc(issue):''}${def?.description?`<details><summary>Rules</summary><p>${esc(def.description)}</p></details>`:''}</li>`;
 }
 for(const f of c.feats.filter(f=>f.creatorSlot&&!slots.some(s=>s.id===f.creatorSlot)))html+=`<li>${esc(f.featId)}: its feat slot is no longer available.</li>`;
 html+='</ul>';
 const maneuvers=['dirty-trick','drag','reposition','steal'];
 const sheet=equipmentSheet(c,rules);
 if(sheet.feats.some(f=>f.active&&maneuvers.some(m=>f.featId==='improved-'+m||f.featId==='greater-'+m))){
  html+='<h3>Combat maneuvers</h3><table><thead><tr><th>Maneuver</th><th>Check</th><th>Defense</th></tr></thead><tbody>'+maneuvers.map(m=>{const check=sheet.stats['maneuver.'+m+'.check'].total;return `<tr><th>${esc(m.replace(/-/g,' ').replace(/^./,s=>s.toUpperCase()))}</th><td>${check>=0?'+':''}${check}</td><td>${sheet.stats['maneuver.'+m+'.defense'].total}</td></tr>`;}).join('')+'</tbody></table>';
 }
 return html;
}
