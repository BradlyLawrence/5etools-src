import {createPackage,planImport,applyImport,readTransferData} from './transfer.mjs';
import {addEnhancedBase} from './enchanted-item-picker.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {equipmentSheet} from './equipment.mjs';
import {inventoryAction,inventoryRows} from './inventory.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const make=()=>sheetExample(rules);
test('Brassjaw iterates by BAB, and Vital Strike uses one attack and only extra weapon dice',()=>{
 const c=make(),s=equipmentSheet(c,rules);assert.deepEqual(s.attackRoutine.main.attacks,[12,7]);
 assert.match(renderCombatSheet(c,rules),/Full attack \+12\/\+7/);
 c.feats.push({featId:'vital-strike',creatorSlot:'starting'});c.equipment.vitalStrike=true;
 const vital=equipmentSheet(c,rules);assert.equal(vital.attackRoutine.mode,'vital');assert.deepEqual(vital.attackRoutine.main.attacks,[12]);
 assert.deepEqual(vital.attackRoutine.main.extraDice,['1d12']);assert.equal(vital.attackRoutine.main.damage,s.stats.damage.total);
 assert.doesNotMatch(renderCombatSheet(c,rules),/Full attack/);
});
test('two owned daggers occupy separate hands, use penalties and survive saved JSON',()=>{
 let c=make();inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');
 assert.throws(()=>inventoryAction(c,rules,'equip-offhand','dagger'),/another owned copy/);
 inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip-offhand','dagger');
 assert.equal(inventoryRows(c).find(r=>r.key==='dagger').quantity,2);
 const s=equipmentSheet(c,rules),r=s.attackRoutine;
 assert.equal(r.mode,'dual');assert.deepEqual(r.main.attacks,[s.stats.attack.total-4,s.stats.attack.total-9]);
 assert.equal(r.off.attacks.length,1);assert.equal(r.off.damage,Math.floor((s.effectiveAbilities.str-10)/4));
 c.builder.baseScores.dex=18;
 c.feats.push({featId:'two-weapon-fighting',creatorSlot:'starting'},{featId:'improved-two-weapon-fighting',creatorSlot:'level-3'});
 const trained=equipmentSheet(c,rules);assert.equal(trained.attackRoutine.main.attacks[0],trained.stats.attack.total-2);assert.equal(trained.attackRoutine.off.attacks.length,2);
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};saveCharacter(storage,c,'hands');
 c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(equipmentSheet(c,rules).attackRoutine,trained.attackRoutine);
 inventoryAction(c,rules,'equip-offhand','dagger');assert.equal(c.equipment.offHand,undefined);assert.equal(inventoryRows(c).find(r=>r.key==='dagger').quantity,2);
});
test('shield replaces off-hand weapon without losing either item',()=>{
 const c=make();for(let i=0;i<2;i++)inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');inventoryAction(c,rules,'equip-offhand','dagger');
 const shield=rules.equipment.items.find(i=>i.kind==='shield'&&!i.tech);inventoryAction(c,rules,'add',shield.id);inventoryAction(c,rules,'equip',shield.id);
 assert.equal(c.equipment.offHand,undefined);assert.equal(c.equipment.shieldId,shield.id);assert.equal(inventoryRows(c).find(r=>r.key==='dagger').quantity,2);
 inventoryAction(c,rules,'equip-offhand','dagger');assert.equal(c.equipment.shieldId,null);assert.equal(inventoryRows(c).find(r=>r.key===shield.id).quantity,1);
 inventoryAction(c,rules,'equip','greataxe');assert.equal(c.equipment.offHand,undefined);
 assert.equal(inventoryRows(c).find(r=>r.key==='dagger').quantity,2);
});

test('enchanted off-hand uses its own identity and properties without changing the main weapon',()=>{
 let c=make();inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');
 c=addEnhancedBase(c,rules,'dagger',1,'flaming');const item=c.craftedItems.at(-1);
 inventoryAction(c,rules,'equip-offhand',item.instanceId);
 const s=equipmentSheet(c,rules);assert.equal(s.equipment.elementalDamage.length,0);assert.equal(s.attackRoutine.off.elemental[0].type,'fire');
 assert.equal(c.craftedItems.at(-1).equipped,false);assert.equal(c.equipment.offHand.key,item.instanceId);
 const copy=parseCharacter(exportCharacter(c));assert.deepEqual(equipmentSheet(copy,rules).attackRoutine,s.attackRoutine);
 inventoryAction(copy,rules,'remove',item.instanceId);assert.equal(copy.equipment.offHand,undefined);assert.equal(copy.equipment.weaponId,'dagger');
});

test('two-hand loadout and enchanted identity survive a package onto another device',()=>{
 let c=make();inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');c=addEnhancedBase(c,rules,'dagger',1,'keen');inventoryAction(c,rules,'equip-offhand',c.craftedItems.at(-1).instanceId);
 const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 const source=storage(),target=storage();saveCharacter(source,c,'dual');const plan=planImport(target,JSON.parse(JSON.stringify(createPackage(source))));
 applyImport(target,plan,Object.fromEntries(plan.rows.map(r=>[r.kind+':'+r.id,'import'])),rules);
 const copy=readTransferData(target).characters[0].character;assert.deepEqual(copy.equipment.offHand,c.equipment.offHand);assert.deepEqual(equipmentSheet(copy,rules).attackRoutine,equipmentSheet(c,rules).attackRoutine);
});

test('Vital Strike chain increases only extra dice at higher BAB',()=>{
 const c=make();c.builder.classOrder=Array(17).fill('fighter');c.builder.targetLevel=17;c.feats=[];c.equipment.vitalStrike=true;
 for(const [id,tier] of [['vital-strike',1],['improved-vital-strike',2],['greater-vital-strike',3]]){
  c.feats.push({featId:id});const s=equipmentSheet(c,rules);assert.equal(s.attackRoutine.tier,tier);assert.equal(s.attackRoutine.main.attacks.length,1);assert.deepEqual(s.attackRoutine.main.extraDice,[tier+'d12']);
 }
});

test('Haste adds one highest-bonus attack, keeps other bonuses, and never duplicates Speed or Vital Strike',()=>{
 let c=make();c.buffs=[{id:'haste',active:true,bonus:1}];
 assert.deepEqual(equipmentSheet(c,rules).attackRoutine.main.attacks,[13,13,8]);
 c=addEnhancedBase(c,rules,'greataxe',3,'speed');inventoryAction(c,rules,'equip',c.craftedItems.at(-1).instanceId);
 let s=equipmentSheet(c,rules);assert.equal(s.attackRoutine.main.attacks.length,3);assert.equal(s.attackRoutine.main.attacks[1],s.stats.attack.total);
 c.buffs[0].active=false;assert.equal(equipmentSheet(c,rules).attackRoutine.main.attacks.length,3);
 c.feats.push({featId:'vital-strike',creatorSlot:'starting'});c.equipment.vitalStrike=true;c.buffs[0].active=true;
 s=equipmentSheet(c,rules);assert.equal(s.attackRoutine.main.attacks.length,1);assert.equal(s.attackRoutine.extraAttack,undefined);
});
test('extra attack retains Power Attack penalty after Furious Focus first attack',()=>{
 const c=make();c.feats.push({featId:'power-attack',creatorSlot:'starting'},{featId:'furious-focus',creatorSlot:'level-3'});c.equipment.powerAttack=true;c.equipment.powerAttackPenalty=2;c.buffs=[{id:'haste',active:true,bonus:1}];
 const s=equipmentSheet(c,rules);assert.deepEqual(s.attackRoutine.main.attacks,[s.stats.attack.total+2,s.stats.attack.total,s.stats.attack.total-5]);
});
test('dual wielding assigns exactly one extra attack to an eligible hand and preserves selection',()=>{
 let c=make();inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');c=addEnhancedBase(c,rules,'dagger',3,'speed');inventoryAction(c,rules,'equip-offhand',c.craftedItems.at(-1).instanceId);
 let r=equipmentSheet(c,rules).attackRoutine;assert.equal(r.main.attacks.length,2);assert.equal(r.off.attacks.length,2);assert.equal(r.extraAttack.hand,'off');
 c.buffs=[{id:'haste',active:true,bonus:1}];c.equipment.extraAttackHand='main';r=equipmentSheet(c,rules).attackRoutine;assert.equal(r.main.attacks.length,3);assert.equal(r.off.attacks.length,1);
 c.equipment.extraAttackHand='off';r=equipmentSheet(c,rules).attackRoutine;assert.equal(r.main.attacks.length,2);assert.equal(r.off.attacks.length,2);
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};saveCharacter(storage,c,'haste');const copy=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(equipmentSheet(copy,rules).attackRoutine,r);
 c.feats.push({featId:'vital-strike',creatorSlot:'starting'});c.equipment.vitalStrike=true;r=equipmentSheet(c,rules).attackRoutine;assert.equal(r.off,undefined);assert.equal(r.main.attacks.length,1);
});

test('Rapid Shot and Manyshot combine with Haste without extra Manyshot rolls',()=>{
 const c=make();c.builder.baseScores.dex=18;c.feats.push({featId:'point-blank-shot'},{featId:'rapid-shot'},{featId:'manyshot'});
 inventoryAction(c,rules,'add','hunting-bow');inventoryAction(c,rules,'equip','hunting-bow');
 const base=equipmentSheet(c,rules).stats.attack.total;c.equipment.rapidShot=true;c.equipment.manyshot=true;
 let s=equipmentSheet(c,rules);assert.deepEqual(s.attackRoutine.main.attacks,[base-2,base-2,base-7]);assert.deepEqual(s.attackRoutine.manyshot,{attackIndex:0,arrows:2});
 c.buffs=[{id:'haste',active:true,bonus:1}];s=equipmentSheet(c,rules);assert.deepEqual(s.attackRoutine.main.attacks,[base-1,base-1,base-1,base-6]);assert.equal(s.attackRoutine.manyshot.arrows,2);
 const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};saveCharacter(storage,c,'archer');
 const loaded=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(equipmentSheet(loaded,rules).attackRoutine,s.attackRoutine);
 c.feats.push({featId:'vital-strike'});c.equipment.vitalStrike=true;s=equipmentSheet(c,rules);assert.deepEqual(s.attackRoutine.main.attacks,[base+1]);assert.equal(s.attackRoutine.rapidShot,undefined);assert.equal(s.attackRoutine.manyshot,undefined);
});
test('ranged feats require ownership and compatible weapon; Manyshot excludes crossbows',()=>{
 const c=make();c.equipment.rapidShot=true;c.equipment.manyshot=true;
 assert.doesNotMatch(renderCombatSheet(c,rules),/data-field="equipment.rapidShot"/);
 c.builder.baseScores.dex=18;c.feats.push({featId:'point-blank-shot'},{featId:'rapid-shot'},{featId:'manyshot'});
 assert.equal(equipmentSheet(c,rules).attackRoutine.rapidShot,undefined);
 inventoryAction(c,rules,'add','light-crossbow');inventoryAction(c,rules,'equip','light-crossbow');
 const r=equipmentSheet(c,rules).attackRoutine;assert.equal(r.rapidShot,true);assert.equal(r.main.attacks.length,3);assert.equal(r.manyshot,undefined);
 assert.match(renderCombatSheet(c,rules),/Reloading and ammunition must allow each shot/);
 inventoryAction(c,rules,'add','dagger');inventoryAction(c,rules,'equip','dagger');c.equipment.thrown=true;
 assert.equal(equipmentSheet(c,rules).attackRoutine.rapidShot,true);assert.equal(equipmentSheet(c,rules).attackRoutine.manyshot,undefined);
});
