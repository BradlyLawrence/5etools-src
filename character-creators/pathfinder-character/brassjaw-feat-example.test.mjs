import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {brassjawFeatExample} from './brassjaw-feat-example.mjs';import {sheetExample} from './sheet-example.mjs';import {equipmentSheet,equip} from './equipment.mjs';import {planImport,applyImport,createPackage} from './transfer.mjs';import {readRoster} from './roster.mjs';import {withHomebrew} from './homebrew-feats.mjs';
const core=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('Brassjaw gains +1 greataxe attack only, retained after JSON package export/import and reload',()=>{
 const example=brassjawFeatExample(core),base=equipmentSheet(sheetExample(core),core),boosted=equipmentSheet(example.character,example.rules);
 assert.equal(base.stats.attack.total,12);assert.equal(boosted.stats.attack.total,13);assert.equal(boosted.stats.damage.total,base.stats.damage.total);
 const file=JSON.parse(JSON.stringify(example.package));assert.equal(file.feats.length,1);assert.equal(file.characters[0].character.feats.find(f=>f.featId===file.feats[0].id).weaponId,'greataxe');
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)},plan=planImport(storage,file);applyImport(storage,plan,Object.fromEntries(plan.rows.map(r=>[r.kind+':'+r.id,'import'])),core);
 const restored=readRoster(storage).characters[0].character,rules=withHomebrew(core,storage);assert.deepEqual(equipmentSheet(restored,rules).stats,boosted.stats);assert.deepEqual(restored.techEquipment,example.character.techEquipment);assert.deepEqual(restored.spellUse,example.character.spellUse);assert.deepEqual(createPackage(storage).feats,file.feats);
 const plain=sheetExample(core);equip(plain,core,'weaponId','longsword');equip(restored,rules,'weaponId','longsword');assert.equal(equipmentSheet(restored,rules).stats.attack.total,equipmentSheet(plain,core).stats.attack.total);
 equip(restored,rules,'weaponId','greataxe');assert.equal(equipmentSheet(restored,rules).stats.attack.total,13);
 const repeat=planImport(storage,file);assert.ok(repeat.rows.every(r=>r.status==='identical'));assert.equal(applyImport(storage,repeat,{},core),0);
});
