import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {setClassChoice,renderClassChoices} from './class-choices.mjs';
import {equipmentSheet} from './equipment.mjs';
import {dependentSpecs,optionClassSkills} from './engine/core-options.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const make=cls=>{const c=newCharacter();c.builder.classOrder=[cls];return c;};
test('domains change saves and persist; duplicate domains rejected',()=>{
 const c=make('cleric'),before=equipmentSheet(c,rules);
 setClassChoice(c,rules,'cleric-domain-1','protection');setClassChoice(c,rules,'cleric-domain-2','travel');
 const after=equipmentSheet(c,rules);assert.equal(after.stats['save.will'].total,before.stats['save.will'].total+1);
 assert.throws(()=>setClassChoice(c,rules,'cleric-domain-2','protection'));
 assert.equal(parseCharacter(exportCharacter(c)).builder.classOptions['cleric-domain-1'],'protection');
 c.builder.classOrder=['fighter'];assert.equal(equipmentSheet(c,rules).stats['save.will'].total,before.stats['save.will'].total-2);
});
test('bloodline class skill and dependent choices follow class',()=>{
 const c=make('sorcerer');setClassChoice(c,rules,'sorcerer-bloodline','draconic');
 assert.ok(optionClassSkills({...c,classes:calculate(c).classes}).includes('perception'));
 assert.match(renderClassChoices(c,rules),/Dragon ancestry/);
 setClassChoice(c,rules,'sorcerer-bloodline','arcane');assert.doesNotMatch(renderClassChoices(c,rules),/data-field="classChoice.bloodline-dragon"/);
 setClassChoice(c,rules,'bloodline-knowledge','knowledge-local');assert.ok(optionClassSkills({...c,classes:calculate(c).classes}).includes('knowledge-local'));
});
test('familiar bonus depends on proximity and bond; ranger companion gated',()=>{
 const c=make('wizard'),before=equipmentSheet(c,rules).stats['save.fortitude'].total;
 setClassChoice(c,rules,'wizard-bond','familiar');setClassChoice(c,rules,'wizard-familiar','rat');setClassChoice(c,rules,'familiar-distance','near');
 assert.equal(equipmentSheet(c,rules).stats['save.fortitude'].total,before+2);
 setClassChoice(c,rules,'familiar-distance','away');assert.equal(equipmentSheet(c,rules).stats['save.fortitude'].total,before);
 const r=make('ranger');assert.throws(()=>setClassChoice(r,rules,'ranger-bond','companion'));
 r.builder.classOrder=Array(4).fill('ranger');setClassChoice(r,rules,'ranger-bond','companion');setClassChoice(r,rules,'ranger-companion','wolf');assert.throws(()=>setClassChoice(r,rules,'ranger-companion','bear'));
 r.builder.classOrder=['ranger'];assert.ok(!dependentSpecs({...r,classes:calculate(r).classes}).some(x=>x.id==='ranger-companion'));
});
