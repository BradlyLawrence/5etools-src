import {choicePicker} from './choice-picker.mjs';
import {martialIssues} from './engine/martial-options.mjs';
import {dependentSpecs} from './engine/core-options.mjs';
import {calculate} from './character.mjs';
import {sheetCharacter,techEvent} from './equipment.mjs';
import {applyAbilityEvent} from './engine/homebrew.mjs';
import {FIREARM_FAMILIES,gunslingerProgression} from './engine/gunslinger.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=v=>v.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
export function classChoices(c,rules){
 const {classes,abilities}=calculate(c);
 return rules.abilities.rules.filter(r=>r.acquisition.kind==='class'&&(classes[r.acquisition.classId]??0)>=r.acquisition.level).flatMap(r=>r.choices.map(choice=>({...choice,classId:r.acquisition.classId})));
}
export function setClassChoice(c,rules,id,value){
 const {classes,abilities}=calculate(c);
 const spec=dependentSpecs({...c,classes,abilities}).find(x=>x.id===id);
 if(spec){if(!spec.options.some(x=>x.id===value))throw Error('Choose an available option.');const b={...c.builder.classOptions,[id]:value};if(id.startsWith('cleric-domain-')&&b['cleric-domain-1']===b['cleric-domain-2'])throw Error('Choose two different domains.');if(id.startsWith('wizard-opposition-')&&b['wizard-opposition-1']===b['wizard-opposition-2'])throw Error('Choose different opposition schools.');const issues=martialIssues({...c,classes,builder:{...c.builder,classOptions:b}});if(issues.length)throw Error(issues[0]);c.builder.classOptions=b;return;}
 if(id==='ironwright-family'){
  if(!classes.ironwright)throw Error('Ironwright levels are required.');
  techEvent(c,rules,{type:'specialization',family:value});return;
 }
 if(id==='deity-weapon'){
  if(!classes.paladin||!rules.equipment.items.some(i=>i.id===value&&i.kind==='weapon'))throw Error('Choose a valid deity weapon.');
  c.deity={...c.deity,favoredWeaponId:value};return;
 }
 if(id==='gunslinger-primary'||id==='gunslinger-secondary'){
  if(!classes.gunslinger||!FIREARM_FAMILIES.includes(value))throw Error('Choose a firearm family.');
  const choices={...c.builder.gunslinger};
  if(id==='gunslinger-primary'){choices.primary=value;if(choices.secondary===value)delete choices.secondary;}
  else {if(classes.gunslinger<7||!choices.primary||choices.primary===value)throw Error('At level 7 choose a different secondary family.');choices.secondary=value;}
  c.builder.gunslinger=choices;return;
 }
 const choice=classChoices(c,rules).find(x=>x.id===id);
 if(!choice||!choice.options.includes(value))throw Error('This class choice is not available.');
 c.ruleState=applyAbilityEvent(rules,sheetCharacter(c),{type:'choose',choiceId:id,option:value}).ruleState;
}
export function gunslingerSummary(c){
 const r=calculate(c),choice=c.builder.gunslinger;
 if(!r.classes.gunslinger||!choice?.primary)return null;
 return gunslingerProgression(r.classes.gunslinger,r.abilities.wis,choice.primary,r.classes.gunslinger>=7?choice.secondary??null:null);
}
export function toggleClassEffect(c,rules,ruleId,enabled){
 const r=rules.abilities.rules.find(x=>x.id===ruleId&&x.acquisition.kind==='class');
 if(!r)throw Error('Unknown class effect.');
 c.ruleState=applyAbilityEvent(rules,sheetCharacter(c),{type:'toggle',ruleId,enabled}).ruleState;
}
export function renderClassSheet(sheet,rules){
 let html='<h3>Class effects</h3>';
 html+=renderAbilitySummary(sheet);
 for(const [energy,value] of Object.entries(sheet.defenses?.resistances??{}))html+=`<p>${esc(name(energy))}: ${value==='immune'?'immune':'resistance '+value}.</p>`;
 for(const rule of sheet.abilities?.rules??[]){if(!rule.owned||!rule.toggle||!rules.abilities.rules.some(x=>x.id===rule.id&&x.acquisition.kind==='class'))continue;
 html+=`<label style="display:flex;align-items:center"><input type="checkbox" data-field="classEffect.${esc(rule.id)}" ${rule.enabled?'checked':''}> ${esc(rule.name)}</label>`;}
 for(const row of sheet.sheetRows??[]){
 html+=`<p>${esc(row.label)}: attack ${row.stats.attack.total>=0?'+':''}${row.stats.attack.total}, damage modifier ${row.stats.damage.total>=0?'+':''}${row.stats.damage.total}, AC ${row.stats.ac.total}.</p>`;
 if(row.id!=='normal'){
 const affected=Object.entries(row.stats).filter(([id,stat])=>(id==='initiative'||id.startsWith('skill.'))&&stat.total!==sheet.stats[id]?.total);
 html+=`<details><summary>Conditional skills and initiative</summary>${affected.map(([id,stat])=>`<p>${esc(name(id.replace('skill.','')))}: ${stat.total>=0?'+':''}${stat.total}</p>`).join('')}</details>`;
 }
 }

 return html;
}
export function renderClassChoices(c,rules){
 if(!rules)return '';
 const r=calculate(c);let html='<h3>Class choices</h3>';
 function select(label,id,values,selected){html+=choicePicker({label,value:selected,name:values.find(x=>x[0]===selected)?.[1],field:'classChoice.'+id,placeholder:'Choose an option',groups:[{items:values.map(([id,name,description])=>({id,name,description}))}]});}
 for(const choice of classChoices(c,rules))select(choice.label,choice.id,choice.options.map(v=>[v,name(v)]),c.ruleState?.choices?.[choice.id]);
 if(r.classes.cleric)html+='<p>Choose the channel energy type allowed by your alignment and deity. Choose domains allowed by your deity or faith.</p>';
 if(r.classes.cavalier)html+='<p>Your order is saved. The Order of the Sword challenge interaction is calculated; other order abilities are reference-only.</p>';
 if(r.classes.paladin)select('Deity’s favoured weapon','deity-weapon',rules.equipment.items.filter(i=>i.kind==='weapon').map(i=>[i.id,i.name,i.description]),c.deity?.favoredWeaponId);
 if(r.classes.ironwright){select('Ironwright specialisation','ironwright-family',[['armour','Armour and shields','Improved powered abilities for all technological armour and shields.'],...rules.technology.families.filter(f=>!f.id.includes('armour')&&!f.id.includes('shield')).map(f=>[f.id,f.name??name(f.id),f.actions.map(a=>a.name+": "+a.description).join(" ")])],c.techEquipment?.specialization);html+='<p>The selected family gains its Ironwright powered-action benefits. Tech Armour Training reduces tech armour check penalties and increases maximum Dexterity by 1 at level 3, then by another 1 at levels 7, 11 and 15.</p>';}
 if(r.classes.gunslinger){select('Primary firearm family','gunslinger-primary',FIREARM_FAMILIES.map(v=>[v,name(v)]),c.builder.gunslinger?.primary);if(r.classes.gunslinger>=7)select('Secondary firearm family','gunslinger-secondary',FIREARM_FAMILIES.filter(v=>v!==c.builder.gunslinger?.primary).map(v=>[v,name(v)]),c.builder.gunslinger?.secondary);const s=gunslingerSummary(c);if(s)html+=`<p>Grit maximum: ${s.gritMaximum}. Primary family: ${name(s.primary)}${s.secondary?'; secondary: '+name(s.secondary):''}. Family choices and grit are recorded; firearm attack and technique automation remains pending.</p>`;}
 html+=renderCoreChoices(c,r);
 for(const id of Object.keys(r.classes).filter(id=>!['cleric','cavalier','paladin','ironwright','gunslinger','wizard','sorcerer','druid','ranger','inquisitor','fighter','rogue','barbarian','alchemist'].includes(id)))html+=`<p>${name(id)}: use the class rules below for choices not yet implemented.</p>`;
 return html;
}

function renderCoreChoices(c,r){
 const b=c.builder.classOptions??{};
 let html='<p>Selected powers and spell lists appear below and on Review. Weapon training, favoured enemy and terrain bonuses, Travel, Protection, Forewarned, Enchanting Smile, bloodline class skills, draconic armour, energy resistances, Protective Ward and the listed familiar bonuses are calculated. Other powers and companion statistics remain rules references.</p>';
 for(const spec of dependentSpecs({...c,classes:r.classes,abilities:r.abilities})){
 const selected=spec.options.find(x=>x.id===b[spec.id]);
 html+=choicePicker({label:spec.label,value:b[spec.id],name:selected?.name,field:'classChoice.'+spec.id,placeholder:'Choose an option',groups:[{items:spec.options.map(x=>({id:x.id,name:name(x.name),description:(x.text||x.description||'').replace(/\bhe\b/g,'she').replace(/\bhis\b/g,'her').replace(/\bhim\b/g,'her')}))}]});
 if(selected?.text)html+=`<details><summary>${esc(selected.name)} rules</summary><div style="white-space:pre-line">${esc(selected.text.replace(/\bhe\b/g,'she').replace(/\bhis\b/g,'her').replace(/\bhim\b/g,'her'))}</div></details>`;
 if(selected&&/-(companion|mount)$/.test(spec.id)){const cls=spec.id.split('-')[0],level=r.classes[cls]-(cls==='ranger'||spec.id.includes('-domain-')?3:0);html+=`<p>Effective druid level: ${level}. Companion statistics and advancement are shown as rules references; a separate companion sheet is not yet calculated.</p>`;}
 }
 if(r.classes.inquisitor)html+='<p>Your domain grants its powers, but no domain spell slots or bonus spells.</p>';
 if(r.classes.wizard&&b['wizard-bond']==='familiar')html+='<p>Familiar skill, save and hit point bonuses apply while your familiar is within 1 mile. Situational vision bonuses are resolved at the table.</p>';
 return html;
}

export function renderClassSelections(c){
 const r=calculate(c),b=c.builder.classOptions??{};
 return '<h3>Class selections</h3>'+dependentSpecs({...c,classes:r.classes,abilities:r.abilities}).map(spec=>{const chosen=spec.options.find(x=>x.id===b[spec.id]);return chosen?`<p><strong>${esc(spec.label)}:</strong> ${esc(chosen.name)}</p>${chosen.text?`<details><summary>Rules</summary><div style="white-space:pre-line">${esc(chosen.text.replace(/\bhe\b/g,'she').replace(/\bhis\b/g,'her').replace(/\bhim\b/g,'her'))}</div></details>`:''}`:'';}).join('');
}

function renderAbilitySummary(sheet){
 const s=sheet.classAbilities;if(!s)return '';
 let html='<p>'+Object.entries(s.abilities).map(([id,value])=>`${id.toUpperCase()} ${value}`).join(' · ')+'</p>';
 if(s.layOnHands){html+=`<p><strong>Lay on hands:</strong> heals ${s.layOnHands.dice}.</p>`;for(const m of s.layOnHands.mercies)html+=`<p><strong>${esc(m.name)} mercy:</strong> ${esc(m.text)} (Paladin caster level ${s.layOnHands.casterLevel}.)</p>`;}
 if(s.bombs)html+=`<p><strong>Bomb:</strong> ${s.bombs.damage} ${s.bombs.bonus>=0?'+':''}${s.bombs.bonus} ${esc(s.bombs.energy)} damage; splash ${s.bombs.splash}; discovery save DC ${s.bombs.dc}.${s.bombs.excludedSquares?' Precise bombs: exclude up to '+s.bombs.excludedSquares+' squares on a direct hit.':''}</p>`;
 if(s.bombs?.text)html+=`<p>${esc(s.bombs.text)}</p>`;
 for(const attack of s.naturalAttacks??[])html+=`<p>${esc(attack.name)}: attack ${attack.attack>=0?'+':''}${attack.attack}; damage ${attack.dice} ${attack.damageBonus>=0?'+':''}${attack.damageBonus}. Natural attacks require the appropriate free limbs; when combined with manufactured weapons, resolve secondary attacks at the table.</p>`;
 if(s.masteredSkills?.length)html+=`<p>Skill mastery (take 10 under stress): ${s.masteredSkills.map(x=>esc(name(x))).join(', ')}.</p>`;
 for(const m of s.magic??[])html+=`<p>${esc(m.name)}: ${esc(m.spell)}; caster level ${m.casterLevel}, save DC ${m.dc}, ${m.uses} uses/day.</p>`;
 if(s.resiliency)html+=`<p>Resiliency: ${s.resiliency} temporary hit points when activated; once per day, lasts 1 minute.</p>`;
 if(s.damageReduction)html+=`<p>Damage reduction while raging: ${s.damageReduction}/—.</p>`;
 if(s.fastHealing)html+=`<p>Fast healing ${s.fastHealing}.</p>`;
 for(const a of s.chosen)html+=`<details><summary>${esc(a.name)}</summary><p>${esc(a.text)}</p></details>`;
 return html;
}
