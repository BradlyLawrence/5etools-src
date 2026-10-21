import {equipmentSheet} from './equipment.mjs';
import {combatBuffSpecs} from './combat-buffs.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>(n>=0?'+':'')+n;
const label=s=>s.replace(/^skill\./,'').replaceAll('.',' ').replaceAll('-',' ');
export function renderCombatPassives(input,rules){
 // Evaluate a separate, inactive copy: temporary effects must not become passive entries.
 const c=structuredClone(input);
 for(const b of [...c.buffs??[],...c.debuffs??[]])b.active=false;
 c.builder.classOptions??={};
 for(const spec of combatBuffSpecs(c))c.builder.classOptions[spec.id]='off';
 if(c.equipment)c.equipment.fightingDefensively=false;
 if(c.ruleState){for(const id of Object.keys(c.ruleState.toggles??{}))c.ruleState.toggles[id]=false;for(const id of Object.keys(c.ruleState.conditions??{}))c.ruleState.conditions[id]=false;}
 if(c.context?.featToggles)for(const id of Object.keys(c.context.featToggles))c.context.featToggles[id]=false;
 const sheet=equipmentSheet(c,rules),rows=new Set();
 const names=new Map(rules.feats.map(f=>[f.id,f.name]));
 for(const e of sheet.effects??[]){
  if(e.kind==='modifier'&&e.value&&e.target)rows.add(`${signed(e.value)} ${label(e.target)}${e.target.startsWith('attack.')||e.target.startsWith('damage.')?' with '+(rules.equipment.items.find(i=>i.id===sheet.equipment.weaponId)?.name??'equipped weapon'):''}${e.bonusType&&e.bonusType!=='untyped'?' ('+label(e.bonusType)+')':''} — ${e.name??names.get(e.featId)??label(e.featId??'Equipment')}`);
  if(e.kind==='manual'&&e.description)rows.add(e.description);
 }
 for(const note of sheet.abilities?.notes??[])rows.add(note.description);
 const level=c.builder.classOrder.filter(x=>x==='ironwright').length;
 if(level){const bonus=Math.max(0,...rules.technology.ironwright.workshopTraining.filter(r=>level>=r.minimumLevel).map(r=>r.bonus));rows.add(`+${bonus} competence to Craft checks to construct or repair technology — Workshop Training`);}
 return `<details class="sheet-block combat-passives" data-sheet-disclosure="passive-effects"><summary>Passive effects · ${rows.size}</summary><p class="sheet-hint">Permanent modifiers for current equipment and choices. Situational requirements still apply; temporary buffs and debuffs are listed in the sidebar.</p><ul>${[...rows].map(row=>`<li>${esc(row)}</li>`).join('')||'<li>No passive modifiers recorded.</li>'}</ul></details>`;
}
