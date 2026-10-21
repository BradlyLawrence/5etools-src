import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter} from './character.mjs';
import {addEnhancedBase} from './enchanted-item-picker.mjs';
import {inventoryAction} from './inventory.mjs';
import {equipmentSheet} from './equipment.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
import {renderCombatEquipment} from './combat-equipment.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
function make(item,effect,bonus=1){let c=newCharacter();c.builder.classOrder=['barbarian','barbarian','barbarian'];c.builder.baseScores={str:12,dex:18,con:14,int:10,wis:10,cha:10};c=addEnhancedBase(c,rules,item,bonus,effect);inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);return c;}
test('Agile uses Dex with Finesse, respects off-hand and avoids two-handed multiplication',()=>{
 const c=make('rapier','agile');const before=equipmentSheet(c,rules);c.feats=[{featId:'weapon-finesse'}];const dex=equipmentSheet(c,rules);assert.equal(dex.stats.damage.total-before.stats.damage.total,3);
 c.equipment.damageMode='two-handed';assert.equal(equipmentSheet(c,rules).stats.damage.total,dex.stats.damage.total);
 c.equipment.damageMode='off-hand';assert.equal(equipmentSheet(c,rules).stats.damage.total,dex.stats.damage.total-2);
 assert.match(renderCombatEquipment(c,rules),/Dexterity used for damage/);
 inventoryAction(c,rules,'equip',c.craftedItems[0].instanceId);assert.ok(!equipmentSheet(c,rules).equipment.enchantmentNotes.some(x=>x.startsWith('Agile')));
});
test('Impact enlarges Small/Medium base dice once and adds bull rush enhancement',()=>{
 const c=make('greatsword','impact',2);const before=structuredClone(c);let s=equipmentSheet(c,rules);assert.deepEqual(s.equipment.damageDice,['3d6']);assert.ok(s.stats['maneuver.bull-rush.check'].breakdown.some(x=>x.name==='Impact'&&x.value===2));
 equipmentSheet(c,rules);assert.deepEqual(c,before);c.builder.raceId='halflings';s=equipmentSheet(c,rules);assert.deepEqual(s.equipment.damageDice,['2d6']);
});
test('Furious changes effective enhancement only during rage, persists toggle and never edits item',()=>{
 let c=make('longsword','furious');const calm=equipmentSheet(c,rules);c.builder.classOptions??={};c.builder.classOptions['barbarian-raging']='on';const raging=equipmentSheet(c,rules);
 assert.equal(raging.stats.attack.total-calm.stats.attack.total,4);assert.equal(raging.stats.damage.total-calm.stats.damage.total,4);assert.equal(c.craftedItems[0].design.effects[0].value,1);
 assert.match(renderCombatEquipment(c,rules),/effective enhancement \+3 while raging/);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.equal(equipmentSheet(c,rules).stats.damage.total,raging.stats.damage.total);
 c.builder.classOptions['barbarian-raging']='off';assert.equal(equipmentSheet(c,rules).stats.damage.total,calm.stats.damage.total);
});
