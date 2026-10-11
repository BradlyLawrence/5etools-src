import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,materialize,calculate} from './character.mjs';
import {equipmentSheet,equip} from './equipment.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
import {setSpell,spellcasting} from './engine/spellcasting.mjs';
import {renderFeatReview} from './feats.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
for(const order of [['fighter','fighter'],['rogue','rogue'],['wizard','wizard','sorcerer','sorcerer'],['ironwright','ironwright'],['cleric','cleric'],['alchemist','alchemist']])test(order.join('/')+' saves, reloads and exports identical calculated statistics',()=>{
 const c=newCharacter();Object.assign(c.builder,{classOrder:order,targetLevel:order.length,raceId:'humans',flexAbility:'str',method:'manual',baseScores:{str:16,dex:14,con:14,int:16,wis:16,cha:16}});
 if(order.includes('wizard')){setSpell(c,calculate(c),'wizard','book',1,0,'magic-missile');setSpell(c,calculate(c),'wizard','prepared',1,0,'magic-missile');}
 equip(c,rules,'weaponId',order.includes('ironwright')?'steam-axe':'dagger');
 const original=materialize(c),memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 saveCharacter(storage,original,'test');const restored=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));
 assert.deepEqual(restored,original);
 assert.deepEqual(equipmentSheet(restored,rules).stats,equipmentSheet(original,rules).stats);
 assert.deepEqual(equipmentSheet(restored,rules).hitPoints,equipmentSheet(original,rules).hitPoints);
 assert.deepEqual(spellcasting(restored,calculate(restored)).map(x=>x.rows.map(r=>[r.level,r.slots,r.prepared])),spellcasting(original,calculate(original)).map(x=>x.rows.map(r=>[r.level,r.slots,r.prepared])));
});
test('review identifies empty feat slots and prerequisites invalidated by edits',()=>{
 const c=newCharacter();c.builder.classOrder=['fighter'];c.builder.targetLevel=1;
 assert.match(renderFeatReview(c,rules),/choose a feat/);
 c.feats=[{featId:'lunge',creatorSlot:'starting'}];
 assert.match(renderFeatReview(c,rules),/prerequisites/);
});
