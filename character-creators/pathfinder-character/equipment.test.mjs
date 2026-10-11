import {inventoryRows,inventoryAction} from './inventory.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter} from './character.mjs';
import {equip,equipmentSheet,techEvent} from './equipment.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(){const c=newCharacter();c.builder.classOrder=['fighter'];c.builder.baseScores={str:16,dex:14,con:12,int:10,wis:10,cha:10};return c;}
test('equipment selection uses existing feat, armour, and shield calculations',()=>{
 const c=make();equip(c,rules,'weaponId','longsword');equip(c,rules,'armorId','full-plate');equip(c,rules,'shieldId','shield-heavy-steel');
 c.feats=[{featId:'weapon-focus',weaponId:'longsword'}];let s=equipmentSheet(c,rules);
 assert.equal(s.stats.attack.total,5);assert.equal(s.stats.ac.total,22);assert.equal(s.equipment.speedFt,20);
 assert.equal(s.stats['skill.acrobatics'].modifier,-8);
 equip(c,rules,'weaponId','greatsword');s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,4);assert.equal(s.stats.ac.total,20);assert.equal(s.stats.damage.total,4);
 equip(c,rules,'weaponId','longsword');c.equipment.damageMode='two-handed';assert.equal(equipmentSheet(c,rules).stats.ac.total,20);
});
test('tech fuel persists on weapon switches and export, and powered profiles do not spend fuel',()=>{
 const c=make();c.builder.classOrder=['ironwright'];equip(c,rules,'weaponId','steam-axe');const instance=c.techEquipment.items[0];
 techEvent(c,rules,{type:'update',instanceId:instance.instanceId,field:'enhancement',value:1});
 const family=rules.technology.families.find(x=>x.id===rules.equipment.items.find(x=>x.id==='steam-axe').tech.family),action=family.actions[0];
 const before=c.techEquipment.items[0].reservoir;equipmentSheet(c,rules,action.id);assert.equal(c.techEquipment.items[0].reservoir,before);
 techEvent(c,rules,{type:'spend',instanceId:instance.instanceId,actionId:action.id});
 equip(c,rules,'weaponId','longsword');assert.equal(c.techEquipment.selectedInstanceId,null);
 equip(c,rules,'weaponId','steam-axe');assert.equal(c.techEquipment.items.length,1);assert.equal(c.techEquipment.items[0].reservoir,before-action.cost);
 const copy=parseCharacter(exportCharacter(c));assert.deepEqual(copy.techEquipment,c.techEquipment);assert.deepEqual(equipmentSheet(copy,rules).stats,equipmentSheet(c,rules).stats);
});
test('weapon proficiency penalties and racial size apply; invalid selections leave state alone',()=>{
 const c=make();c.builder.classOrder=['wizard'];c.builder.raceId='halflings';equip(c,rules,'weaponId','longsword');
 const s=equipmentSheet(c,rules);assert.equal(s.equipment.proficient,false);assert.ok(s.stats.attack.breakdown.some(x=>x.value===-4));assert.deepEqual(s.equipment.damageDice,['1d6']);
 const before=structuredClone(c);assert.throws(()=>equip(c,rules,'armorId','longsword'));assert.deepEqual(c,before);
});

test('inventory add, equip, switch, unequip and remove preserve owned counts',()=>{
 const c=make();const act=(action,id)=>inventoryAction(c,rules,action,id);
 act('add','longsword');act('add','longsword');act('add','greatsword');
 act('equip','longsword');assert.equal(inventoryRows(c).find(x=>x.itemId==='longsword').quantity,2);
 act('equip','greatsword');assert.equal(c.carriedEquipment.longsword,2);
 act('equip','greatsword');assert.equal(c.carriedEquipment.greatsword,1);
 act('remove','longsword');assert.equal(c.carriedEquipment.longsword,1);
 act('equip','longsword');act('remove','longsword');assert.equal(c.equipment.weaponId,'unarmed-strike');
});
test('identical tech items retain separate fuel and can be independently equipped',()=>{
 const c=make();inventoryAction(c,rules,'add','steam-axe');inventoryAction(c,rules,'add','steam-axe');
 const [a,b]=c.techEquipment.items;inventoryAction(c,rules,'equip',a.instanceId);
 techEvent(c,rules,{type:'update',instanceId:a.instanceId,field:'reservoir',value:1});
 inventoryAction(c,rules,'equip',b.instanceId);assert.equal(c.techEquipment.selectedInstanceId,b.instanceId);
 assert.equal(c.techEquipment.items[0].reservoir,1);inventoryAction(c,rules,'remove',b.instanceId);
 assert.equal(c.equipment.weaponId,'unarmed-strike');assert.equal(c.techEquipment.items.length,1);
});
