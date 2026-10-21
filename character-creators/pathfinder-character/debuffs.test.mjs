import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {changeDebuff} from './engine/debuffs.mjs';
import {equipmentSheet} from './equipment.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('Shaken and Sickened apply distinct cumulative penalties and deactivate cleanly',()=>{
 let c=sheetExample(rules),base=equipmentSheet(c,rules);c=changeDebuff(c,'add','shaken');assert.equal(equipmentSheet(c,rules).stats.attack.total,base.stats.attack.total);c=changeDebuff(c,'active','shaken',true);
 let s=equipmentSheet(c,rules);for(const stat of ['attack','save.fortitude','save.reflex','save.will','skill.perception','initiative'])assert.equal(s.stats[stat].total,base.stats[stat].total-2,stat);assert.equal(s.stats.damage.total,base.stats.damage.total);
 c=changeDebuff(changeDebuff(c,'add','sickened'),'active','sickened',true);s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,base.stats.attack.total-4);assert.equal(s.stats.damage.total,base.stats.damage.total-2);
 c=changeDebuff(c,'active','shaken',false);assert.equal(equipmentSheet(c,rules).stats.attack.total,base.stats.attack.total-2);c=changeDebuff(c,'remove','sickened');assert.equal(equipmentSheet(c,rules).stats.attack.total,base.stats.attack.total);
});
test('Fatigued changes derived combat stats without rewriting scores and survives save/JSON',()=>{
 let c=sheetExample(rules);const before=structuredClone(c),base=equipmentSheet(c,rules);c=changeDebuff(changeDebuff(c,'add','fatigued'),'active','fatigued',true);const s=equipmentSheet(c,rules);
 assert.equal(s.effectiveAbilities.str,base.effectiveAbilities.str-2);assert.equal(s.effectiveAbilities.dex,base.effectiveAbilities.dex-2);for(const stat of ['attack','ac','initiative','save.reflex'])assert.equal(s.stats[stat].total,base.stats[stat].total-1,stat);
 assert.deepEqual(c.builder.baseScores,before.builder.baseScores);assert.deepEqual(c.techEquipment,before.techEquipment);const snapshot=structuredClone(c);equipmentSheet(c,rules);assert.deepEqual(c,snapshot);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.equal(equipmentSheet(c,rules).stats.attack.total,s.stats.attack.total);
 assert.match(renderCombatSheet(c,rules),/data-field="savedDebuff.fatigued" checked/);assert.match(renderCombatSheet(c,rules),/data-remove-debuff="fatigued"/);
 c=changeDebuff(c,'remove','fatigued');assert.equal(equipmentSheet(c,rules).stats.attack.total,base.stats.attack.total);assert.throws(()=>changeDebuff(c,'add','unknown'));const bad=structuredClone(c);bad.debuffs=[{id:'shaken',active:'yes'}];assert.throws(()=>parseCharacter(JSON.stringify(bad)));
});
