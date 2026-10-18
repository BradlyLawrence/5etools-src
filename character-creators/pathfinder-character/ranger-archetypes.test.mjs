import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate,materialize} from './character.mjs';
import {equip,equipmentSheet} from './equipment.mjs';
import {setArchetype,validateArchetypes,rangerProgression} from './engine/archetypes.mjs';
import {rangerSpecs,rangerSummary} from './engine/ranger-archetypes.mjs';
import {dependentSpecs} from './engine/core-options.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
import {renderArchetypes} from './archetypes-ui.mjs';
import {setClassChoice,renderClassSheet} from './class-choices.mjs';
import {calculateSkills} from './skills.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('rules.json',import.meta.url),'utf8'));
const make=(n,...ids)=>{const c=newCharacter();c.builder.targetLevel=n;c.builder.classOrder=Array(n).fill('ranger');for(const id of ids)setArchetype(c,id,true);return c;};
const sheet=c=>equipmentSheet(c,rules),row=(s,id)=>s.sheetRows.find(r=>r.id.includes(id));
test('ranger selector reserves future slots and merges progression independently of other classes',()=>{
 const c=make(1,'guide','urban-ranger','skirmisher');validateArchetypes(c);
 assert.throws(()=>setArchetype(c,'trapper',true),/conflicts/);assert.throws(()=>setArchetype(c,'deep-walker',true),/conflicts/);
 setArchetype(c,'weapon-master',true);assert.deepEqual(c.builder.archetypes.fighter,['weapon-master']);
 const html=renderArchetypes(c);assert.match(html,/Ranger archetypes/);assert.match(html,/<\/details><h3>Ranger progression/);assert.match(html,/data-field="archetype.trapper"\s+disabled/);
 const p=rangerProgression(c);assert.equal(p.length,20);assert.ok(p[16].features.some(f=>f.id==='invisibility-trick'));
 assert.ok(!p.flatMap(r=>r.features).some(f=>['favored-enemy','favored-terrain','hunters-bond','spells','endurance'].includes(f.id)));
 assert.ok(p[19].features.some(f=>f.id==='master-hunter'));assert.ok(p[1].features.some(f=>f.id==='combat-style'));
});
test('Guide focus applies to all campaign bows and tech weapons without granting proficiency or changing dice',()=>{
 for(const id of ['hunting-bow','war-bow','long-bow','steppe-bow','steam-axe','vibro-dagger']){
  const c=make(10,'guide');equip(c,rules,'weaponId',id);const s=sheet(c),f=row(s,'ranger-focus');
  assert.equal(f.stats.attack.total-s.stats.attack.total,6,id);assert.equal(f.stats.damage.total-s.stats.damage.total,6,id);
  assert.equal(s.ranger.focus.uses,4);assert.equal(s.equipment.proficient,!['steppe-bow','steam-axe','vibro-dagger'].includes(id));
  const b=make(10);equip(b,rules,'weaponId',id);assert.deepEqual(s.equipment.damageDice,sheet(b).equipment.damageDice);
 }
});
test('replaced ranger choices and stored spells cannot remain active; other casting survives',()=>{
 const c=make(17,'guide','urban-ranger','skirmisher');c.builder.classOptions={'ranger-bond':'companion','ranger-companion':'wolf','ranger-enemy-1':'undead','ranger-terrain-3':'forest'};
 const m=materialize(c),specs=dependentSpecs(m);assert.ok(!specs.some(s=>s.id==='ranger-bond'||s.id==='ranger-companion'||s.id.startsWith('ranger-enemy')||s.id.startsWith('ranger-terrain')));
 assert.equal(spellcasting(c,calculate(c)).length,0);assert.equal(m.casterLevel,0);assert.ok(sheet(c).ranger.invisibility);
 c.builder.classOrder.push('wizard');c.builder.targetLevel=18;assert.ok(spellcasting(c,calculate(c)).some(s=>s.id==='wizard'));
 assert.ok(!sheet(c).feats.some(f=>f.featId==='endurance'&&f.active));
});
test('Urban community names, boosts, skill swaps and trapfinding survive save/reload',()=>{
 const c=make(8,'urban-ranger');setClassChoice(c,rules,'ranger-community-3','Forge Town');setClassChoice(c,rules,'ranger-community-8','Harbour');setClassChoice(c,rules,'ranger-community-boost-8','ranger-community-3');
 assert.throws(()=>setClassChoice(c,rules,'ranger-community-8','forge town'),/different/);
 c.builder.skills={'disable-device':{normal:2,background:0},'knowledge-local':{normal:2,background:0},'knowledge-nature':{normal:2,background:0}};
 const s=sheet(c);assert.deepEqual(s.ranger.communities.map(x=>x.bonus),[4,2]);assert.equal(row(s,'ranger-community-3').stats.initiative.total-s.stats.initiative.total,4);
 const skills=calculateSkills(c,calculate(c));assert.equal(skills.rows.find(x=>x.id==='knowledge-nature').classSkill,false);assert.equal(skills.rows.find(x=>x.id==='knowledge-local').classSkill,true);
 assert.equal(skills.rows.find(x=>x.id==='disable-device').total,s.stats['skill.disable-device'].total);
 assert.deepEqual(sheet(parseCharacter(exportCharacter(c))).ranger.communities,s.ranger.communities);
 c.builder.classOrder.push('druid');c.builder.targetLevel=9;assert.equal(calculateSkills(c,calculate(c)).rows.find(x=>x.id==='knowledge-nature').classSkill,true);
});
test('Deep Walker and Inspired Moment apply conditional bonuses while Terrain Bond remains ally-only',()=>{
 const c=make(18,'guide','deep-walker');equip(c,rules,'armorId','full-plate');const s=sheet(c),u=row(s,'ranger-underground'),rock=row(s,'ranger-rock-hopper'),i=row(s,'ranger-inspired');
 assert.equal(u.stats['skill.stealth'].total-s.stats['skill.stealth'].total,11);assert.equal(rock.stats['skill.climb'].total-s.stats['skill.climb'].total,5);
 assert.equal(i.stats.ac.total-s.stats.ac.total,4);assert.equal(i.stats['skill.diplomacy'].total-s.stats['skill.diplomacy'].total,4);
 assert.equal(i.stats['speed.bonus'].total-s.stats['speed.bonus'].total,10);assert.equal(s.ranger.terrainBond.bonus,2);
 assert.equal(s.ranger.evasion,false);assert.equal(s.ranger.improvedEvasion,false);
});
test('trick and trap slots unlock at ranger levels, disallow duplicates and ignore stale higher-level choices',()=>{
 const c=make(7,'skirmisher');setClassChoice(c,rules,'ranger-trick-5','second-chance-strike');assert.throws(()=>setClassChoice(c,rules,'ranger-trick-7','second-chance-strike'),/available/);
 setClassChoice(c,rules,'ranger-trick-7','defensive-bow-stance');equip(c,rules,'weaponId','vibro-dagger');let s=sheet(c);assert.equal(row(s,'ranger-second-chance').stats.attack.total-s.stats.attack.total,-5);
 c.builder.classOrder=Array(5).fill('ranger');c.builder.targetLevel=5;assert.equal(sheet(c).ranger.tricks.known.length,1);
 setArchetype(c,'skirmisher',false);setArchetype(c,'trapper',true);assert.throws(()=>setClassChoice(c,rules,'ranger-trap-5','snare-trap'),/available/);
 setClassChoice(c,rules,'ranger-trap-5','fire-trap');assert.deepEqual(sheet(c).ranger.traps.known.map(o=>o.id),['snare-trap','fire-trap']);
});
test('trap DC scales with total character level while uses, duration and Launch Trap require ranger levels',()=>{
 const c=make(5,'trapper');const a=sheet(c);c.builder.classOrder.push(...Array(5).fill('fighter'));c.builder.targetLevel=10;const b=sheet(c);
 assert.equal(b.ranger.traps.supernaturalDC-a.ranger.traps.supernaturalDC,3);assert.equal(b.ranger.traps.uses,a.ranger.traps.uses);assert.equal(b.ranger.traps.hours,5);assert.equal(b.ranger.traps.launch,false);
 assert.equal(b.ranger.traps.extraordinaryDC,b.ranger.traps.supernaturalDC-2);
 const high=make(10,'trapper');equip(high,rules,'weaponId','long-bow');const h=sheet(high);assert.equal(h.ranger.traps.launch,true);assert.equal(h.equipment.rangeIncrementFt,120);
 const html=renderClassSheet(h,rules);assert.match(html,/maximum 60 ft/);assert.match(html,/No firearm bullets/);
});
test('Hateful Attack reports doubled threat range without stacking Improved Critical or changing powered dice',()=>{
 const c=make(11,'guide','skirmisher');setClassChoice(c,rules,'ranger-trick-5','hateful-attack');equip(c,rules,'weaponId','long-bow');
 const base=sheet(c);assert.equal(base.ranger.hatefulCritical[0].threatMin,19);
 c.feats.push({featId:'improved-critical',weaponId:'long-bow'});const improved=sheet(c);
 assert.equal(improved.ranger.hatefulCritical[0].threatMin,19);assert.deepEqual(improved.equipment.damageDice,base.equipment.damageDice);
 equip(c,rules,'weaponId','vibro-dagger');const tech=sheet(c);assert.equal(tech.ranger.hatefulCritical[0].threatMin,21-(21-tech.equipment.critical[0].threatMin)*2);
});
