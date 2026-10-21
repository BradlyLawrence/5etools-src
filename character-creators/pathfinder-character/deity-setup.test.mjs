import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {setDeityField as set,changeSacredConcern,deityState,deityIssues,renderDeitySetup,renderDeitySummary} from './deity-setup.mjs';
import {equipmentSheet} from './equipment.mjs';
import {setClassChoice,renderClassChoices} from './class-choices.mjs';
import {parseCharacter,exportCharacter,saveCharacter,readRoster} from './roster.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const make=(...classes)=>{const c=newCharacter();c.builder.classOrder=classes;c.builder.targetLevel=classes.length;c.builder.baseScores.wis=16;return c;};
function setup(c){set(c,rules,'name','Lady of the Well');['protection','travel','water'].forEach((d,i)=>set(c,rules,'domain.'+i,d));set(c,rules,'weapon','longsword');}
test('cleric gains only two domains; replacing one removes effects and spell eligibility',()=>{
 const c=make('cleric');setup(c);const before=equipmentSheet(c,rules);
 set(c,rules,'active.cleric-domain-1','protection');set(c,rules,'active.cleric-domain-2','water');
 let after=equipmentSheet(c,rules);assert.equal(after.stats['save.will'].total,before.stats['save.will'].total+1);assert.equal(after.equipment.speedFt,before.equipment.speedFt);
 const spells=spellcasting(c,calculate(c))[0];assert.equal(spells.rows.find(r=>r.level===1).specialSlots,1);
 assert.throws(()=>set(c,rules,'active.cleric-domain-2','protection'));
 assert.throws(()=>setClassChoice(c,rules,'cleric-domain-2','fire'));
 set(c,rules,'domain.0','fire');after=equipmentSheet(c,rules);assert.equal(after.stats['save.will'].total,before.stats['save.will'].total);assert.equal(c.builder.classOptions['cleric-domain-1'],undefined);
 assert.throws(()=>set(c,rules,'domain.0','travel'));
});
test('inquisitor mission follows its beneficial domain, which grants no domain slots',()=>{
 const c=make('inquisitor');setup(c);set(c,rules,'active.inquisitor-domain','travel');set(c,rules,'mission.travel','Keep roads free.');
 assert.ok(spellcasting(c,calculate(c))[0].rows.every(r=>!r.specialSlots));
 set(c,rules,'active.inquisitor-domain','water');assert.doesNotMatch(renderDeitySummary(c),/Keep roads free/);assert.ok(deityIssues(c).some(x=>x.includes('mission')));
 set(c,rules,'active.inquisitor-domain','travel');assert.match(renderDeitySummary(c),/Keep roads free/);
});
test('paladin oaths and unlimited optional concerns survive roster and JSON without altering stats',()=>{
 const c=make('paladin');setup(c);const before=equipmentSheet(c,rules).stats;
 for(const d of c.deity.domains)set(c,rules,'oath.'+d,'Protect <people> & promises.');
 for(let i=0;i<35;i++){changeSacredConcern(c,'add');set(c,rules,'concern.'+i,'Concern '+i);}
 changeSacredConcern(c,'remove',0);assert.equal(c.deity.sacredConcerns[0],'Concern 1');
 assert.deepEqual(equipmentSheet(c,rules).stats,before);assert.deepEqual(deityIssues(c),[]);
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 saveCharacter(storage,c,'deity-test');const restored=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(restored,c);
 assert.match(renderDeitySummary(c),/Protect &lt;people&gt; &amp; promises/);assert.equal((renderDeitySetup(c,rules).match(/data-sacred-remove=/g)??[]).length,34);
 while(c.deity.sacredConcerns.length)changeSacredConcern(c,'remove',0);assert.deepEqual(deityIssues(c),[]);
});
test('legacy domains and weapon retained; multiclass uses one deity, dormant oaths remain saved',()=>{
 const c=make('cleric','inquisitor','paladin');c.builder.classOptions={'cleric-domain-1':'protection','cleric-domain-2':'travel','inquisitor-domain':'water'};c.deity={favoredWeaponId:'rapier'};c.builder.identity.deity='Existing god';
 assert.deepEqual(deityState(c).domains,['protection','travel','water']);set(c,rules,'oath.water','Guard the river.');
 assert.equal(c.deity.favoredWeaponId,'rapier');assert.equal(c.builder.classOptions['cleric-domain-1'],'protection');
 assert.equal((renderClassChoices(c,rules).match(/<h3>Deity &amp; faith|<h3>Deity & faith/g)??[]).length,1);
 c.builder.classOrder=['fighter'];assert.equal(renderDeitySetup(c,rules),'');assert.deepEqual(deityIssues(c),[]);assert.equal(c.deity.oaths.water,'Guard the river.');
});
test('import rejects malformed concerns, duplicate domains and active domains outside deity',()=>{
 const c=make('cleric');setup(c);
 for(const mutate of [x=>x.deity.sacredConcerns=[{}],x=>x.deity.domains=['water','water'],x=>x.builder.classOptions={'cleric-domain-1':'fire'},x=>x.deity.oaths={water:3}]){const x=structuredClone(c);mutate(x);assert.throws(()=>parseCharacter(x));}
});
