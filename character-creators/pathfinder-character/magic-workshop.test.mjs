import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {priceMagicItem,validateMagicItem} from './engine/magic-items.mjs';
import {readDesigns,saveDesign,parseDesign,exportDesign,KEY} from '../pathfinder/crafting/storage.mjs';
import {addCraftedItem,craftedAction,renderCrafted} from './crafted-items.mjs';
import {newCharacter} from './character.mjs';import {equip,equipmentSheet} from './equipment.mjs';import {parseCharacter,exportCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const effect=(kind,value,more={})=>({kind,value,target:'',detail:'',casterLevel:1,daily:0,components:0,duration:'hours',...more});
const design=(effects=[effect('deflection',1)],more={})=>({id:'design-one',name:'Test item',description:'A crafted item.',slot:'ring1',baseId:'',basePrice:0,weight:0,casterLevel:1,missing:0,accelerated:false,requirements:'',priceOverride:null,effects,...more});
const make=()=>{const c=newCharacter();c.builder.classOrder=['fighter'];c.builder.targetLevel=1;return c;};
const use=(c,d,id)=>{addCraftedItem(c,d,id);craftedAction(c,rules,id,'equip');};
test('known formula prices separate base and materials; time, components and zero-level spells',()=>{
 let p=priceMagicItem(design([effect('weapon',1)],{slot:'weapon',baseId:'longsword',basePrice:15}));assert.equal(p.market,2315);assert.equal(p.materials,1315);assert.equal(p.hours,16);
 p=priceMagicItem(design([effect('scroll',0)],{slot:'slotless'}));assert.equal(p.market,12.5);assert.equal(p.materials,6.25);assert.equal(p.hours,2);
 p=priceMagicItem(design([effect('wand',4,{casterLevel:7,components:250})],{slot:'slotless'}));assert.equal(p.market,33500);assert.equal(p.materials,23000);
 p=priceMagicItem(design([effect('continuous',1,{duration:'rounds',daily:1})],{casterLevel:3,missing:2,accelerated:true}));assert.equal(p.market,1600);assert.equal(p.dc,23);assert.equal(p.hours,8);
 assert.equal(priceMagicItem(design([effect('bonusSpell',1)],{slot:'slotless'})).market,1000);
});
test('different body-slot powers have surcharge; slotless doubles; overrides remain explicit',()=>{
 const d=design([effect('deflection',2),effect('resistance',1)]);assert.equal(priceMagicItem(d).market,9500);d.slot='slotless';assert.equal(priceMagicItem(d).market,18000);d.priceOverride=20000;assert.equal(priceMagicItem(d).materials,10000);assert.equal(priceMagicItem(d).estimate,18000);
 assert.throws(()=>priceMagicItem(design([effect('potion',4)],{slot:'slotless'})));assert.throws(()=>priceMagicItem(design([effect('scroll',1)],{slot:'slotless',missing:1})));assert.throws(()=>validateMagicItem(design([effect('custom',NaN)])));
});
test('private saves and JSON roundtrip do not modify other tools; corrupt storage stays untouched',()=>{
 const map=new Map([['lotr','unchanged']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const d=design();saveDesign(storage,d);assert.deepEqual(readDesigns(storage),[d]);assert.deepEqual(parseDesign(exportDesign(d)),d);assert.equal(map.get('lotr'),'unchanged');assert.throws(()=>parseDesign({fileType:'pf1-character',schemaVersion:1,item:d}));map.set(KEY,'bad');assert.throws(()=>saveDesign(storage,d));assert.equal(map.get(KEY),'bad');
});
test('character copies are independent, preserve weapon feats and export with the character',()=>{
 const c=make();equip(c,rules,'weaponId','longsword');const baseline=equipmentSheet(c,rules);const d=design([effect('weapon',2)],{slot:'weapon',baseId:'longsword'});use(c,d,'sword');d.effects[0].value=5;
 let s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,baseline.stats.attack.total+2);assert.equal(s.stats.damage.total,baseline.stats.damage.total+2);
 c.feats=[{featId:'weapon-focus',weaponId:'longsword'}];s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,baseline.stats.attack.total+3);
 assert.deepEqual(parseCharacter(exportCharacter(c)).craftedItems,c.craftedItems);equip(c,rules,'weaponId','longsword');assert.equal(c.craftedItems[0].equipped,false);assert.equal(equipmentSheet(c,rules).stats.damage.total,baseline.stats.damage.total);
});
test('armour enhancement and masterwork penalty apply; same-slot replacement and typed bonuses do not stack',()=>{
 const c=make();equip(c,rules,'armorId','leather');const base=equipmentSheet(c,rules).stats.ac.total;
 use(c,design([effect('armor',2)],{slot:'armor',baseId:'leather'}),'armour');assert.equal(equipmentSheet(c,rules).stats.ac.total,base+2);
 use(c,design([effect('deflection',1)]),'ring-one');use(c,design([effect('deflection',3)],{slot:'ring2'}),'ring-two');assert.equal(equipmentSheet(c,rules).stats.ac.total,base+5);
 use(c,design([effect('resistance',1)]),'new-ring');assert.equal(c.craftedItems.find(i=>i.instanceId==='ring-one').equipped,false);assert.equal(equipmentSheet(c,rules).stats['save.will'].total,1);
});
test('ability and skill bonuses calculate while active, escape descriptions, and never mutate rules',()=>{
 const c=make(),before=JSON.stringify(rules),base=equipmentSheet(c,rules);use(c,design([effect('ability',2,{target:'str'}),effect('skill',3,{target:'perception'})],{slot:'belt',description:'<img src=x onerror=alert(1)>'}),'belt');const s=equipmentSheet(c,rules);assert.equal(s.effectiveAbilities.str,base.effectiveAbilities.str+2);assert.equal(s.stats['skill.perception'].total,base.stats['skill.perception'].total+3);assert.match(renderCrafted(c),/&lt;img/);assert.equal(JSON.stringify(rules),before);craftedAction(c,rules,'belt','equip');assert.equal(equipmentSheet(c,rules).effectiveAbilities.str,base.effectiveAbilities.str);
});

test('a stale character editor cannot overwrite a workshop addition',()=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const c=make();saveCharacter(storage,c,'one');const snapshot=JSON.stringify(c),copy=structuredClone(c);addCraftedItem(copy,design(),'added');saveCharacter(storage,copy,'one');assert.throws(()=>saveCharacter(storage,c,'one',snapshot),/another tab/);assert.equal(readRoster(storage).characters[0].character.craftedItems.length,1);});
