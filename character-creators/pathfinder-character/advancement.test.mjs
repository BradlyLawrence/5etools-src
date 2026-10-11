import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate,validateBuilder,materialize} from './character.mjs';
import {hitPoints,favoredClasses} from './advancement.mjs';
import {calculateSkills} from './skills.mjs';
import {equipmentSheet} from './equipment.mjs';
import {startingSlots} from './feats.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(){const c=newCharacter();c.builder.classOrder=['fighter','rogue','wizard'];c.builder.targetLevel=3;c.builder.baseScores.con=14;return c;}
test('HP uses first-level maximum, per-class dice, chosen rolls, Constitution and Toughness',()=>{
 const c=make();let hp=hitPoints(c,calculate(c).abilities);assert.deepEqual(hp.rows.map(x=>x.roll),[10,5,4]);assert.equal(hp.total,25);
 c.builder.hpChoices=[null,{mode:'max'},{mode:'roll',roll:2}];assert.equal(hitPoints(c,calculate(c).abilities).total,26);
 c.feats=[{featId:'toughness'}];assert.equal(equipmentSheet(c,rules).hitPoints.total,29);
 c.builder.baseScores.con=18;assert.equal(equipmentSheet(c,rules).hitPoints.total,35);
 c.builder.hpChoices[2].roll=7;assert.equal(hitPoints(c,calculate(c).abilities).total,null);
});
test('favoured classes award only eligible levels and skill rewards increase the normal pool',()=>{
 const c=make();c.builder.favoredClasses=['fighter','rogue'];c.builder.favoredRewards=['hp','skill','hp'];
 const base=calculateSkills(c,calculate(c)).normal;assert.equal(hitPoints(c,calculate(c).abilities).total,26);
 c.builder.raceId='half-elves';assert.equal(favoredClasses(c).length,2);assert.equal(calculateSkills(c,calculate(c)).normal,base+1);
 c.builder.classOrder[1]='wizard';assert.equal(calculateSkills(c,calculate(c)).normal,base-6);
 c.builder.baseScores.con=2;assert.ok(hitPoints(c,calculate(c).abilities).rows.every(x=>x.total>=1));
});
test('racial alternatives replace grants, reject conflicts and apply their bonuses',()=>{
 const c=make();c.builder.raceId='humans';c.builder.racialAlternates=['eye-for-talent'];assert.ok(!startingSlots(c).some(x=>x.id==='human'));
 assert.equal(equipmentSheet(c,rules).stats['skill.sense-motive'].modifier,2);
 c.builder.raceId='half-elves';c.builder.racialAlternates=['dual-minded'];assert.equal(equipmentSheet(c,rules).stats['save.will'].modifier,2);
 c.builder.racialAlternates.push('integrated');assert.throws(()=>validateBuilder(c.builder));
 c.builder.racialAlternates=[];c.builder.racialSkill='perception';assert.ok(materialize(c).feats.some(f=>f.racialGrant));assert.equal(equipmentSheet(c,rules).stats['skill.perception'].modifier,3);
});
