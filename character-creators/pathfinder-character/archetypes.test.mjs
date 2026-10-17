import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,materialize} from './character.mjs';
import {equipmentSheet} from './equipment.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
import {FIGHTER_ARCHETYPES,setArchetype,conflicts,fighterProgression,validateArchetypes} from './engine/archetypes.mjs';
import {featSlots} from './engine/feat-progression.mjs';
import {martialSpecs} from './engine/martial-options.mjs';
import {renderArchetypes} from './archetypes-ui.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const make=(n=6)=>{const c=newCharacter();c.builder.classOrder=Array(n).fill('fighter');c.builder.targetLevel=n;return c;};
test('all active packs appear, future conflicts disable checkboxes and selected choices remain removable',()=>{
 const c=make(1);assert.equal(FIGHTER_ARCHETYPES.length,14);setArchetype(c,'tech-fighter',true);
 const html=renderArchetypes(c);assert.match(html,/data-field="archetype.tech-fighter" checked/);assert.match(html,/data-field="archetype.weapon-master"\s+disabled/);assert.doesNotMatch(html,/mutation-warrior/);
 assert.throws(()=>setArchetype(c,'weapon-master',true));setArchetype(c,'tech-fighter',false);setArchetype(c,'weapon-master',true);assert.equal(conflicts(c,'weapon-master').length,0);
});
test('every compatible pair composes its progression and every incompatible pair is rejected',()=>{
 for(const a of FIGHTER_ARCHETYPES)for(const b of FIGHTER_ARCHETYPES.filter(b=>b.id!==a.id)){const c=make();setArchetype(c,a.id,true);if(conflicts(c,b.id).length)assert.throws(()=>setArchetype(c,b.id,true));else{setArchetype(c,b.id,true);validateArchetypes(c);const rows=fighterProgression(c);assert.equal(rows.length,20);for(const p of [a,b])for(const f of p.features)assert.ok(rows[f.level-1].features.some(x=>x.origin===p.name&&x.id===f.id));}}
});
test('Tech Fighter replaces first fighter feat, preserves later slots and exposes its fixed feats and skills',()=>{
 const c=make();c.feats.push({featId:'improved-initiative',creatorSlot:'fighter-starting'});setArchetype(c,'tech-fighter',true);
 assert.ok(!featSlots(c).some(s=>s.id==='fighter-starting'));assert.ok(featSlots(c).some(s=>s.id==='fighter-bonus-2'));assert.ok(!materialize(c).feats.some(f=>f.featId==='improved-initiative'));
 const sheet=equipmentSheet(c,rules);for(const id of ['tech-melee-proficiency','craft-technological-equipment'])assert.ok(sheet.feats.some(f=>f.featId===id&&f.active),id);
 assert.ok(materialize(c).classSkills.includes('tech-use'));assert.ok(sheet.stats['skill.tech-use'].breakdown.some(e=>e.name==='Technical Handling'&&e.value===2));
 assert.ok(!martialSpecs(materialize(c)).some(s=>s.id==='fighter-training-5'));
 setArchetype(c,'tech-fighter',false);assert.ok(materialize(c).feats.some(f=>f.featId==='improved-initiative'));
});
test('replacement slots follow fighter level and suppress stale weapon training; save import validates conflicts',()=>{
 const c=make(9);c.builder.classOrder.unshift('rogue');c.builder.targetLevel=10;setArchetype(c,'weapon-master',true);c.builder.classOptions={'fighter-training-5':'heavy-blades'};
 assert.ok(!martialSpecs(materialize(c)).some(s=>s.id==='fighter-training-5'));const loaded=parseCharacter(exportCharacter(c));assert.deepEqual(loaded.builder.archetypes,c.builder.archetypes);
 loaded.builder.archetypes.fighter.push('tech-fighter');assert.throws(()=>validateArchetypes(loaded));assert.ok(fighterProgression(c)[2].features.some(f=>f.id==='weapon-training'&&f.origin==='Weapon Master'));
});

test('Tech Fighter uses its fixed technological group rather than a stale former group',()=>{
 const c=make(9);c.builder.classOptions={'fighter-training-5':'heavy-blades'};c.equipment={weaponId:'longsword'};
 const base=equipmentSheet(c,rules);setArchetype(c,'tech-fighter',true);const changed=equipmentSheet(c,rules);assert.equal(changed.stats.attack.total,base.stats.attack.total-2);
 c.equipment.weaponId='gyro-shortsword';const tech=equipmentSheet(c,rules);assert.ok(tech.equipment.proficient);assert.ok(tech.stats.attack.breakdown.some(e=>e.name==='Weapon training'&&e.value===2));
 c.builder.classOrder=['rogue'];assert.ok(!equipmentSheet(c,rules).feats.some(f=>f.featId==='tech-melee-proficiency'));
});
