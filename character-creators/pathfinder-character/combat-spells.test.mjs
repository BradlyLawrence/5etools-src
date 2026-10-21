import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {calculate} from './character.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {renderClassicSheet} from './classic-sheet.mjs';
import {setSpellMetamagic,castSpell} from './engine/spell-use.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('Classic and Combat display one shared spent pool and selected metamagic',()=>{
 let c=sheetExample(rules);c=setSpellMetamagic(c,calculate(c),'sorcerer','shield',['extend-spell']);c=castSpell(c,calculate(c),'sorcerer','shield');const before=structuredClone(c);
 for(const render of [renderCombatSheet,renderClassicSheet]){const html=render(c,rules);assert.match(html,/6 available \/ 7/);assert.match(html,/14 minutes/);assert.match(html,/data-metamagic="extend-spell" checked/);assert.match(html,/1 used/);assert.doesNotMatch(html,/data-metamagic="quicken-spell"/);}
 assert.deepEqual(c,before);
});
test('unavailable metamagic casts are visibly disabled and stale selections can be cleared',()=>{
 let c=sheetExample(rules);c=setSpellMetamagic(c,calculate(c),'sorcerer','fireball',['empower-spell']);
 assert.match(renderCombatSheet(c,rules),/data-spell-cast="sorcerer\|fireball" disabled/);
 c.feats=c.feats.filter(x=>x.featId!=='empower-spell');assert.match(renderCombatSheet(c,rules),/data-spell-clear="sorcerer\|fireball"/);
});
