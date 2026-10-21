import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {addEnhancedBase,purchasedEffects,renderEnchantedChoice} from './enchanted-item-picker.mjs';
import {inventoryRows,inventoryAction} from './inventory.mjs';
import {equipmentSheet,techEvent} from './equipment.mjs';
import {renderCombatEquipment} from './combat-equipment.mjs';
import {renderEquipment} from './equipment-ui.mjs';
import {priceMagicItem,validateMagicItem} from './engine/magic-items.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('purchased Keen weapon keeps its identity, attack bonus, critical range and ordinary copy',()=>{
 let c=sheetExample(rules);inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');const plain=equipmentSheet(c,rules);
 c=addEnhancedBase(c,rules,'dagger',1,'keen');const id=c.craftedItems.at(-1).instanceId;
 inventoryAction(c,rules,'equip',id);const keen=equipmentSheet(c,rules);
 assert.equal(keen.equipment.critical[0].threatMin,17);assert.equal(keen.stats.attack.total,plain.stats.attack.total+1);assert.equal(keen.stats.damage.total,plain.stats.damage.total+1);
 assert.equal(priceMagicItem(c.craftedItems.at(-1).design).market,8302);
 assert.equal(inventoryRows(c).find(x=>x.key==='dagger').quantity,1);assert.match(renderEquipment(c,rules),/\+1 Keen Dagger/);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));
 assert.equal(c.craftedItems.at(-1).instanceId,id);assert.equal(equipmentSheet(c,rules).equipment.critical[0].threatMin,17);
 inventoryAction(c,rules,'equip','dagger');assert.equal(equipmentSheet(c,rules).equipment.critical[0].threatMin,19);
 inventoryAction(c,rules,'remove',id);assert.equal(inventoryRows(c).find(x=>x.key==='dagger').quantity,1);
});
test('one effect may equal enhancement; expensive, incompatible and multiple choices are rejected',()=>{
 const c=sheetExample(rules),before=structuredClone(c);
 assert.throws(()=>addEnhancedBase(c,rules,'dagger',0,'keen'));assert.throws(()=>addEnhancedBase(c,rules,'club',1,'keen'));assert.throws(()=>addEnhancedBase(c,rules,'dagger',1,['keen']));
 assert.throws(()=>addEnhancedBase(c,rules,'full-plate',2,'fortification-moderate'));
 const next=addEnhancedBase(c,rules,'full-plate',3,'fortification-moderate');inventoryAction(next,rules,'equip',next.craftedItems.at(-1).instanceId);assert.equal(equipmentSheet(next,rules).equipment.fortificationPercent,50);
 const d=structuredClone(next.craftedItems.at(-1).design);d.magicEffect=['fortification-moderate'];assert.throws(()=>validateMagicItem(d));assert.deepEqual(c,before);
 const tech=addEnhancedBase(c,rules,'steam-axe',2,'elemental-fire').craftedItems.at(-1).design;tech.adaptations.push('elemental-cold');assert.throws(()=>validateMagicItem(tech),/at most one/);delete tech.purchased;assert.doesNotThrow(()=>validateMagicItem(tech));
});
test('technology effects preserve separate reservoirs and persist their damage effect',()=>{
 let c=addEnhancedBase(sheetExample(rules),rules,'steam-axe',1,'elemental-fire');const id=c.craftedItems.at(-1).instanceId;inventoryAction(c,rules,'equip',id);
 assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,[{type:'fire',dice:'1d6',multipliesOnCritical:false}]);
 const owned=c.techEquipment.items.find(x=>x.instanceId===c.craftedItems.at(-1).techInstanceId),other=c.techEquipment.items.find(x=>x!==owned);techEvent(c,rules,{type:'update',instanceId:owned.instanceId,field:'reservoir',value:1});
 c=parseCharacter(exportCharacter(c));inventoryAction(c,rules,'equip',other.instanceId);inventoryAction(c,rules,'equip',id);assert.equal(c.techEquipment.items.find(x=>x.instanceId===owned.instanceId).reservoir,1);assert.equal(c.techEquipment.items.find(x=>x.instanceId===other.instanceId).reservoir,other.reservoir);
});
test('picker is conditional and groups eligible effects with descriptions',()=>{
 const dagger=rules.equipment.items.find(x=>x.id==='dagger'),plate=rules.equipment.items.find(x=>x.id==='full-plate');
 assert.doesNotMatch(renderEnchantedChoice(dagger,{}),/data-enchanted-bonus|data-choice-field/);
 assert.match(renderEnchantedChoice(dagger,{enchanted:true,enhancement:1,effect:'keen'}),/Double the threat range/);
 assert.ok(['keen','flaming','frost','shock'].every(id=>purchasedEffects(dagger,1).some(e=>e.id===id)));assert.ok(!purchasedEffects(plate,2).some(e=>e.id==='fortification-moderate'));assert.ok(purchasedEffects(plate,3).some(e=>e.id==='fortification-moderate'));
 const c=addEnhancedBase(sheetExample(rules),rules,'dagger',2);assert.equal(c.craftedItems.at(-1).design.magicEffect,undefined);
});

test('elemental magic weapons apply typed extra dice and retain them through saving and switching',()=>{
 for(const [effect,type] of [['flaming','fire'],['frost','cold'],['shock','electricity']]){
  let c=addEnhancedBase(sheetExample(rules),rules,'dagger',1,effect);const id=c.craftedItems.at(-1).instanceId;
  inventoryAction(c,rules,'equip',id);
  const expected=[{type,dice:'1d6',multipliesOnCritical:false,requiresActivation:true}];
  assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,expected);
  assert.equal(equipmentSheet(c,rules).equipment.critical[0].threatMin,19);
  assert.match(renderEquipment(c,rules),new RegExp('1d6 '+type));assert.ok(renderCombatEquipment(c,rules).includes('1d6 '+type+' (when activated)'));
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));
  assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,expected);
  inventoryAction(c,rules,'equip',id);assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,[]);
  assert.throws(()=>addEnhancedBase(c,rules,'full-plate',1,effect));
 }
});

test('curated catalogue filters every bonus tier and weapon restrictions, with explicit costs',()=>{
 const item=id=>rules.equipment.items.find(x=>x.id===id),has=(weapon,bonus,id)=>purchasedEffects(item(weapon),bonus).some(e=>e.id===id);
 for(const [id,cost] of [['flaming-burst',2],['speed',3],['brilliant-energy',4],['vorpal',5]]){
  assert.equal(has('longsword',cost-1,id),false);assert.equal(has('longsword',cost,id),true);
  assert.throws(()=>addEnhancedBase(sheetExample(rules),rules,'longsword',cost-1,id));
 }
 assert.equal(has('club',5,'vorpal'),false);assert.equal(has('dagger',2,'disruption'),false);assert.equal(has('club',2,'disruption'),false);
 assert.equal(has('light-crossbow',5,'returning'),false);assert.equal(has('dagger',1,'returning'),true);assert.equal(has('javelin',1,'returning'),true);
 assert.equal(has('light-crossbow',5,'brilliant-energy'),false);assert.equal(has('javelin',4,'brilliant-energy'),true);
 assert.equal(has('light-crossbow',1,'ki-focus'),false);assert.equal(has('longsword',1,'distance'),false);assert.equal(has('light-crossbow',1,'distance'),false);
 assert.match(renderEnchantedChoice(item('longsword'),{enchanted:true,enhancement:5}),/Vorpal \(\+5 effect\)/);
 for(const base of rules.equipment.items.filter(x=>x.kind==='weapon'))for(let bonus=1;bonus<=5;bonus++)assert.ok(purchasedEffects(base,bonus).every(e=>e.cost<=bonus));
});
test('new effects keep pricing, range changes and Bane targets through JSON',()=>{
 let c=addEnhancedBase(sheetExample(rules),rules,'longsword',5,'vorpal');assert.equal(priceMagicItem(c.craftedItems.at(-1).design).market,200315);
 c=addEnhancedBase(c,rules,'light-crossbow',1);c.craftedItems.at(-1).design.magicEffect='distance';inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);assert.equal(equipmentSheet(c,rules).equipment.rangeIncrementFt,160);
 c=addEnhancedBase(c,rules,'longsword',1);c.craftedItems.at(-1).design.magicEffect='throwing';inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);c.equipment.thrown=true;assert.equal(equipmentSheet(c,rules).equipment.rangeIncrementFt,10);assert.match(renderCombatEquipment(c,rules),/Throw weapon/);
 assert.throws(()=>addEnhancedBase(c,rules,'dagger',1,'bane'));assert.throws(()=>addEnhancedBase(c,rules,'dagger',1,'bane','humanoid'));
 c=addEnhancedBase(c,rules,'dagger',1,'bane','humanoid (orc)');c=parseCharacter(exportCharacter(c));assert.equal(c.craftedItems.at(-1).design.magicEffectTarget,'humanoid (orc)');
});

test('only the approved 19 weapon effects can be bought, with supplemental restrictions',()=>{
 const names=new Set();for(const item of rules.equipment.items.filter(x=>x.kind==='weapon'&&!x.tech))for(const e of purchasedEffects(item,5))names.add(e.id);
 assert.deepEqual([...names].sort(),['keen','flaming','frost','shock','corrosive','agile','furious','returning','ghost-touch','bane','spell-storing','flaming-burst','icy-burst','shocking-burst','holy','impact','speed','brilliant-energy','vorpal'].sort());
 const has=(id,e)=>purchasedEffects(rules.equipment.items.find(x=>x.id===id),5).some(x=>x.id===e);
 assert.equal(has('dagger','agile'),true);assert.equal(has('greatsword','agile'),false);assert.equal(has('light-crossbow','agile'),false);
 assert.equal(has('dagger','impact'),false);assert.equal(has('greatsword','impact'),true);assert.equal(has('light-crossbow','furious'),false);
 for(const effect of ['dancing','distance','throwing','defending'])assert.throws(()=>addEnhancedBase(sheetExample(rules),rules,'dagger',5,effect));
 let c=addEnhancedBase(sheetExample(rules),rules,'dagger',1,'corrosive');inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);c=parseCharacter(exportCharacter(c));assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,[{type:'acid',dice:'1d6',multipliesOnCritical:false,requiresActivation:true}]);
});
