import {PURCHASED_MAGIC_EFFECTS} from './engine/purchased-effects.mjs';
import {equipmentSheet} from './equipment.mjs';
import {renderDefensiveTech,renderOverload} from './defensive-tech-ui.mjs';
import {ownedItemName} from './owned-item-properties.mjs';
import {reservoirMaximum} from './engine/technology.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attackText=s=>s.attackRoutine?.mode==='vital'?`Vital Strike attack ${signed(s.attackRoutine.main.attacks[0])}`:s.attackRoutine?`Full attack ${s.attackRoutine.main.attacks.map(signed).join('/')}`:`Attack ${signed(s.stats.attack.total)}`;
const signed=n=>(n>=0?'+':'')+n;
export function renderCombatEquipment(c,rules){
 const s=equipmentSheet(c,rules),e=s.equipment,selected=c.equipment??{},weapon=rules.equipment.items.find(x=>x.id===e.weaponId),instance=c.techEquipment?.items.find(x=>x.instanceId===c.techEquipment.selectedInstanceId);
 let html=`<section class="sheet-block"><h3>Attacks & combat actions</h3><h4>${esc(c.craftedItems?.find(i=>i.equipped&&i.design.slot==='weapon')?.design.name??ownedItemName(weapon,instance))}</h4><p>${attackText(s)} · Damage ${esc(e.damageDice?.join(' / '))} ${signed(s.stats.damage.total)}${s.attackRoutine?.mode==='vital'?' + '+esc(s.attackRoutine.main.extraDice.join(' / '))+' Vital Strike dice':''}${(e.elementalDamage??[]).map(d=>' + '+esc(d.dice)+' '+esc(d.type)+(d.requiresActivation?' (when activated)':'')).join('')} · ${esc(e.size)}${e.reachFt!==null?' · Reach '+e.reachFt+' ft.':''} · Critical ${esc(e.critical?.map(x=>(x.threatMin===20?'20':x.threatMin+'–20')+'/×'+x.multiplier).join(' / '))}</p>`;
 if(s.powerAttack?.furiousFocus&&s.attackRoutine?.mode!=='vital')html+=`<details><summary>Furious Focus details</summary><p>First attack ${signed(s.powerAttack.firstAttack)}; later attacks use ${signed(s.powerAttack.laterAttack)} before iterative penalties. Only the first attack each turn ignores Power Attack’s penalty. Extra attacks keep it; track the first attack manually.</p></details>`;
 if(s.attackRoutine?.off){const off=s.attackRoutine.off,h=c.equipment.offHand,owned=c.craftedItems?.find(i=>i.instanceId===h.key),model=rules.equipment.items.find(i=>i.id===h.itemId);html+=`<h4>Off hand: ${esc(owned?.design.name??model?.name??h.itemId)}</h4><p>Full attack ${off.attacks.map(signed).join('/')} · Damage ${esc(off.dice.join(' / '))} ${signed(off.damage)}${off.elemental.map(d=>' + '+esc(d.dice)+' '+esc(d.type)).join('')} · Critical ${esc(off.critical?.map(x=>(x.threatMin===20?'20':x.threatMin+'–20')+'/×'+x.multiplier).join(' / '))}</p>`;}
 if(s.attackRoutine?.rapidShot)html+='<p class="sheet-hint">Rapid Shot: extra attack and −2 on all full-attack rolls included. Reloading and ammunition must allow each shot.</p>';
 if(s.attackRoutine?.manyshot)html+='<p><strong>Manyshot: first attack fires 2 arrows with one roll.</strong> Use the listed damage for each arrow; later attacks fire 1 arrow each.</p><details><summary>Manyshot damage details</summary><p>Precision damage applies once. Only one arrow deals critical damage. Apply damage reduction and resistance separately to each arrow.</p></details>';
 if(s.attackRoutine?.extraAttack){const extra=s.attackRoutine.extraAttack;html+=`<p class="sheet-hint">${esc(extra.source)}: one extra ${extra.hand==='off'?'off-hand':'main-hand'} attack included.</p>${extra.eligible.length>1?`<label>Extra attack weapon<select data-field="equipment.extraAttackHand"><option value="main" ${extra.hand==='main'?'selected':''}>Main hand</option><option value="off" ${extra.hand==='off'?'selected':''}>Off hand</option></select></label>`:''}`;}
 if(e.enchantmentNotes?.length)html+=`<p>${e.enchantmentNotes.map(esc).join(' ')}</p>`;
 const owned=c.craftedItems?.find(i=>i.equipped&&i.design.slot==='weapon');if(owned?.design.magicEffect)html+=`<p>${esc(PURCHASED_MAGIC_EFFECTS[owned.design.magicEffect].manual?owned.design.description:owned.design.description.replace(' Resolve this effect at the table; see full effect rules.',''))} <a href="${esc(PURCHASED_MAGIC_EFFECTS[owned.design.magicEffect].source)}" target="_blank" rel="noopener">Full effect rules</a></p>`;
 if(e.rangeIncrementFt&&weapon.handling!=='ranged')html+=`<label class="combat-toggle"><input type="checkbox" data-field="equipment.thrown" ${selected.thrown?'checked':''}> Throw weapon</label>`;
 if(weapon?.handling==='one-handed')html+=`<label class="combat-toggle"><input type="checkbox" data-field="equipment.twoHanded" ${selected.damageMode==='two-handed'?'checked':''}> Wield in two hands</label>`;
 if(instance){
  const max=reservoirMaximum(weapon,instance);html+=`<p><strong>Reservoir ${instance.reservoir} / ${max}</strong></p><details><summary>Resource correction & attunement</summary><label>Remaining fuel<input type="number" min="0" max="${max}" data-field="tech.reservoir" value="${instance.reservoir}"></label><label class="combat-toggle"><input type="checkbox" data-field="tech.attuned" ${instance.attuned?'checked':''}> Attuned for overnight maintenance</label><p>Correcting fuel does not perform a rest or purchase supplies.</p></details>`;
  const family=rules.technology.families.find(f=>f.id===weapon.tech.family);
  for(const action of family?.actions??[]){
   let preview='',error=false;
   try{const powered=equipmentSheet(c,rules,action.id);preview=`<p>Attack ${signed(powered.stats.attack.total)} · Damage ${esc(powered.equipment.damageDice.join(' / '))} ${signed(powered.stats.damage.total)}${powered.equipment.extraDamageDice?' + '+esc(powered.equipment.extraDamageDice):''}</p>`;}catch(err){error=true;preview=`<p>${esc(err.message)}</p>`;}
   html+=`<div class="combat-resource-action"><div class="combat-action-heading"><h4>${esc(action.name)} · ${action.cost} reservoir</h4><button type="button" data-spend="${esc(action.id)}" aria-label="Use ${esc(action.name)}" ${error||(instance.reservoir<action.cost&&!instance.overloaded)||instance.mechanismBroken?'disabled':''}>${instance.overloaded?'Use with Overload':'Use'}</button></div><details data-sheet-disclosure="weapon-action-${esc(instance.instanceId)}-${esc(action.id)}"><summary>Effect details</summary><p>${esc(action.description)}</p>${preview}</details></div>`;
  }
 }
 html+=renderDefensiveTech(c,rules)+renderOverload(c,rules,false);
 return html+'</section>';
}
