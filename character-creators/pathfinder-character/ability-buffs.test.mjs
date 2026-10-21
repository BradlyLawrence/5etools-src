import {calculateSkills} from './skills.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sheetExample} from './sheet-example.mjs';
import {calculate,materialize} from './character.mjs';
import {changeBuff,BUFFS} from './engine/buffs.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
import {spellCastPreview} from './engine/spell-use.mjs';
import {equipmentSheet} from './equipment.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {exportCharacter,parseCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const entries=Object.entries(BUFFS).filter(([,b])=>b.ability);
const activate=(c,id)=>changeBuff(changeBuff(c,'add',id),'active',id,true);
const item=(ability,value)=>({instanceId:'ability-item',equipped:true,design:{id:'ability-design',name:'Ability item',description:'Test enhancement',slot:'belt',baseId:'',basePrice:0,weight:0,casterLevel:8,missing:0,accelerated:false,requirements:'',priceOverride:null,effects:[{kind:'ability',value,target:ability,detail:'',casterLevel:1,daily:0,components:0,duration:'hours'}]}});
test('all six ability buffs share the highest enhancement with equipment and restore on toggle/remove',()=>{
 assert.equal(entries.length,6);
 for(const [id,def] of entries)for(const value of [2,4,6]){
  let c=sheetExample(rules);const base=equipmentSheet(c,rules).effectiveAbilities[def.ability];c.craftedItems=[item(def.ability,value)];const gear=equipmentSheet(c,rules);
  c=activate(c,id);const snapshot=structuredClone(c);let s=equipmentSheet(c,rules);
  assert.equal(s.effectiveAbilities[def.ability],base+Math.max(value,4),id+' +'+value);equipmentSheet(c,rules);assert.deepEqual(c,snapshot);
  c=changeBuff(c,'active',id,false);assert.deepEqual(equipmentSheet(c,rules).stats,gear.stats);
  c=changeBuff(c,'active',id,true);c.craftedItems[0].equipped=false;assert.equal(equipmentSheet(c,rules).effectiveAbilities[def.ability],base+4);
  c=changeBuff(c,'remove',id);assert.equal(equipmentSheet(c,rules).effectiveAbilities[def.ability],base);
 }
});
test('physical and mental buffs update derived stats, HP and skills without changing saved scores or resources',()=>{
 let c=sheetExample(rules),base=equipmentSheet(c,rules),original=structuredClone(c);
 for(const [id] of entries)c=activate(c,id);
 const s=equipmentSheet(c,rules);
 for(const stat of ['attack','initiative','save.fortitude','save.reflex','save.will','skill.climb','skill.acrobatics','skill.spellcraft','skill.perception','skill.diplomacy'])assert.equal(s.stats[stat].total,base.stats[stat].total+2,stat);
 assert.equal(s.stats.damage.total,base.stats.damage.total+3); // two-handed Strength
 assert.equal(s.hitPoints.total,base.hitPoints.total+2*calculate(c).level);
 const oldSkills=calculateSkills(original,calculate(original)),newSkills=calculateSkills(c,calculate(c));assert.equal(newSkills.normal,oldSkills.normal);assert.equal(newSkills.rows.find(x=>x.id==='spellcraft').total,oldSkills.rows.find(x=>x.id==='spellcraft').total+2);
 assert.deepEqual(c.builder.baseScores,original.builder.baseScores);assert.deepEqual(c.techEquipment,original.techEquipment);assert.deepEqual(c.skillRanks,original.skillRanks);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};saveCharacter(storage,c,'test');c=parseCharacter(exportCharacter(readRoster(storage).characters[0].character));assert.deepEqual(equipmentSheet(c,rules).stats,s.stats);
 assert.match(renderCombatSheet(c,rules),/buff-bulls-strength/);
});
test('mental enhancements improve casting DC and concentration, never spell slots; equipment competes',()=>{
 for(const [id,ability,cls] of [['foxs-cunning','int','wizard'],['owls-wisdom','wis','cleric'],['eagles-splendor','cha','sorcerer']]){
  let c=materialize(sheetExample(rules)),r=calculate(c);r={...r,classes:{[cls]:7}};
  const get=()=>spellcasting(c,r).find(x=>x.id===cls),base=get();
  c=activate(c,id);let s=get();assert.equal(s.rows[0].dc,base.rows[0].dc+2);assert.equal(s.concentration,base.concentration+2);assert.deepEqual(s.rows.map(x=>x.slots),base.rows.map(x=>x.slots));
  c.craftedItems=[item(ability,6)];s=get();assert.equal(s.rows[0].dc,base.rows[0].dc+3);c=changeBuff(c,'active',id,false);assert.equal(get().rows[0].dc,s.rows[0].dc);
 }
 let c=materialize(sheetExample(rules)),r=calculate(c),caster=spellcasting(c,r).find(x=>x.id==='sorcerer'),spell=caster.rows.find(x=>x.available.length).available[0];
 const before=spellCastPreview(c,r,'sorcerer',spell);c=activate(c,'eagles-splendor');const after=spellCastPreview(c,r,'sorcerer',spell);assert.equal(after.dc,before.dc+2);assert.deepEqual(after.usage,before.usage);
});
