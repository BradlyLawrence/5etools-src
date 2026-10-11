import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,validateBuilder} from './character.mjs';
import {equipmentSheet} from './equipment.mjs';
import {ANCESTRIES} from './engine/racial.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(){const c=newCharacter();Object.assign(c.builder,{raceId:'dragonborn',draconicAncestry:'red',classOrder:['fighter'],baseScores:{str:16,dex:12,con:14,int:10,wis:10,cha:10}});return c;}
test('every ancestry determines energy and shape; breath scales and saves round down',()=>{
 const c=make();for(const [id,a]of Object.entries(ANCESTRIES)){c.builder.draconicAncestry=id;const d=equipmentSheet(c,rules).dragonborn;assert.equal(d.resistance.energy,a.energy);assert.equal(d.breath.energy,a.energy);assert.equal(d.breath.shapes[0],a.shape==='cone'?'15-foot cone':'30-foot line');}
 c.builder.classOrder=Array(5).fill('fighter');const d=equipmentSheet(c,rules).dragonborn;assert.equal(d.breath.damage,'2d6');assert.equal(d.breath.dc,14);
});
test('alternatives remove replaced traits and apply AC, Perception and claw stats',()=>{
 const c=make(),base=equipmentSheet(c,rules);c.builder.racialAlternates=['armoured-scales','keen-senses'];let s=equipmentSheet(c,rules);
 assert.equal(s.stats.ac.total,base.stats.ac.total+1);assert.equal(s.stats['skill.perception'].total,base.stats['skill.perception'].total+2);assert.equal(s.dragonborn.breath,null);assert.equal(s.dragonborn.resistance,null);assert.equal(s.dragonborn.darkvisionFt,60);
 c.builder.racialAlternates=['draconic-claws'];s=equipmentSheet(c,rules);assert.equal(s.dragonborn.claws.attack,5);assert.equal(s.dragonborn.claws.damageBonus,4);assert.equal(s.dragonborn.breath,null);assert.ok(s.dragonborn.resistance);
 c.builder.racialAlternates=['versatile-breath'];s=equipmentSheet(c,rules);assert.equal(s.dragonborn.breath.shapes.length,2);assert.equal(s.dragonborn.resistance,null);
 for(const ids of [['armoured-scales','draconic-claws'],['versatile-breath','armoured-scales'],['versatile-breath','draconic-claws'],['keen-senses','versatile-breath']]){c.builder.racialAlternates=ids;assert.throws(()=>validateBuilder(c.builder));}
});
