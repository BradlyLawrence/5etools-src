import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {capturePreset,exportPreset,parsePreset,savePreset,readPresets,applyPreset,PRESET_KEY} from './sheet-presets.mjs';
import {sheetExample} from './sheet-example.mjs';
import {equipmentSheet} from './equipment.mjs';
import {saveCharacter,readRoster,exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('preset sharing whitelists setup, excludes private data, and roundtrips independently',()=>{
 const c=sheetExample(rules);c.notes='PRIVATE-NOTES';c.buffs=[{id:'haste',active:true,bonus:1}];c.debuffs=[{id:'shaken',active:true}];
 const p=capturePreset(c,'Front line',{'spell-list':true,'buff-haste':false,'weapon-action-private-instance-pressure-strike':true});
 const json=JSON.stringify(exportPreset(p));for(const privateText of [c.name,'PRIVATE-NOTES','brassjaw-tech-weapon','private-instance','active','spellUse','equipment'])assert.ok(!json.includes(privateText),privateText);
 const a=storage(),b=storage();savePreset(a,p);savePreset(b,parsePreset(JSON.parse(json)));assert.deepEqual(readPresets(a)[0].preset,readPresets(b)[0].preset);savePreset(b,p);assert.equal(readPresets(b).length,1);
 const before=b.getItem(PRESET_KEY),bad=JSON.parse(json);bad.preset.notes='secret';assert.throws(()=>savePreset(b,bad.preset));assert.equal(b.getItem(PRESET_KEY),before);
 assert.throws(()=>parsePreset({...JSON.parse(json),schemaVersion:2}));assert.throws(()=>parsePreset({...JSON.parse(json),preset:{...p,buffs:[{id:'unknown',bonus:1}]}}));
});
test('applying preserves existing state and numbers; preferences and inactive additions persist',()=>{
 const c=sheetExample(rules);c.buffs=[{id:'inspire-courage',active:true,bonus:3}];c.debuffs=[{id:'sickened',active:true}];const snapshot=structuredClone(c),base=equipmentSheet(c,rules);
 const p={name:'Shared',buffs:[{id:'inspire-courage',bonus:1},{id:'bulls-strength',bonus:1}],debuffs:[{id:'fatigued'}],disclosures:{'spell-list':false}};
 const out=applyPreset(c,p);assert.deepEqual(c,snapshot);assert.deepEqual(out.buffs[0],c.buffs[0]);assert.equal(out.buffs[1].active,false);assert.equal(out.debuffs[1].active,false);assert.deepEqual(out.techEquipment,c.techEquipment);assert.equal(out.notes,c.notes);assert.deepEqual(equipmentSheet(out,rules).stats,base.stats);
 const s=storage();saveCharacter(s,out,'one');const reloaded=parseCharacter(exportCharacter(readRoster(s).characters[0].character));assert.deepEqual(reloaded.sheetPreferences,{'spell-list':false});assert.deepEqual(reloaded.buffs,out.buffs);
 assert.deepEqual(applyPreset(out,p),out);
 const fail={getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}};assert.throws(()=>savePreset(fail,p),/Quota/);
});
