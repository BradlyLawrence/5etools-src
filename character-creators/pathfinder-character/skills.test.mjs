import test from 'node:test';
import assert from 'node:assert/strict';
import {newCharacter,calculate,materialize,prepare,validateBuilder} from './character.mjs';
import {skillName,calculateSkills} from './skills.mjs';
function character(){const c=newCharacter();Object.assign(c.builder,{raceId:'humans',flexAbility:'int',targetLevel:6,classOrder:['fighter','fighter','fighter','barbarian','barbarian','ironwright']});c.builder.baseScores.int=12;return c;}
test('multiclass ranks use each class, final Intelligence, human Skilled and separate background pool',()=>{
 const c=character(),s=calculateSkills(c,calculate(c));
 assert.equal(s.normal,36);assert.equal(s.background,12);
 c.builder.baseScores.int=2;assert.equal(calculateSkills(c,calculate(c)).normal,12);
 c.builder.raceId='elves';assert.equal(calculateSkills(c,calculate(c)).normal,6);
});
test('background and normal ranks combine under one level cap; class bonuses apply once',()=>{
 const c=character();c.builder.skills={'craft:weapons':{normal:3,background:3},perception:{normal:1,background:0}};
 let s=calculateSkills(c,calculate(c));assert.equal(s.rows.find(x=>x.id==='craft:weapons').total,11);
 assert.equal(s.rows.find(x=>x.id==='perception').classBonus,3);
 c.builder.skills['craft:weapons'].normal=4;c.builder.skills.perception.background=1;
 s=calculateSkills(c,calculate(c));assert.ok(s.issues.some(x=>x.includes('7')||x.includes('rank limit')));assert.ok(s.issues.some(x=>x.includes('cannot use background')));
});
test('level and Intelligence reductions flag overspending without deleting choices',()=>{
 const c=character();c.builder.skills={'lore:dragons':{normal:6,background:6}};
 c.builder.classOrder=['fighter'];c.builder.baseScores.int=8;
 const s=calculateSkills(c,calculate(c));assert.ok(s.issues.some(x=>x.includes('Normal skill ranks exceed')));assert.ok(s.issues.some(x=>x.includes('Background skill ranks exceed')));
 assert.equal(c.builder.skills['lore:dragons'].normal,6);
});
test('named skills and ranks survive export, migration and validation',()=>{
 const c=character();c.builder.skills={'artistry:poetry':{normal:0,background:2}};
 const output=materialize(c),roundtrip=prepare(JSON.parse(JSON.stringify(output)));
 assert.equal(roundtrip.skillRanks['artistry:poetry'],2);assert.ok(output.classSkills.includes('artistry:poetry'));validateBuilder(roundtrip.builder);
 roundtrip.builder.skills['artistry:poetry'].normal=-1;assert.throws(()=>validateBuilder(roundtrip.builder));
});

test('specialty labels use parentheses',()=>{assert.equal(skillName('craft:baking'),'Craft (Baking)');assert.equal(skillName('craft:blacksmithing'),'Craft (Blacksmithing)');});
