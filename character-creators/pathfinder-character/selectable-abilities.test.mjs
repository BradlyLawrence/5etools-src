import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate} from './character.mjs';
import {setClassChoice,renderClassChoices} from './class-choices.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {startingSlots,selectStartingFeat} from './feats.mjs';
import {calculateSkills} from './skills.mjs';
import {selectedAbilities,selectableSpecs} from './engine/selectable-abilities.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(cls,n){const c=newCharacter();c.builder.classOrder=Array(n).fill(cls);c.builder.targetLevel=n;return c;}
const choose=(c,id,value)=>setClassChoice(c,rules,id,value);
test('talents use rogue levels, advanced talents unlock at 10, prerequisites must precede the slot',()=>{
 const c=make('rogue',2);assert.throws(()=>choose(c,'rogue-ability-2','improved-evasion'));assert.throws(()=>choose(c,'rogue-ability-2','major-magic'));choose(c,'rogue-ability-2','minor-magic');
 c.builder.classOrder.push('fighter','fighter');assert.ok(!renderClassChoices(c,rules).includes('classChoice.rogue-ability-4'));
 c.builder.classOrder=Array(4).fill('rogue');c.builder.baseScores.int=12;choose(c,'rogue-ability-4','major-magic');assert.throws(()=>choose(c,'rogue-ability-4','minor-magic'));
 c.builder.classOrder=Array(10).fill('rogue');choose(c,'rogue-ability-10','dispelling-attack');choose(c,'rogue-ability-2','fast-stealth');assert.ok(!selectedAbilities({...c,classes:calculate(c).classes}).some(x=>x.id==='dispelling-attack'));
});
test('rogue feat talents create earned slots and their feats affect attacks',()=>{
 const c=make('rogue',2);choose(c,'rogue-ability-2','weapon-training');assert.ok(startingSlots(c).some(s=>s.id==='rogue-talent-feat-2'));
 selectStartingFeat(c,rules,'rogue-talent-feat-2','weapon-focus','dagger');equip(c,rules,'weaponId','dagger');const before=equipmentSheet(c,rules).stats.attack.total;
 choose(c,'rogue-ability-2','fast-stealth');assert.equal(equipmentSheet(c,rules).stats.attack.total,before-1);
});
test('rage changes physical statistics, HP and saves; conditional Superstition does not stack morale Will bonuses',()=>{
 const c=make('barbarian',8);equip(c,rules,'weaponId','greataxe');c.builder.baseScores.str=14;c.builder.baseScores.con=14;
 choose(c,'barbarian-ability-2','superstition');choose(c,'barbarian-ability-4','raging-climber');const before=equipmentSheet(c,rules);choose(c,'barbarian-raging','on');const after=equipmentSheet(c,rules);
 assert.equal(after.stats.attack.total,before.stats.attack.total+2);assert.equal(after.stats.damage.total,before.stats.damage.total+3);assert.equal(after.stats.ac.total,before.stats.ac.total-2);
 assert.equal(after.hitPoints.total,before.hitPoints.total+16);assert.equal(after.stats['skill.climb'].total,before.stats['skill.climb'].total+10);
 const magic=after.sheetRows.find(x=>x.id.endsWith('|superstition'));assert.equal(magic.stats['save.will'].total,before.stats['save.will'].total+4);
 choose(c,'barbarian-raging','off');assert.equal(equipmentSheet(c,rules).stats.attack.total,before.stats.attack.total);
});
test('repeatable powers cap at three and disappear as levels are removed',()=>{
 const c=make('barbarian',8);for(const n of [2,4,6])choose(c,'barbarian-ability-'+n,'swift-foot');assert.throws(()=>choose(c,'barbarian-ability-8','swift-foot'));
 choose(c,'barbarian-raging','on');assert.equal(equipmentSheet(c,rules).stats['speed.bonus'].total,25);
 c.builder.classOrder=Array(2).fill('barbarian');assert.equal(equipmentSheet(c,rules).stats['speed.bonus'].total,15);
});
test('mutagen and feral discovery affect the sheet without reducing permanent skill-rank budget',()=>{
 const c=make('alchemist',2);c.builder.baseScores.int=16;choose(c,'alchemist-ability-2','feral-mutagen');const budget=calculateSkills(c,calculate(c)).normal;const before=equipmentSheet(c,rules);
 choose(c,'alchemist-mutagen','str');const after=equipmentSheet(c,rules);assert.equal(after.effectiveAbilities.str,before.effectiveAbilities.str+4);assert.equal(after.effectiveAbilities.int,14);assert.equal(after.stats.ac.total,before.stats.ac.total+2);assert.equal(after.stats['skill.intimidate'].total,before.stats['skill.intimidate'].total+2);
 assert.equal(calculateSkills(c,calculate(c)).normal,budget);assert.equal(after.classAbilities.naturalAttacks.length,2);assert.equal(after.classAbilities.naturalAttacks[0].dice,'1d6');
});
test('discovery chains, bomb damage types and grand discoveries respect class levels',()=>{
 const c=make('alchemist',8);choose(c,'alchemist-ability-2','precise-bombs');choose(c,'alchemist-ability-4','frost-bomb');assert.throws(()=>choose(c,'alchemist-ability-6','grand-mutagen'));choose(c,'alchemist-ability-8','force-bomb');choose(c,'alchemist-bomb','force-bomb');c.builder.baseScores.int=16;
 const bombs=equipmentSheet(c,rules).classAbilities.bombs;assert.equal(bombs.damage,'4d4');assert.equal(bombs.energy,'force');assert.equal(bombs.dc,17);assert.equal(bombs.excludedSquares,3);
 c.builder.classOrder=Array(20).fill('alchemist');assert.throws(()=>choose(c,'alchemist-ability-20-grand','true-mutagen'));choose(c,'alchemist-ability-12','greater-mutagen');choose(c,'alchemist-ability-16','grand-mutagen');choose(c,'alchemist-ability-20-grand','true-mutagen');choose(c,'alchemist-mutagen','dex');const s=equipmentSheet(c,rules);assert.equal(s.effectiveAbilities.str,18);assert.equal(s.effectiveAbilities.con,18);
});
test('mercies enforce chains and all selected mercies accompany lay on hands after save/import',()=>{
 const c=make('paladin',9);assert.throws(()=>choose(c,'paladin-ability-9','exhausted'));choose(c,'paladin-ability-3','fatigued');choose(c,'paladin-ability-6','diseased');choose(c,'paladin-ability-9','exhausted');
 const s=equipmentSheet(parseCharacter(exportCharacter(c)),rules).classAbilities.layOnHands;assert.equal(s.dice,'4d6');assert.deepEqual(s.mercies.map(x=>x.name),['Fatigued','Diseased','Exhausted']);
 c.builder.classOrder=Array(6).fill('paladin');assert.equal(equipmentSheet(c,rules).classAbilities.layOnHands.mercies.length,2);
});
test('Awakened Intellect is permanent and increases the skill budget; unrelated classes show no selectors',()=>{
 const c=make('alchemist',20);const old=calculateSkills(c,calculate(c)).normal;choose(c,'alchemist-ability-20-grand','awakened-intellect');assert.equal(calculate(c).abilities.int,12);assert.equal(calculateSkills(c,calculate(c)).normal,old+20);
 assert.equal(selectableSpecs({...make('fighter',2),classes:{fighter:2}}).length,0);
});
test('magic talents expose the correct spell levels and calculated spell-like ability details',()=>{
 const c=make('rogue',4);c.builder.baseScores.int=14;choose(c,'rogue-ability-2','minor-magic');choose(c,'rogue-ability-4','major-magic');
 choose(c,'rogue-ability-2-spell','detect-magic');choose(c,'rogue-ability-4-spell','magic-missile');assert.throws(()=>choose(c,'rogue-ability-2-spell','magic-missile'));
 const magic=equipmentSheet(c,rules).classAbilities.magic;assert.equal(magic[0].dc,12);assert.equal(magic[1].dc,13);assert.equal(magic[1].casterLevel,4);assert.equal(magic[1].uses,2);
});
