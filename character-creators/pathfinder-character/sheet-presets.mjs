import {validateBuffs} from './engine/buffs.mjs';
import {validateDebuffs} from './engine/debuffs.mjs';
export const PRESET_KEY='character-creators/pathfinder/sheet-presets-v1';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const check=(ok,message)=>{if(!ok)throw Error(message);};
const keys=(o,allowed)=>object(o)&&Object.keys(o).every(k=>allowed.includes(k));
// Never transfer owned-item IDs, arbitrary labels or private text as disclosure keys.
const portable=k=>/^(spell-list|casting-help|passive-effects|fight-defensively|total-defense|power-attack|(?:buff|debuff)-[a-z-]+|(?:bard|sorcerer|wizard|cleric|druid|paladin|ranger|alchemist|inquisitor)-level-[0-9]|spell-details-(?:bard|sorcerer|wizard|cleric|druid|paladin|ranger|alchemist|inquisitor)-[a-z0-9-]+)$/.test(k)&&k.length<=150;
export function validateSheetPreferences(p){if(p===undefined)return;check(object(p)&&Object.keys(p).length<=1000&&Object.entries(p).every(([k,v])=>portable(k)&&typeof v==='boolean'),'Invalid sheet preferences.');}
export function portablePreferences(p){return Object.fromEntries(Object.entries(p).filter(([k,v])=>portable(k)&&typeof v==='boolean'));}
export function parsePreset(file){
 check(keys(file,['fileType','schemaVersion','preset'])&&file.fileType==='pf1-sheet-preset'&&file.schemaVersion===1,'Choose a supported Pathfinder sheet-preset JSON file.');
 const p=file.preset;check(keys(p,['name','buffs','debuffs','disclosures'])&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100,'Preset needs a name of up to 100 characters.');
 check(Array.isArray(p.buffs)&&Array.isArray(p.debuffs)&&object(p.disclosures),'Incomplete sheet preset.');
 check(p.buffs.every(b=>keys(b,['id','bonus']))&&p.debuffs.every(b=>keys(b,['id'])),'Presets contain choices, not active effects or character data.');
 validateBuffs(p.buffs.map(b=>({...b,active:false})));validateDebuffs(p.debuffs.map(b=>({...b,active:false})));validateSheetPreferences(p.disclosures);
 return {...structuredClone(p),name:p.name.trim()};
}
export function exportPreset(preset){const f={fileType:'pf1-sheet-preset',schemaVersion:1,preset};return {...f,preset:parsePreset(f)};}
export function capturePreset(c,name,disclosures){return parsePreset({fileType:'pf1-sheet-preset',schemaVersion:1,preset:{name,buffs:(c.buffs??[]).map(({id,bonus})=>({id,bonus})),debuffs:(c.debuffs??[]).map(({id})=>({id})),disclosures:portablePreferences(disclosures)}});}
export function readPresets(storage){const raw=storage.getItem(PRESET_KEY);if(!raw)return [];const list=JSON.parse(raw);check(Array.isArray(list)&&list.length<=100,'Saved presets could not be read; existing data is untouched.');const ids=new Set();for(const e of list){check(keys(e,['id','preset'])&&typeof e.id==='string'&&!ids.has(e.id),'Invalid saved preset.');ids.add(e.id);exportPreset(e.preset);}return list;}
export function savePreset(storage,preset){const p=exportPreset(preset).preset,list=readPresets(storage),same=list.find(e=>JSON.stringify(e.preset)===JSON.stringify(p));if(same)return same;check(list.length<100,'Preset storage is full.');const entry={id:crypto.randomUUID(),preset:p};storage.setItem(PRESET_KEY,JSON.stringify([...list,entry]));return entry;}
export function applyPreset(character,preset){const p=exportPreset(preset).preset,c=structuredClone(character);validateBuffs(c.buffs);validateDebuffs(c.debuffs);c.buffs??=[];c.debuffs??=[];
 for(const b of p.buffs)if(!c.buffs.some(x=>x.id===b.id))c.buffs.push({...b,active:false});
 for(const b of p.debuffs)if(!c.debuffs.some(x=>x.id===b.id))c.debuffs.push({...b,active:false});
 c.sheetPreferences=structuredClone(p.disclosures);validateBuffs(c.buffs);validateDebuffs(c.debuffs);return c;
}
