import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {renderClassicSheet} from './classic-sheet.mjs';
import {calculate,prepare,materialize} from './character.mjs';
import {equipmentSheet} from './equipment.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
import {saveCharacter,readRoster,exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('level thirteen example uses separate class progression and real spell capacity',()=>{
 const c=sheetExample(rules),r=calculate(c),s=equipmentSheet(c,rules);
 assert.deepEqual(r.classes,{barbarian:3,sorcerer:7,ironwright:3});assert.equal(r.level,13);assert.equal(r.bab,9);assert.equal(s.hitPoints.total,101);
 const casters=spellcasting(c,r);assert.equal(casters.length,1);assert.equal(casters[0].casterLevel,7);assert.deepEqual(casters[0].issues,[]);assert.equal(casters[0].rows.find(x=>x.level===1).slots,7);assert.deepEqual(casters[0].rows.map(x=>x.level),[0,1,2,3]);assert.deepEqual(casters[0].rows.slice(1).map(x=>x.slots),[7,7,5]);assert.ok(c.feats.some(x=>x.featId==='extend-spell'));assert.ok(c.feats.some(x=>x.featId==='empower-spell'));
 assert.equal(s.stats.ac.total,16);assert.equal(s.stats.attack.total,12);
});
test('rendering does not mutate character, spend fuel or add an owned item',()=>{
 const c=sheetExample(rules),before=structuredClone(c);
 for(let i=0;i<2;i++){const html=renderClassicSheet(c,rules);for(const text of ['CLASSIC CHARACTER SHEET','Barbarian 3 / Sorcerer 7 / Ironwright 3','Character notes','Craft','Magic Missile','Reservoir 4 / 4'])assert.ok(html.includes(text),text);}
 assert.deepEqual(c,before);
});
test('notes, specialties and independent owned resources survive roster and JSON round trips',()=>{
 const c=sheetExample(rules);c.notes='Session notes\nA debt to the smith.';
 c.techEquipment.items.push({...c.techEquipment.items[0],instanceId:'second-axe',reservoir:1});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 saveCharacter(storage,c,'example');const reloaded=readRoster(storage).characters[0].character;
 const imported=prepare(parseCharacter(JSON.parse(JSON.stringify(exportCharacter(reloaded)))));
 assert.deepEqual(materialize(imported),c);assert.equal(imported.techEquipment.items[0].reservoir,4);assert.equal(imported.techEquipment.items[1].reservoir,1);
 assert.equal(renderClassicSheet(imported,rules),renderClassicSheet(c,rules));
});
test('classic sheet escapes notes and identity and supports an existing minimal draft',()=>{
 const c=sheetExample(rules);c.notes='<script>alert(1)</script>';c.builder.identity.appearance='<img src=x onerror=alert(1)>';
 const html=renderClassicSheet(c,rules);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;script&gt;'));
 const old=prepare({name:'Existing',classes:{fighter:1},feats:[],notes:''});assert.ok(renderClassicSheet(old,rules).includes('Existing'));
});
test('opening another example does not modify the previous one',()=>{
 const a=sheetExample(rules);a.techEquipment.items[0].reservoir=0;a.notes='Changed';const b=sheetExample(rules);assert.equal(b.techEquipment.items[0].reservoir,4);assert.notEqual(a.notes,b.notes);
});
