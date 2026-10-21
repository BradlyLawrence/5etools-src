import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {setClassChoice} from './class-choices.mjs';
import {equipmentSheet} from './equipment.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('combat sidebar owns stance and rage toggles, updates numbers and preserves saved state',()=>{
 let c=sheetExample(rules);const html=renderCombatSheet(c,rules),aside=html.slice(html.indexOf('<aside'),html.indexOf('</aside>'));
 assert.match(aside,/equipment.fightingDefensively/);assert.match(aside,/combatBuff.barbarian-raging/);assert.equal((html.match(/equipment.fightingDefensively/g)??[]).length,1);
 const before=equipmentSheet(c,rules);setClassChoice(c,rules,'barbarian-raging','on');c.equipment.fightingDefensively=true;const after=equipmentSheet(c,rules);
 assert.equal(after.stats.attack.total,before.stats.attack.total-2);assert.match(renderCombatSheet(c,rules),/data-active-value="on" checked/);
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.equal(c.builder.classOptions['barbarian-raging'],'on');assert.equal(c.equipment.fightingDefensively,true);assert.equal(equipmentSheet(c,rules).stats.attack.total,after.stats.attack.total);
});

test('total defence grants dodge AC, overrides defensive fighting, and survives saved JSON',()=>{
 for(const ranks of [0,3]){
  let c=sheetExample(rules);c.builder.skills.acrobatics={normal:ranks,background:0};
  const base=equipmentSheet(c,rules);c.equipment.totalDefense=true;c.equipment.fightingDefensively=true;
  const defended=equipmentSheet(c,rules);
  assert.equal(defended.stats.ac.total-base.stats.ac.total,ranks>=3?6:4);
  assert.equal(defended.stats.attack.total,base.stats.attack.total);
  assert.match(renderCombatSheet(c,rules),/equipment.totalDefense" checked/);
  const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  saveCharacter(storage,c,'defence');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));
  assert.equal(c.equipment.totalDefense,true);assert.equal(equipmentSheet(c,rules).stats.ac.total,defended.stats.ac.total);
 }
});

test('Power Attack requires the feat, scales by grip, clamps to BAB and survives JSON',()=>{
 let c=sheetExample(rules);c.equipment.powerAttack=true;
 assert.doesNotMatch(renderCombatSheet(c,rules),/data-field="equipment.powerAttack"/);
 c.feats.push({featId:'power-attack',creatorSlot:'starting'});
 for(const [mode,multiplier] of [['standard',2],['two-handed',3],['off-hand',1]]){
  c.equipment.damageMode=mode;c.equipment.powerAttack=false;const base=equipmentSheet(c,rules);
  c.equipment.powerAttack=true;c.equipment.powerAttackPenalty=2;const active=equipmentSheet(c,rules);
  assert.equal(active.stats.attack.total,base.stats.attack.total-2);
  assert.equal(active.stats.damage.total,base.stats.damage.total+2*multiplier);
  assert.equal(active.stats['combatManeuver.check'].total,base.stats['combatManeuver.check'].total-2);
  assert.equal(active.stats['maneuver.trip.check'].total,base.stats['maneuver.trip.check'].total-2);
 }
 c.equipment.powerAttack=false;const beforeCap=equipmentSheet(c,rules);c.equipment.powerAttack=true;c.equipment.powerAttackPenalty=99;assert.equal(equipmentSheet(c,rules).stats.attack.total,beforeCap.stats.attack.total-3);
 c.equipment.powerAttackPenalty=1;
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 saveCharacter(storage,c,'power');const restored=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));
 assert.equal(restored.equipment.powerAttackPenalty,1);assert.equal(equipmentSheet(restored,rules).stats.damage.total,equipmentSheet(c,rules).stats.damage.total);
});

test('Furious Focus removes only first-attack penalty with eligible grip and persists',()=>{
 const c=sheetExample(rules);
 c.feats.push({featId:'power-attack',creatorSlot:'starting'},{featId:'furious-focus',creatorSlot:'level-3'});
 c.equipment.damageMode='two-handed';c.equipment.powerAttack=true;c.equipment.powerAttackPenalty=2;
 const active=equipmentSheet(c,rules);
 assert.equal(active.powerAttack.furiousFocus,true);
 assert.equal(active.powerAttack.firstAttack,active.stats.attack.total+2);
 assert.equal(active.powerAttack.laterAttack,active.stats.attack.total);
 assert.equal(active.powerAttack.iterativeAttacks[1],active.stats.attack.total-5);
 const html=renderCombatSheet(c,rules);
 assert.match(html,/First attack/);assert.ok(html.indexOf('combatBuff.barbarian-raging')<html.indexOf('equipment.fightingDefensively'));
 assert.ok(html.indexOf('equipment.powerAttack')<html.indexOf('equipment.totalDefense'));
 const restored=parseCharacter(exportCharacter(c));assert.deepEqual(equipmentSheet(restored,rules).powerAttack,active.powerAttack);
 c.equipment.damageMode='off-hand';assert.equal(equipmentSheet(c,rules).powerAttack.furiousFocus,false);
 c.equipment.damageMode='two-handed';c.equipment.powerAttack=false;assert.equal(equipmentSheet(c,rules).powerAttack,undefined);
});
