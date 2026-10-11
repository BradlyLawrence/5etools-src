import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,materialize} from './character.mjs';
import {startingSlots,selectStartingFeat,availableStartingFeats} from './feats.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(cls,n){const c=newCharacter();c.builder.classOrder=Array(n).fill(cls);c.builder.targetLevel=n;return c;}
test('multiclass feat slots follow acquisition order and trim when levels are removed',()=>{
 const c=make('rogue',1);c.builder.classOrder=['rogue','fighter','fighter','rogue','fighter','fighter'];c.builder.targetLevel=6;
 const slots=startingSlots(c);assert.equal(slots.find(x=>x.id==='fighter-bonus-1').level,2);assert.equal(slots.find(x=>x.id==='fighter-bonus-4').level,6);
 assert.throws(()=>selectStartingFeat(c,rules,'fighter-bonus-1','lunge'));
 selectStartingFeat(c,rules,'fighter-bonus-4','improved-initiative');assert.ok(equipmentSheet(c,rules).feats.find(f=>f.featId==='improved-initiative').active);
 c.builder.classOrder=c.builder.classOrder.slice(0,5);assert.ok(!materialize(c).feats.some(f=>f.creatorSlot==='fighter-bonus-4'));
});
test('later fighter feat can meet BAB requirement, but first-level slot cannot borrow later levels',()=>{
 const c=make('fighter',6);assert.throws(()=>selectStartingFeat(c,rules,'starting','lunge'));selectStartingFeat(c,rules,'fighter-bonus-6','lunge');assert.ok(equipmentSheet(c,rules).feats.find(f=>f.featId==='lunge').active);
});
test('monk waiver only applies to earned bonus slots, and persists',()=>{
 const c=make('monk',1);selectStartingFeat(c,rules,'monk-bonus-1','dodge');assert.equal(equipmentSheet(c,rules).stats.ac.modifier,1);
 assert.throws(()=>selectStartingFeat(c,rules,'starting','improved-grapple'));
 assert.ok(equipmentSheet(parseCharacter(exportCharacter(c)),rules).feats.find(f=>f.featId==='dodge').active);
});
test('ranger style waives prerequisites, heavy armour suppresses it, and changing style removes benefit',()=>{
 const c=make('ranger',2);c.builder.classOptions={'ranger-style':'two-weapon'};selectStartingFeat(c,rules,'ranger-bonus-2','double-slice');assert.ok(equipmentSheet(c,rules).feats.find(f=>f.featId==='double-slice').active);
 equip(c,rules,'armorId','full-plate');assert.ok(!equipmentSheet(c,rules).feats.some(f=>f.featId==='double-slice'&&f.active));
 equip(c,rules,'armorId',null);c.builder.classOptions['ranger-style']='archery';assert.ok(!equipmentSheet(c,rules).feats.some(f=>f.featId==='double-slice'&&f.active));
});
test('wizard and teamwork lists use correct feat categories',()=>{
 const w=make('wizard',5);selectStartingFeat(w,rules,'wizard-bonus-5','craft-wand');assert.ok(equipmentSheet(w,rules).feats.find(f=>f.featId==='craft-wand').active);assert.throws(()=>selectStartingFeat(w,rules,'wizard-bonus-5','power-attack'));
 const i=make('inquisitor',3);assert.ok(!availableStartingFeats(i,rules,'inquisitor-bonus-3').some(f=>f.id==='outflank'));assert.throws(()=>selectStartingFeat(i,rules,'inquisitor-bonus-3','outflank'));selectStartingFeat(i,rules,'inquisitor-bonus-3','lookout');
});
test('repeatable stack feats count separate earned slots',()=>{
 const c=make('barbarian',3);selectStartingFeat(c,rules,'starting','extra-rage');selectStartingFeat(c,rules,'level-3','extra-rage');assert.equal(equipmentSheet(c,rules).feats.find(f=>f.featId==='extra-rage').count,2);
 c.builder.classOrder=['barbarian'];assert.equal(equipmentSheet(c,rules).feats.find(f=>f.featId==='extra-rage').count,1);
});
test('bloodline feat list follows bloodline and class level',()=>{
 const c=make('sorcerer',7);c.builder.classOptions={'sorcerer-bloodline':'draconic'};selectStartingFeat(c,rules,'sorcerer-bonus-7','toughness');assert.ok(equipmentSheet(c,rules).stats['hitPoints.bonus'].total>=7);
 c.builder.classOptions['sorcerer-bloodline']='abyssal';assert.ok(!equipmentSheet(c,rules).feats.some(f=>f.featId==='toughness'&&f.active));
});
