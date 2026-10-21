import {addEnhancedBase} from './enchanted-item-picker.mjs';
import {inventoryAction} from './inventory.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {newCharacter} from './character.mjs';
import {changeBuff} from './engine/buffs.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const on=(c,id)=>changeBuff(changeBuff(c,'add',id),'active',id,true);
test('Medium size spells update dice, reach, attacks, AC and maneuvers without changing the owned weapon',()=>{
 let c=sheetExample(rules),base=equipmentSheet(c,rules);assert.equal(c.equipment.armorId,'chain-shirt');assert.equal(base.stats.ac.total,16);assert.equal(base.stats['ac.touch'].total,11);assert.equal(base.stats['ac.flat-footed'].total,16);
 c=on(c,'enlarge-person');const before=structuredClone(c);let s=equipmentSheet(c,rules);
 assert.deepEqual(s.equipment.damageDice,['3d6']);assert.equal(s.equipment.reachFt,10);assert.equal(s.stats.attack.total,base.stats.attack.total);assert.equal(s.stats.ac.total,14);assert.equal(s.stats['ac.touch'].total,9);assert.equal(s.equipment.speedFt,base.equipment.speedFt);assert.equal(s.stats['combatManeuver.check'].total,base.stats['combatManeuver.check'].total+2);
 equipmentSheet(c,rules);assert.deepEqual(c,before);c=on(c,'reduce-person');assert.equal(c.buffs.find(b=>b.id==='enlarge-person').active,false);s=equipmentSheet(c,rules);
 assert.deepEqual(s.equipment.damageDice,['1d10']);assert.equal(s.equipment.reachFt,5);assert.equal(s.stats.attack.total,base.stats.attack.total);assert.equal(s.stats.ac.total,18);assert.equal(s.stats['ac.touch'].total,13);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(equipmentSheet(c,rules).stats,s.stats);
 assert.match(renderCombatSheet(c,rules),/Touch 13 \/ Flat-footed 18/);c=changeBuff(c,'remove','reduce-person');assert.deepEqual(equipmentSheet(c,rules).stats,base.stats);
 const bad=on(c,'enlarge-person');bad.buffs.push({id:'reduce-person',active:true,bonus:1});assert.throws(()=>parseCharacter(JSON.stringify(bad)));
});
test('Small resizing, reach weapons, and thrown/projectile damage follow spell exceptions',()=>{
 let c=sheetExample(rules);c.equipment.size='small';c=on(c,'reduce-person');let s=equipmentSheet(c,rules);assert.equal(s.equipment.size,'tiny');assert.equal(s.equipment.reachFt,0);assert.deepEqual(s.equipment.damageDice,['1d8']);
 c=on(c,'enlarge-person');s=equipmentSheet(c,rules);assert.equal(s.equipment.size,'medium');assert.equal(s.equipment.reachFt,5);assert.deepEqual(s.equipment.damageDice,['1d12']);
 c=sheetExample(rules);equip(c,rules,'weaponId','longspear');c=on(c,'enlarge-person');assert.equal(equipmentSheet(c,rules).equipment.reachFt,20);
 equip(c,rules,'weaponId','dagger');c.equipment.thrown=true;assert.deepEqual(equipmentSheet(c,rules).equipment.damageDice,['1d4']);c=on(c,'reduce-person');assert.deepEqual(equipmentSheet(c,rules).equipment.damageDice,['1d4']);
 equip(c,rules,'weaponId','light-crossbow');c=on(c,'enlarge-person');assert.deepEqual(equipmentSheet(c,rules).equipment.damageDice,['1d8']);c=on(c,'reduce-person');assert.deepEqual(equipmentSheet(c,rules).equipment.damageDice,['1d6']);
});
test('touch removes armour, shield and natural armour; flat-footed drops positive Dex/dodge without Uncanny Dodge',()=>{
 let c=newCharacter();c.builder.classOrder=['fighter'];c.builder.targetLevel=1;c.builder.method='manual';c.builder.baseScores={str:14,dex:16,con:14,int:10,wis:10,cha:10};equip(c,rules,'armorId','chain-shirt');equip(c,rules,'weaponId','longsword');equip(c,rules,'shieldId','shield-heavy-steel');
 let s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total-s.stats['ac.touch'].total,6);assert.equal(s.stats.ac.total-s.stats['ac.flat-footed'].total,3);
 const before=s;c=on(c,'haste');s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total,before.stats.ac.total+1);assert.equal(s.stats['ac.touch'].total,before.stats['ac.touch'].total+1);assert.equal(s.stats['ac.flat-footed'].total,before.stats['ac.flat-footed'].total);
 c.builder.baseScores.dex=8;s=equipmentSheet(c,rules);assert.equal(s.stats['ac.flat-footed'].total,s.stats.ac.total-1);
});

test('actual size stacks with Impact and size Strength stacks with enhancement Strength',()=>{
 let c=sheetExample(rules);c=addEnhancedBase(c,rules,'greatsword',2,'impact');inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);const before=equipmentSheet(c,rules);c=on(c,'enlarge-person');c=on(c,'bulls-strength');const s=equipmentSheet(c,rules);assert.deepEqual(s.equipment.damageDice,['4d6']);assert.equal(s.effectiveAbilities.str,before.effectiveAbilities.str+6);assert.equal(s.effectiveAbilities.dex,before.effectiveAbilities.dex-2);
 c=on(c,'reduce-person');assert.deepEqual(equipmentSheet(c,rules).equipment.damageDice,['2d6']);
});
