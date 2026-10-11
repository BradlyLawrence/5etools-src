import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter} from './character.mjs';
import {classChoices,setClassChoice,gunslingerSummary,toggleClassEffect} from './class-choices.mjs';
import {equip,equipmentSheet} from './equipment.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(id){const c=newCharacter();c.builder.classOrder=[id];return c;}
test('class controls follow assigned classes and cleric choice survives save/export',()=>{
 const c=make('fighter');assert.equal(classChoices(c,rules).length,0);assert.throws(()=>setClassChoice(c,rules,'cleric-channel-energy','positive'));
 c.builder.classOrder=['cleric'];setClassChoice(c,rules,'cleric-channel-energy','positive');
 assert.equal(parseCharacter(exportCharacter(c)).ruleState.choices['cleric-channel-energy'],'positive');
 assert.equal(classChoices(c,rules)[0].classId,'cleric');
});
test('paladin deity weapon and Smite produce calculated conditional rows',()=>{
 const c=make('paladin');c.builder.baseScores.cha=16;setClassChoice(c,rules,'deity-weapon','longsword');equip(c,rules,'weaponId','longsword');
 assert.ok(equipmentSheet(c,rules).feats.some(f=>f.featId==='weapon-focus'&&f.active));
 toggleClassEffect(c,rules,'paladin.smite-evil',true);const sheet=equipmentSheet(c,rules);
 const normal=sheet.sheetRows.find(r=>r.label==='Normal'),smite=sheet.sheetRows.find(r=>r.label==='Against smitten evil target');
 assert.equal(smite.stats.attack.total,normal.stats.attack.total+3);
});
test('Ironwright family changes powered benefits and gunslinger choices obey level limits',()=>{
 const c=make('ironwright');equip(c,rules,'weaponId','steam-axe');const item=rules.equipment.items.find(x=>x.id==='steam-axe'),family=rules.technology.families.find(x=>x.id===item.tech.family),action=family.actions[0];
 const before=equipmentSheet(c,rules,action.id).equipment.extraDamageDice;setClassChoice(c,rules,'ironwright-family',family.id);
 assert.notEqual(equipmentSheet(c,rules,action.id).equipment.extraDamageDice,before);
 const g=make('gunslinger');setClassChoice(g,rules,'gunslinger-primary','rifle');assert.throws(()=>setClassChoice(g,rules,'gunslinger-secondary','pistol'));
 g.builder.classOrder=Array(7).fill('gunslinger');setClassChoice(g,rules,'gunslinger-secondary','pistol');assert.equal(gunslingerSummary(g).secondary,'pistol');
 assert.throws(()=>setClassChoice(g,rules,'gunslinger-secondary','rifle'));
});
