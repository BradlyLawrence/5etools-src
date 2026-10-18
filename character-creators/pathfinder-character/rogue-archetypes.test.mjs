import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {equip,equipmentSheet} from './equipment.mjs';
import {calculateSkills} from './skills.mjs';
import {renderClassSheet} from './class-choices.mjs';
import {renderArchetypes} from './archetypes-ui.mjs';
import {setArchetype,validateArchetypes,rogueProgression} from './engine/archetypes.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('rules.json',import.meta.url),'utf8'));
function make(n,...ids){const c=newCharacter();c.builder.targetLevel=n;c.builder.classOrder=Array(n).fill('rogue');for(const id of ids)setArchetype(c,id,true);return c;}
const sheet=c=>equipmentSheet(c,rules);
const row=(s,id)=>s.sheetRows.find(r=>r.id.includes(id));

test('rogue display modules contain valid UTF-8',async()=>{
 for(const file of ['archetypes-ui.mjs','class-choices.mjs'])new TextDecoder('utf-8',{fatal:true}).decode(await readFile(new URL(file,import.meta.url)));
});

test('rogue selector reserves future slots, preserves other classes and renders progression outside disclosure',()=>{
 const c=make(1,'knife-master','burglar');setArchetype(c,'weapon-master',true);setArchetype(c,'breaker',true);
 assert.throws(()=>setArchetype(c,'thug',true),/conflicts/);assert.throws(()=>setArchetype(c,'trapsmith',true),/conflicts/);
 validateArchetypes(c);assert.deepEqual(c.builder.archetypes.fighter,['weapon-master']);assert.deepEqual(c.builder.archetypes.barbarian,['breaker']);
 const html=renderArchetypes(c);assert.match(html,/Rogue archetypes/);assert.match(html,/data-field="archetype.thug"\s+disabled/);assert.match(html,/<\/details><h3>Rogue progression/);
 const p=rogueProgression(c);assert.equal(p.length,20);assert.ok(!p[3].features.some(f=>f.id==='uncanny-dodge'));assert.ok(p[3].features.some(f=>f.id==='careful-disarm'));assert.ok(p[18].features.some(f=>f.label==='Sneak stab 10d8 / 10d4'));
 setArchetype(c,'knife-master',false);setArchetype(c,'thug',true);assert.equal(sheet(c).rogue.frightening,true);
});
test('Vibro-dagger gets d8 sneak dice while other tech weapons get d4, with unchanged weapon damage',()=>{
 const c=make(7,'knife-master');equip(c,rules,'weaponId','vibro-dagger');const s=sheet(c);assert.equal(s.rogue.sneakDamage,'4d8');
 const base=make(7);equip(base,rules,'weaponId','vibro-dagger');const b=sheet(base);assert.deepEqual(s.equipment.damageDice,b.equipment.damageDice);assert.equal(s.stats.damage.total,b.stats.damage.total);assert.equal(s.stats.attack.total,b.stats.attack.total);
 equip(c,rules,'weaponId','steam-axe');assert.equal(sheet(c).rogue.sneakDamage,'4d4');equip(c,rules,'weaponId','dagger');assert.equal(sheet(c).rogue.sneakDamage,'4d8');
 assert.equal(sheet(parseCharacter(exportCharacter(c))).rogue.sneakDamage,'4d8');
 c.builder.classOrder=['rogue',...Array(6).fill('fighter')];assert.equal(sheet(c).rogue.sneakDamage,'1d8');
});
test('retained Trapfinding reaches skills and sheet; removing it removes the bonus',()=>{
 const c=make(8,'burglar');c.builder.skills={'disable-device':{normal:4,background:0}};const s=sheet(c),skills=calculateSkills(c,calculate(c));
 assert.equal(s.rogue.trapfinding,4);assert.equal(skills.rows.find(r=>r.id==='disable-device').total,s.stats['skill.disable-device'].total);
 setArchetype(c,'poisoner',true);const after=sheet(c);assert.equal(after.stats['skill.disable-device'].total,s.stats['skill.disable-device'].total-4);assert.equal(after.rogue.trapSense,0);assert.equal(after.rogue.uncannyDodge,false);
});
test('Blade Sense and trap defenses are conditional and Careful Disarm doubles only rogue Trap Sense',()=>{
 const c=make(8,'burglar');const s=sheet(c),trap=row(s,'rogue.trap'),trigger=row(s,'rogue.triggered-trap');
 assert.equal(trap.stats.ac.total-s.stats.ac.total,2);assert.equal(trigger.stats.ac.total-s.stats.ac.total,4);assert.equal(trigger.stats['save.reflex'].total-s.stats['save.reflex'].total,4);
 setArchetype(c,'knife-master',true);const k=sheet(c);assert.equal(k.rogue.trapSense,0);assert.ok(!row(k,'rogue.triggered-trap'));assert.equal(row(k,'rogue.light-blade').stats.ac.total-k.stats.ac.total,2);assert.equal(row(k,'rogue.conceal-blade').stats['skill.sleight-of-hand'].total-k.stats['skill.sleight-of-hand'].total,4);
});
test('Poisoner adds only conditional poison alchemy and preserves conversion restrictions',()=>{
 const c=make(8,'poisoner');c.builder.skills={'craft:alchemy':{normal:4,background:0}};const s=sheet(c),r=row(s,'rogue.poison-work');
 assert.equal(r.stats['skill.craft:alchemy'].total-s.stats['skill.craft:alchemy'].total,4);assert.equal(r.stats['skill.tech-use'].total,s.stats['skill.tech-use'].total);
 const html=renderClassSheet(s,rules);assert.match(html,/Failure ruins the poison/);assert.match(html,/1 hour/);assert.equal(s.rogue.uncannyDodge,true);assert.equal(s.rogue.improvedUncannyDodge,true);
});
test('Thug and Trapsmith effects unlock at their class levels with approved tech permission scope',()=>{
 const c=make(8,'thug','trapsmith'),s=sheet(c);assert.equal(s.rogue.brutalBeating.damage,'3d6');assert.equal(s.rogue.brutalBeating.duration,4);assert.equal(s.rogue.trapMaster,true);assert.match(renderClassSheet(s,rules),/technological traps that already recognise/);
 c.builder.classOrder=Array(2).fill('rogue');assert.equal(sheet(c).rogue.brutalBeating,null);assert.equal(sheet(c).rogue.trapMaster,false);
});
