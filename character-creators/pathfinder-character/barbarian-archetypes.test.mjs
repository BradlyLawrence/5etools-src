import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {setClassChoice,renderClassSheet} from './class-choices.mjs';
import {calculateSkills} from './skills.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
import {setArchetype} from './engine/archetypes.mjs';
const rules=JSON.parse(await readFile(new URL('rules.json',import.meta.url),'utf8'));
function make(n,id){const c=newCharacter();c.builder.targetLevel=n;c.builder.classOrder=Array(n).fill('barbarian');setArchetype(c,id,true);return c;}
test('barbarian choices survive JSON round-trip with identical sheet bonuses',()=>{
 const c=make(12,'invulnerable-rager');setClassChoice(c,rules,'extreme-endurance','cold');setClassChoice(c,rules,'barbarian-raging','on');setClassChoice(c,rules,'barbarian-ability-8','increased-damage-reduction');
 const before=equipmentSheet(c,rules),after=equipmentSheet(parseCharacter(exportCharacter(c)),rules);assert.deepEqual(after.stats,before.stats);assert.deepEqual(after.barbarian,before.barbarian);assert.equal(after.barbarian.damageReduction,7);assert.match(renderClassSheet(before,rules),/DR 7/);
});
test('Savage Technologist gains Tech Use and loses only its own old class skills',()=>{
 const c=make(3,'savage-technologist');c.builder.skills={'tech-use':{normal:1,background:0}};const rows=calculateSkills(c,calculate(c));assert.ok(rows.classSkills.includes('tech-use'));assert.ok(!rows.classSkills.includes('knowledge-nature'));c.builder.classOrder.push('ranger');assert.ok(calculateSkills(c,calculate(c)).classSkills.includes('knowledge-nature'));
});
test('Keen Senses extends racial darkvision and persists after equipment changes',()=>{
 const c=make(10,'superstitious');c.builder.raceId='dwarves';assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,120);equip(c,rules,'weaponId','steam-axe');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,120);c.builder.classOrder=Array(9).fill('barbarian');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,60);
});
test('Armored Hulk applies its speed increase before armour reduction for a 20-ft character',()=>{
 const c=make(5,'armored-hulk');c.builder.raceId='gnomes';equip(c,rules,'armorId','full-plate');assert.equal(equipmentSheet(c,rules).equipment.speedFt,25);setClassChoice(c,rules,'barbarian-load','heavy');assert.equal(equipmentSheet(c,rules).equipment.speedFt,20);
});
test('Pit Fighter check and defense choices remain distinct after saving',()=>{
 const c=make(6,'brutal-pugilist');setClassChoice(c,rules,'pit-fighter-1','trip.check');assert.throws(()=>setClassChoice(c,rules,'pit-fighter-2','trip.check'));setClassChoice(c,rules,'pit-fighter-2','trip.defense');const s=equipmentSheet(parseCharacter(exportCharacter(c)),rules);assert.equal(s.stats['maneuver.trip.check'].modifier,2);assert.equal(s.stats['maneuver.trip.defense'].modifier,2);
});
