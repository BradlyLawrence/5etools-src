import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,materialize,calculate} from './character.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
import {PALADIN_ARCHETYPES,setArchetype,conflicts,paladinProgression,validateArchetypes} from './engine/archetypes.mjs';
import {paladinSummary,paladinEffects,paladinHasChannel} from './engine/paladin-archetypes.mjs';
import {abilitySlots} from './engine/selectable-abilities.mjs';
import {dependentSpecs} from './engine/core-options.mjs';
import {featSlots} from './engine/feat-progression.mjs';
import {spellcasting,spellById} from './engine/spellcasting.mjs';
import {renderArchetypes} from './archetypes-ui.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {paladinCovenant,paladinCovenantMountResistance,COVENANT_ENERGIES} from './engine/paladin-archetypes.mjs';
import {optionDefenses} from './engine/core-options.mjs';
import {renderPaladinSummary} from './paladin-ui.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const make=(n=20,...ids)=>{const c=newCharacter();c.builder.classOrder=Array(n).fill('paladin');c.builder.targetLevel=n;c.builder.classOptions={};for(const id of ids)setArchetype(c,id,true);return c;};
const covenantId='oath-of-the-draconic-covenant';
test('Covenant energy choices, all resistance boundaries and actual paladin level',()=>{
 for(const energy of COVENANT_ENERGIES)for(const [n,resistance,radius] of [[1,0,0],[2,0,0],[3,5,0],[7,5,0],[8,10,10],[13,10,10],[14,20,20],[19,20,20],[20,30,30]]){
  const c=make(n,covenantId);c.builder.classOptions['paladin-covenant-energy']=energy;const x=materialize(c),v=paladinCovenant(x);
  assert.equal(v.resistance,resistance);assert.equal(v.radius,radius);assert.equal(v.layOnHandsCost,1);assert.equal(v.durationRounds,10);
  assert.equal(optionDefenses(x).resistances[energy]??0,resistance);
  assert.deepEqual(dependentSpecs(x).find(s=>s.id==='paladin-covenant-energy').options.map(o=>o.id),COVENANT_ENERGIES);
 }
 const c=make(2,covenantId);c.builder.classOrder.push('fighter');c.builder.classOptions['paladin-covenant-energy']='fire';assert.equal(paladinCovenant(materialize(c)).resistance,0);
 for(const energy of [undefined,'sonic']){c.builder.classOptions['paladin-covenant-energy']=energy;assert.equal(paladinCovenant(materialize(c)).energy,null);assert.equal(paladinCovenant(materialize(c)).resistance,0);}
});
test('Covenant reserves Resolve, progresses at 3/8/14/20 and coexists with Shining Knight',()=>{
 const c=make(1,covenantId,'shining-knight');for(const id of ['oath-of-community','oath-of-chastity','oath-against-fiends','oath-against-undeath'])assert.ok(conflicts(c,id).length);
 const rows=paladinProgression(c);assert.ok(rows.every(r=>r.features.every(f=>f.id!=='aura-of-resolve')));
 for(const [level,id] of [[3,'scales-of-the-covenant'],[8,'under-our-protection'],[14,'sheltering-wings'],[20,'enduring-covenant']])assert.ok(rows.find(r=>r.level===level).features.some(f=>f.id===id));
 assert.ok(!paladinSummary(materialize(make(8,covenantId))).immunities.includes('charm'));
});
test('Shining Knight and Muralis retain approved mount and equipment behavior with Covenant',()=>{
 const c=make(5,'shining-knight',covenantId);c.builder.classOptions['paladin-mount']='muralis';c.builder.classOptions['paladin-covenant-energy']='fire';
 const baseline=paladinSummary(materialize(make(5,'shining-knight')));
 const p=paladinSummary(materialize(c));assert.equal(p.mount.effectiveDruidLevel,5);assert.equal(p.mount.summons,1);assert.ok(p.mount.level5Example);assert.equal(p.layOnHands.uses,baseline.layOnHands.uses);
 assert.deepEqual(paladinCovenantMountResistance(materialize(c),{living:true,ridden:true}),{energy:'fire',value:5});
 for(const flags of [{},{living:true},{ridden:true}])assert.equal(paladinCovenantMountResistance(materialize(c),flags),null);
 for(const armor of ['reinforced-work-harness','full-plate-bulwark']){equip(c,rules,'armorId',armor);const before=JSON.stringify(c),s=equipmentSheet(c,rules);assert.equal(s.defenses.resistances.fire,5);assert.ok(s.equipment.energyResistance.fire>=5);assert.equal(JSON.stringify(c),before);assert.ok(s.stats['skill.ride'].breakdown.some(x=>x.name==='Skilled rider'));}
 assert.match(renderPaladinSummary(p),/living mount while you ride/);assert.match(renderPaladinSummary(p),/519 lb/);
});
test('Covenant persistence, removal and highest resistance including immunity',()=>{
 const c=make(14,covenantId);c.builder.classOptions['paladin-covenant-energy']='fire';const loaded=parseCharacter(exportCharacter(c));assert.equal(paladinCovenant(materialize(loaded)).resistance,20);
 const x=materialize(c);x.classes.sorcerer=20;x.builder.classOptions['sorcerer-bloodline']='elemental';x.builder.classOptions['bloodline-element']='fire';assert.equal(optionDefenses(x).resistances.fire,'immune');
 x.classes.sorcerer=9;assert.equal(optionDefenses(x).resistances.fire,20);
 x.classes.paladin=3;assert.equal(optionDefenses(x).resistances.fire,20);
 setArchetype(loaded,covenantId,false);assert.equal(paladinCovenant(materialize(loaded)),null);assert.ok(!dependentSpecs(materialize(loaded)).some(s=>s.id==='paladin-covenant-energy'));
 c.builder.classOrder=['fighter'];assert.equal(paladinCovenant(materialize(c)),null);
});
test('all 21 selections: every pair uses exact replacement slots, including future slots and imports',()=>{
 assert.equal(PALADIN_ARCHETYPES.length,21);
 for(const a of PALADIN_ARCHETYPES)for(const b of PALADIN_ARCHETYPES.filter(x=>x.id>a.id)){
  const c=make(1,a.id),overlap=[...a.replacements,...a.alterations].some(x=>[...b.replacements,...b.alterations].includes(x));
  assert.equal(conflicts(c,b.id).length>0,overlap,a.id+' / '+b.id);
  if(overlap){assert.throws(()=>setArchetype(c,b.id,true));c.builder.archetypes.paladin.push(b.id);assert.throws(()=>validateArchetypes(c));}
  else{setArchetype(c,b.id,true);validateArchetypes(c);const occupied=new Set([...a.replacements,...a.alterations,...b.replacements,...b.alterations]);for(const row of paladinProgression(c))assert.ok(row.features.every(f=>f.origin!=='Paladin'||!occupied.has(f.id)));}
 }
});
test('selector lockouts, progression, persistence, removal and unknown imports',()=>{
 const c=make(5,'shining-knight','oath-of-intercession');const html=renderArchetypes(c);
 assert.match(html,/archetype.oath-of-liberation"\s+disabled/);assert.match(html,/data-class-progression="paladin"/);assert.doesNotMatch(html,/Paladin archetypes: not available/);
 const loaded=parseCharacter(exportCharacter(c));assert.deepEqual(loaded.builder.archetypes,c.builder.archetypes);
 setArchetype(loaded,'shining-knight',false);setArchetype(loaded,'oath-of-liberation',true);
 loaded.builder.archetypes.paladin.push('holy-gun');assert.throws(()=>validateArchetypes(loaded));
});
test('mercy suppression and Holy Guide optional choices and teamwork feat',()=>{
 const c=make(18,'oath-of-mercy');assert.equal(abilitySlots(materialize(c)).filter(x=>x.classId==='paladin').length,0);
 setArchetype(c,'oath-of-mercy',false);setArchetype(c,'holy-guide',true);
 assert.deepEqual(abilitySlots(materialize(c)).filter(x=>x.classId==='paladin').map(x=>x.level),[9,12,15,18]);
 c.builder.classOptions['paladin-exchange-mercy-9']='terrain';assert.ok(conflicts(c,'oath-against-fiends').length);
 assert.equal(abilitySlots(materialize(c)).filter(x=>x.classId==='paladin').length,3);
 assert.ok(featSlots(c).some(x=>x.id==='paladin-bonus-6'&&x.category==='teamwork'));
});
test('Holy Light removes only paladin casting and grants extra healing uses; published spell IDs resolve',()=>{
 const c=make(12,'warrior-of-the-holy-light','oath-of-chastity');assert.ok(!spellcasting(c,calculate(c)).some(x=>x.id==='paladin'));assert.equal(materialize(c).casterLevel,0);
 assert.equal(paladinSummary({...materialize(c),abilities:{cha:18}}).layOnHands.uses,13);
 c.builder.classOrder.push('cleric');assert.ok(spellcasting(c,calculate(c)).some(x=>x.id==='cleric'));
 for(const p of PALADIN_ARCHETYPES)for(const id of Object.values(p.oathSpells??{}))assert.ok(spellById(id),'missing '+id);
});
test('Hospitaler and custom oath level boundaries use paladin levels and independent resources',()=>{
 const c=make(5,'hospitaler');const s=paladinSummary(materialize(c));assert.equal(s.smiteUses,1);assert.equal(s.channel.dice,'1d6');assert.equal(s.channel.layOnHandsCost,0);
 for(const [n,portions] of [[3,null],[4,2],[9,4],[10,5],[16,8],[20,10]]){const x=materialize(make(n,'oath-of-hospitality'));assert.equal(paladinSummary(x).hospitality?.portions??null,portions);assert.equal(paladinHasChannel(x),false);}
 const mercy=paladinSummary(materialize(make(12,'oath-of-mercy'))).mercy;assert.equal(mercy.dice,'6d4');assert.equal(mercy.conditionLimit,1);assert.ok(mercy.conditions.includes('stunned'));assert.ok(!mercy.conditions.includes('panicked'));
});
test('mount is forced, Muralis is selectable, displaced bond choices dormant; class removal disables effects',()=>{
 const c=make(5,'shining-knight');c.builder.classOptions['paladin-bond']='weapon';const x=materialize(c);assert.ok(!dependentSpecs(x).some(s=>s.id==='paladin-bond'));assert.ok(dependentSpecs(x).find(s=>s.id==='paladin-mount').options.some(x=>x.id==='muralis'));
 c.builder.classOptions['paladin-mount']='muralis';assert.equal(paladinSummary(materialize(c)).mount.effectiveDruidLevel,5);
 c.builder.classOrder=['fighter'];assert.equal(paladinSummary(materialize(c)),null);assert.deepEqual(paladinEffects(materialize(c)),[]);
});
test('personal saves and armour-only Ride waiver; summaries reach actual equipment sheet',()=>{
 const c=materialize(make(5,'shining-knight'));c.abilities.cha=18;
 const e=paladinEffects(c,{armor:{defense:{armorCheckPenalty:-5}},shield:{defense:{armorCheckPenalty:-2}}});assert.equal(e.find(x=>x.target==='skill.ride').value,5);assert.equal(e.filter(x=>x.target.startsWith('save.')).length,3);
 assert.equal(equipmentSheet(make(10,'oath-of-hospitality'),rules).paladin.hospitality.portions,5);
});
test('legacy smite toggle cannot survive Loyalty and Hospitaler counter follows its reduced progression',()=>{
 const c=make(10,'oath-of-loyalty');c.ruleState={choices:{},spent:{},conditions:{},toggles:{'paladin.smite-evil':true}};
 const s=equipmentSheet(c,rules);assert.ok(!s.abilities.resources['paladin.smite-evil.uses']);assert.ok(!s.sheetRows.some(r=>/smitten|Smite:/.test(r.label)));
 setArchetype(c,'oath-of-loyalty',false);setArchetype(c,'hospitaler',true);assert.equal(equipmentSheet(c,rules).abilities.resources['paladin.smite-evil.uses'].maximum,2);
});
test('published oath preparations appear at their oath level, disappear on removal and stay dormant for Holy Light',()=>{
 const c=make(14,'oath-of-vengeance');const rows=spellcasting(c,calculate(c)).find(x=>x.id==='paladin').rows;
 assert.ok(rows.find(x=>x.level===3).available.includes('blessing-of-fervor'));
 setArchetype(c,'oath-of-vengeance',false);assert.ok(!spellcasting(c,calculate(c)).find(x=>x.id==='paladin').rows.find(x=>x.level===3).available.includes('blessing-of-fervor'));
});
test('ordinary and technological weapons and campaign bows evaluate without granting proficiency or mutating the character',()=>{
 const weapons=rules.equipment.items.filter(x=>x.kind==='weapon'&&(x.bow||/vibro|longsword/.test(x.id)));
 assert.ok(weapons.length>=5);
 for(const archetype of ['shining-knight','hospitaler','divine-defender','holy-guide','warrior-of-the-holy-light'])for(const weapon of weapons){
  const c=make(12,archetype,'oath-of-intercession');equip(c,rules,'weaponId',weapon.id);const before=JSON.stringify(c),s=equipmentSheet(c,rules);assert.equal(JSON.stringify(c),before);assert.ok(Number.isFinite(s.stats.ac.total));assert.equal(s.paladin.level,12);
  if(weapon.bow?.mountedUse===false)assert.equal(s.equipment.bow.mountedUse,false);
 }
});
test('tech armour and shields retain penalties, reservoirs and equipment state with Skilled Rider and Pure of Body',()=>{
 for(const armor of ['reinforced-work-harness','riveted-strider-suit','half-plate-bulwark','full-plate-bulwark']){
  const c=make(12,'shining-knight');equip(c,rules,'armorId',armor);const shield=rules.equipment.items.find(x=>x.kind==='shield'&&x.tech);if(shield)equip(c,rules,'shieldId',shield.id);
  const before=JSON.stringify(c),s=equipmentSheet(c,rules);assert.equal(JSON.stringify(c),before);assert.ok(s.stats['skill.ride'].breakdown.some(x=>x.name==='Skilled rider'));
  setArchetype(c,'oath-of-chastity',true);assert.ok(equipmentSheet(c,rules).equipment.fortificationPercent>=50);
 }
});
