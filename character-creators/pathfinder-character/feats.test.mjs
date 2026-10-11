import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,materialize} from './character.mjs';
import {selectStartingFeat,startingSlots,renderStartingFeats,featChoices,availableStartingFeats} from './feats.mjs';
import {equip,equipmentSheet} from './equipment.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const make=()=>{const c=newCharacter();c.builder.raceId='humans';c.builder.classOrder=['fighter'];c.builder.baseScores.str=16;return c;};
test('starting, human and fighter slots save feats and apply equipment bonuses',()=>{
 const c=make();assert.equal(startingSlots(c).length,3);
 selectStartingFeat(c,rules,'starting','weapon-focus','longsword');selectStartingFeat(c,rules,'human','toughness');
 selectStartingFeat(c,rules,'fighter-starting','power-attack');equip(c,rules,'weaponId','longsword');
 assert.equal(equipmentSheet(c,rules).stats.attack.total,5);
 assert.throws(()=>selectStartingFeat(c,rules,'fighter-starting','toughness'));
 assert.throws(()=>selectStartingFeat(c,rules,'human','weapon-focus','longsword'));
 assert.throws(()=>selectStartingFeat(c,rules,'human','combat-expertise'));
});
test('later BAB cannot qualify a starting feat; race changes remove unavailable bonuses',()=>{
 const c=make();c.builder.classOrder=Array(8).fill('fighter');
 assert.throws(()=>selectStartingFeat(c,rules,'starting','lunge'));
 selectStartingFeat(c,rules,'human','toughness');c.builder.raceId='elves';
 assert.ok(!materialize(c).feats.some(f=>f.creatorSlot==='human'));
});

test('feat previews show only relevant choices and Skill Focus saves its skill bonus',()=>{
 const c=make();
 const plain=renderStartingFeats(c,rules,{starting:'acrobatic-steps'});
 assert.ok(plain.includes('Acrobatic Steps'));assert.ok(!plain.includes('id="feat-weapon-starting"'));
 assert.ok(renderStartingFeats(c,rules,{starting:'weapon-focus'}).includes('id="feat-weapon-starting"'));
 assert.ok(renderStartingFeats(c,rules,{starting:'skill-focus'}).includes('feat-choice-starting-skill-focus-skill'));
 assert.throws(()=>selectStartingFeat(c,rules,'starting','skill-focus'));
 selectStartingFeat(c,rules,'starting','skill-focus',undefined,{'skill-focus-skill':'perception'});
 assert.equal(c.ruleState.choices['skill-focus-skill'],'perception');
 assert.equal(equipmentSheet(c,rules).stats['skill.perception'].modifier,3);
});

test('empty feat selection never shows class choices or feat-specific selectors',()=>{
 const c=make();assert.deepEqual(featChoices(rules,undefined),[]);assert.deepEqual(featChoices(rules,''),[]);
 const html=renderStartingFeats(c,rules);
 assert.ok(!html.includes('id="feat-choice-'));assert.ok(!html.includes('id="feat-weapon-'));
 assert.ok(!html.includes('Cavalier order'));assert.ok(!html.includes('Cleric channel energy'));
});

test('suggestions hide class grants and chosen feats, retaining repeatable feats',()=>{
 const c=make();selectStartingFeat(c,rules,'starting','toughness');
 let ids=availableStartingFeats(c,rules,'human').map(f=>f.id);
 assert.ok(!ids.includes('toughness'));assert.ok(!ids.includes('combat-expertise'));assert.ok(ids.includes('weapon-focus'));
 selectStartingFeat(c,rules,'human','weapon-focus','longsword');
 ids=availableStartingFeats(c,rules,'fighter-starting').map(f=>f.id);assert.ok(ids.includes('weapon-focus'));
 selectStartingFeat(c,rules,'starting','');assert.ok(availableStartingFeats(c,rules,'starting').some(f=>f.id==='toughness'));
});

test('suggestions require feat chains and eligibility at the slot level',()=>{
 const c=make();c.builder.baseScores.dex=15;
 assert.ok(!availableStartingFeats(c,rules,'starting').some(f=>f.id==='acrobatic-steps'));
 selectStartingFeat(c,rules,'starting','nimble-moves');
 assert.ok(availableStartingFeats(c,rules,'human').some(f=>f.id==='acrobatic-steps'));
 c.builder.classOrder=Array(6).fill('fighter');c.builder.targetLevel=6;
 assert.ok(availableStartingFeats(c,rules,'level-5').some(f=>f.id==='acrobatic-steps'));
 assert.ok(!availableStartingFeats(c,rules,'human').some(f=>f.id==='lunge'));
 c.feats=[];
 assert.ok(!availableStartingFeats(c,rules,'level-5').some(f=>f.id==='acrobatic-steps'));
});
