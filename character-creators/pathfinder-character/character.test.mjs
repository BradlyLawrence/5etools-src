import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,ARRAYS,chooseArray,assignArrayScore,newCharacter,prepare,calculate,materialize,validateBuilder} from './character.mjs';
import {parseCharacter,exportCharacter,saveCharacter,readRoster} from './roster.mjs';
test('race changes and level bonuses leave original scores intact',()=>{
 const c=newCharacter();c.builder.baseScores.str=16;c.builder.raceId='dragonborn';
 assert.equal(calculate(c).abilities.str,18);
 c.builder.raceId='halflings';assert.equal(calculate(c).abilities.str,14);
 c.builder.raceId='humans';c.builder.flexAbility='str';
 c.builder.classOrder=Array(4).fill('fighter');c.builder.increases=['str'];
 assert.equal(calculate(c).abilities.str,19);assert.equal(c.builder.baseScores.str,16);
});
test('standard multiclassing sums each class table, not target level',()=>{
 const c=newCharacter();c.builder.targetLevel=6;c.builder.classOrder=['fighter','fighter','fighter','barbarian','barbarian','ironwright'];
 const r=calculate(c);assert.deepEqual(r.classes,{fighter:3,barbarian:2,ironwright:1});assert.equal(r.level,6);assert.equal(r.bab,6);assert.deepEqual(r.saves,{fortitude:8,reflex:1,will:1});
 c.builder.classOrder=['rogue','rogue','fighter'];assert.equal(calculate(c).bab,2);assert.ok(calculate(c).issues.some(s=>s.includes('Assign 6')));
 c.builder.targetLevel=1;assert.equal(calculate(c).level,3);assert.ok(calculate(c).issues.some(s=>s.includes('Assign 1')));
});
test('point buy follows the PF1 nonlinear cost table',()=>{
 const c=newCharacter();c.builder.baseScores={str:18,dex:14,con:12,int:10,wis:8,cha:7};
 assert.equal(calculate(c).spent,18);assert.ok(calculate(c).issues.some(s=>s.includes('exceed')));
 c.builder.budget=20;assert.ok(calculate(c).issues.some(s=>s.includes('2 point-buy')));
 c.builder.baseScores.str=19;assert.ok(Number.isNaN(calculate(c).spent));
});
test('existing character data survives migration and browser save round trips',()=>{
 const old={name:'Existing',classes:{fighter:3,barbarian:2,ironwright:1},abilities:{str:16,dex:12,con:14,int:10,wis:10,cha:8},feats:[{featId:'power-attack'}],techEquipment:{items:[{reservoir:2}]},notes:{legacy:'preserved'}};
 const c=prepare(old);assert.equal(c.builder.orderConfirmed,false);assert.deepEqual(c.abilities,old.abilities);
 const saved=materialize(c);assert.deepEqual(saved.feats,old.feats);assert.deepEqual(saved.techEquipment,old.techEquipment);assert.deepEqual(saved.notes,old.notes);
 assert.deepEqual(parseCharacter(exportCharacter(saved)),saved);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 saveCharacter(storage,saved,'existing');assert.deepEqual(readRoster(storage).characters[0].character,saved);
});
test('unfinished allocation is saveable; malformed builder fields are rejected',()=>{
 const c=newCharacter();c.builder.targetLevel=6;c.builder.classOrder=['fighter','','rogue'];
 assert.doesNotThrow(()=>parseCharacter(materialize(c)));
 c.builder.targetLevel=21;assert.throws(()=>validateBuilder(c.builder));
 c.builder.targetLevel=6;c.builder.baseScores.str=1.5;assert.throws(()=>validateBuilder(c.builder));
});

test('all eleven fixed arrays preserve their exact scores through assignment and saving',()=>{
 assert.equal(Object.keys(ARRAYS).length,11);
 for(const [id,scores] of Object.entries(ARRAYS)){
  const c=newCharacter();c.builder.method='array';chooseArray(c,id);
  assert.ok(Object.values(c.builder.baseScores).every(x=>x===null));
  assert.doesNotThrow(()=>parseCharacter(exportCharacter(materialize(c))));
  [...ABILITIES].reverse().forEach((a,i)=>assignArrayScore(c,a,scores[i]));
  assert.deepEqual(Object.values(c.builder.baseScores).sort((a,b)=>a-b),[...scores].sort((a,b)=>a-b));
  assert.equal(c.builder.baseScores.cha,scores[0]);
  assert.doesNotThrow(()=>parseCharacter(exportCharacter(materialize(c))));
  assert.ok(!calculate(c).issues.some(s=>s.includes('point-buy')));
 }
});
test('fighter 1 and ironwright 1 have standard base saves 4/0/0',()=>{
 const c=newCharacter();c.builder.targetLevel=2;c.builder.classOrder=['fighter','ironwright'];
 assert.deepEqual(calculate(c).saves,{fortitude:4,reflex:0,will:0});
});

test('standard BAB rounds each class separately',()=>{
 const c=newCharacter();c.builder.classOrder=['rogue','cleric'];
 assert.equal(calculate(c).bab,0);
 assert.deepEqual(calculate(c).saves,{fortitude:2,reflex:2,will:2});
});

test('array scores are allocated independently and clearing returns a score to the pool',()=>{
 const c=newCharacter();c.builder.method='array';chooseArray(c,'25-3');
 assignArrayScore(c,'str',14);assignArrayScore(c,'dex',14);assignArrayScore(c,'cha',16);
 assert.equal(c.builder.baseScores.str,14);assert.equal(c.builder.baseScores.dex,14);
 assert.throws(()=>assignArrayScore(c,'con',14));assert.equal(c.builder.baseScores.con,null);
 assignArrayScore(c,'cha',null);assignArrayScore(c,'int',16);
 assert.equal(c.builder.baseScores.str,14);assert.equal(c.builder.baseScores.dex,14);
 assert.equal(c.builder.baseScores.int,16);assert.equal(c.builder.baseScores.cha,null);
 assert.equal(ARRAYS['10-3'],undefined);
});
