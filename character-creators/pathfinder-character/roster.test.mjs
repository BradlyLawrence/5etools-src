import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCharacter,saveCharacter,readRoster,exportCharacter,KEY} from './roster.mjs';
const character={name:'Test adventurer',classes:{fighter:1},feats:[],techEquipment:{items:[{reservoir:2}]}};
function memory(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
test('workshop import and backup preserve all character fields',()=>{
 const c=parseCharacter({revision:1,character});assert.deepEqual(c,character);
 assert.deepEqual(parseCharacter(exportCharacter(c)),character);
});
test('separate copies, updates and reloads do not touch other tools',()=>{
 const s=memory();s.setItem('character-creators/lotr-rpg/roster','unchanged');
 saveCharacter(s,character,'one');saveCharacter(s,character,'two');
 saveCharacter(s,{...character,name:'Updated'},'one');
 const r=readRoster(s);assert.equal(r.characters.length,2);assert.equal(r.characters[0].character.name,'Updated');
 assert.equal(s.getItem('character-creators/lotr-rpg/roster'),'unchanged');
});
test('invalid or foreign files and storage failures never silently replace saves',()=>{
 assert.throws(()=>parseCharacter({fileType:'5etools-char-lotr',character}));
 assert.throws(()=>parseCharacter({fileType:'pf1-character',schemaVersion:2,character}));
 assert.throws(()=>parseCharacter({name:'Rules catalogue'}));
 assert.throws(()=>parseCharacter({...character,classes:{fighter:21}}));
 const s=memory();s.setItem(KEY,'broken');assert.throws(()=>saveCharacter(s,character));assert.equal(s.getItem(KEY),'broken');
 assert.throws(()=>saveCharacter({getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}},character),/Quota/);
});
