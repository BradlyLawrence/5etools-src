import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {addOwnedTechnology,updateOwnedProperty} from './owned-item-properties.mjs';
import {inventoryAction} from './inventory.mjs';
import {equipmentSheet,techEvent} from './equipment.mjs';
import {renderEquipment} from './equipment-ui.mjs';
import {renderCombatEquipment} from './combat-equipment.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
test('regular and Keen technology copies keep their own properties through equip and JSON',()=>{
 let c=sheetExample(rules);c=addOwnedTechnology(c,rules,'steam-axe',{enhancement:1,keen:true});
 const regular=c.techEquipment.items[0],keen=c.techEquipment.items.at(-1);
 inventoryAction(c,rules,'equip',keen.instanceId);const enhanced=equipmentSheet(c,rules);assert.equal(enhanced.equipment.critical[0].threatMin,19);
 inventoryAction(c,rules,'equip',regular.instanceId);const plain=equipmentSheet(c,rules);assert.equal(plain.equipment.critical[0].threatMin,20);assert.equal(enhanced.stats.attack.total,plain.stats.attack.total+1);
 const copy=parseCharacter(exportCharacter(c));inventoryAction(copy,rules,'equip',keen.instanceId);assert.equal(equipmentSheet(copy,rules).equipment.critical[0].threatMin,19);assert.equal(copy.techEquipment.items[0].keen,false);
});
test('Equipment shows property editing only through Inspect or Add and no combat controls',()=>{
 const c=sheetExample(rules);inventoryAction(c,rules,'equip',c.techEquipment.items[0].instanceId);
 const html=renderEquipment(c,rules);assert.doesNotMatch(html,/data-spend|equipment.fightingDefensively|tech.reservoir|tech.attuned|data-owned-property/);
 assert.match(renderEquipment(c,rules,{inspect:c.techEquipment.items[0].instanceId}),/data-owned-property="keen"/);
 assert.match(renderEquipment(c,rules,{picker:true,choice:'steam-axe'}),/data-enchanted-version/);
 const combat=renderCombatEquipment(c,rules);assert.match(combat,/data-spend/);assert.doesNotMatch(combat,/equipment.fightingDefensively/);assert.doesNotMatch(combat,/tech.enhancement|tech.keen|data-owned-property/);
});
test('powered previews are pure and spending affects only the selected copy through save/reload',()=>{
 let c=addOwnedTechnology(sheetExample(rules),rules,'steam-axe');const id=c.techEquipment.items[0].instanceId;inventoryAction(c,rules,'equip',id);
 const before=structuredClone(c);renderCombatEquipment(c,rules);assert.deepEqual(c,before);
 const action=rules.technology.families.find(f=>f.id===rules.equipment.items.find(x=>x.id==='steam-axe').tech.family).actions[0];techEvent(c,rules,{type:'spend',instanceId:id,actionId:action.id});
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveCharacter(storage,c,'test');c=readRoster(storage).characters[0].character;
 assert.equal(c.techEquipment.items[0].reservoir,4-action.cost);assert.equal(c.techEquipment.items[1].reservoir,4);
});
test('correcting properties never refills an existing item or changes another copy',()=>{
 let c=addOwnedTechnology(sheetExample(rules),rules,'steam-axe');const id=c.techEquipment.items[0].instanceId;c.techEquipment.items[0].reservoir=1;
 c=updateOwnedProperty(c,rules,id,'enhancement',2);assert.equal(c.techEquipment.items[0].reservoir,1);assert.equal(c.techEquipment.items[1].enhancement,0);
 const before=structuredClone(c);assert.throws(()=>updateOwnedProperty(c,rules,id,'reservoir',4));assert.throws(()=>addOwnedTechnology(c,rules,'steam-axe',{enhancement:6}));assert.deepEqual(c,before);
});
