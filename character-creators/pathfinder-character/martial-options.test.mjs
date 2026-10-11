import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {setClassChoice,renderClassChoices} from './class-choices.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {calculateSkills} from './skills.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(cls,level){const c=newCharacter();c.builder.classOrder=Array(level).fill(cls);c.builder.targetLevel=level;return c;}
const choose=(c,id,value)=>setClassChoice(c,rules,id,value);
test('weapon training scales by fighter level and stacks with Weapon Focus; switching weapons removes bonus',()=>{
 const c=make('fighter',9);equip(c,rules,'weaponId','greataxe');c.feats=[{featId:'weapon-focus',weaponId:'greataxe'}];
 const before=equipmentSheet(c,rules);choose(c,'fighter-training-5','axes');choose(c,'fighter-training-9','bows');const after=equipmentSheet(c,rules);
 assert.equal(after.stats.attack.total,before.stats.attack.total+2);assert.equal(after.stats.damage.total,before.stats.damage.total+2);
 assert.equal(after.stats['maneuver.sunder.check'].total,before.stats['maneuver.sunder.check'].total+2);
 assert.equal(after.stats['maneuver.disarm.defense'].total,before.stats['maneuver.disarm.defense'].total+2);
 equip(c,rules,'weaponId','longsword');const unrelated=equipmentSheet(c,rules);c.builder.classOptions={};assert.equal(unrelated.stats.attack.total,equipmentSheet(c,rules).stats.attack.total);
 assert.throws(()=>choose(make('fighter',4),'fighter-training-5','axes'));
});
test('training uses highest overlapping group and includes technology families',()=>{
 const c=make('fighter',9);choose(c,'fighter-training-5','light-blades');choose(c,'fighter-training-9','thrown');equip(c,rules,'weaponId','dagger');
 const after=equipmentSheet(c,rules);const plain=structuredClone(c);plain.builder.classOptions={};assert.equal(after.stats.attack.total,equipmentSheet(plain,rules).stats.attack.total+2);
 const tech=make('fighter',5);equip(tech,rules,'weaponId','steam-axe');const before=equipmentSheet(tech,rules);choose(tech,'fighter-training-5','axes');assert.equal(equipmentSheet(tech,rules).stats.attack.total,before.stats.attack.total+1);
});
test('favoured enemy advances selected categories only and remains conditional',()=>{
 const c=make('ranger',10);choose(c,'ranger-enemy-1','undead');choose(c,'ranger-enemy-5','dragon');choose(c,'ranger-enemy-boost-5','undead');choose(c,'ranger-enemy-10','animal');choose(c,'ranger-enemy-boost-10','dragon');
 const s=equipmentSheet(c,rules),normal=s.sheetRows.find(r=>r.id==='normal'),undead=s.sheetRows.find(r=>r.id==='normal|enemy:undead'),animal=s.sheetRows.find(r=>r.id==='normal|enemy:animal');
 assert.equal(undead.stats.attack.total,normal.stats.attack.total+4);assert.equal(undead.stats.damage.total,normal.stats.damage.total+4);assert.equal(animal.stats.attack.total,normal.stats.attack.total+2);
 assert.equal(undead.stats['skill.knowledge-religion'].total,normal.stats['skill.knowledge-religion'].total+4);
 assert.throws(()=>choose(c,'ranger-enemy-10','undead'));
 assert.equal(parseCharacter(exportCharacter(c)).builder.classOptions['ranger-enemy-boost-10'],'dragon');
 c.builder.classOrder=Array(4).fill('ranger');const lower=equipmentSheet(c,rules);assert.equal(lower.sheetRows.find(r=>r.id==='normal|enemy:undead').stats.attack.total,lower.stats.attack.total+2);assert.ok(!lower.sheetRows.some(r=>r.id.includes('enemy:dragon')));
});
test('favoured terrain modifies initiative and skills but not weapon damage',()=>{
 const c=make('ranger',8);choose(c,'ranger-terrain-3','forest');choose(c,'ranger-terrain-8','urban');choose(c,'ranger-terrain-boost-8','forest');
 choose(c,'ranger-enemy-1','undead');const s=equipmentSheet(c,rules),row=s.sheetRows.find(r=>r.id==='normal|terrain:forest');const both=s.sheetRows.find(r=>r.id==='normal|enemy:undead|terrain:forest');assert.equal(both.stats.attack.total,s.stats.attack.total+2);assert.equal(both.stats['skill.perception'].total,s.stats['skill.perception'].total+6);assert.equal(row.stats.initiative.total,s.stats.initiative.total+4);assert.equal(row.stats['skill.stealth'].total,s.stats['skill.stealth'].total+4);assert.equal(row.stats.damage.total,s.stats.damage.total);
});
test('domain class skills and companion unlocks follow active choice',()=>{
 const c=make('cleric',4);choose(c,'cleric-domain-1','trickery');c.builder.skills.stealth={normal:1,background:0};assert.equal(calculateSkills(c,calculate(c)).rows.find(r=>r.id==='stealth').classBonus,3);
 choose(c,'cleric-domain-2','animal');choose(c,'cleric-domain-companion','wolf');assert.match(renderClassChoices(c,rules),/Effective druid level: 1/);
 choose(c,'cleric-domain-2','fire');assert.doesNotMatch(renderClassChoices(c,rules),/data-field="classChoice.cleric-domain-companion"/);
});
test('energy resistances take the highest source, then immunity; draconic armour respects racial stacking',()=>{
 const c=make('sorcerer',9);c.builder.raceId='dragonborn';c.builder.draconicAncestry='red';c.builder.racialAlternates=['armoured-scales'];
 const before=equipmentSheet(c,rules);choose(c,'sorcerer-bloodline','draconic');choose(c,'bloodline-dragon','red');let s=equipmentSheet(c,rules);assert.equal(s.defenses.resistances.fire,10);assert.equal(s.stats.ac.total,before.stats.ac.total+1);
 c.builder.classOrder=Array(20).fill('sorcerer');s=equipmentSheet(c,rules);assert.equal(s.defenses.resistances.fire,'immune');
 choose(c,'sorcerer-bloodline','elemental');choose(c,'bloodline-element','water');s=equipmentSheet(c,rules);assert.equal(s.defenses.resistances.cold,'immune');assert.equal(s.defenses.resistances.fire,5);
});
test('abjuration ward and resistance switch off when school changes; transferred protection removes saves',()=>{
 const c=make('wizard',11);const before=equipmentSheet(c,rules);choose(c,'wizard-school','abjuration');choose(c,'abjuration-energy','sonic');choose(c,'protective-ward','on');let s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total,before.stats.ac.total+3);assert.equal(s.defenses.resistances.sonic,10);
 choose(c,'wizard-school','illusion');s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total,before.stats.ac.total);assert.equal(s.defenses.resistances.sonic,undefined);
 const cleric=make('cleric',5);choose(cleric,'cleric-domain-1','protection');const active=equipmentSheet(cleric,rules);choose(cleric,'cleric-protection-transferred','transferred');assert.equal(equipmentSheet(cleric,rules).stats['save.will'].total,active.stats['save.will'].total-2);
});
