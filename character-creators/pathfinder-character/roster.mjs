import {validateCraftedItems} from './engine/magic-items.mjs';
import {validateBackground} from './backgrounds.mjs';
import {validateBuilder} from './character.mjs';
export const KEY='character-creators/pathfinder/roster-v1';
export function parseCharacter(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Choose a Pathfinder character JSON file.');
 if(input.fileType && input.fileType!=='pf1-character')throw Error('This file belongs to another character tool.');
 if(input.fileType && input.schemaVersion!==1)throw Error('This character file version is not supported.');
 const c=input.character??input;
 if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.name!=='string'||!c.name.trim()||c.name.length>200)throw Error('The character needs a name (up to 200 characters).');
 if(!c.classes||typeof c.classes!=='object'||Array.isArray(c.classes))throw Error('The character is missing Pathfinder class data.');
 const levels=Object.values(c.classes);
 if(levels.some(v=>!Number.isInteger(v)||v<1||v>20)||levels.reduce((a,b)=>a+b,0)>20)throw Error('Class levels must total between 1 and 20, or be empty for a new draft.');
 if(!Array.isArray(c.feats))throw Error('The character is missing its feat list.');
 if(c.carriedEquipment!==undefined&&(!c.carriedEquipment||typeof c.carriedEquipment!=='object'||Array.isArray(c.carriedEquipment)||Object.entries(c.carriedEquipment).some(([id,n])=>!id||!Number.isInteger(n)||n<0||n>999)))throw Error('Invalid carried equipment quantities.');
 validateCraftedItems(c);
 validateBackground(c.background);
 if(c.builder)validateBuilder(c.builder);
 return structuredClone(c);
}
export function readRoster(storage){
 const raw=storage.getItem(KEY);if(!raw)return {version:1,characters:[]};
 const r=JSON.parse(raw);
 if(r.version!==1||!Array.isArray(r.characters))throw Error('The saved Pathfinder roster could not be read. Existing data has been left untouched.');
 for(const e of r.characters){if(typeof e.id!=='string')throw Error('Invalid roster entry.');parseCharacter(e.character);}
 return r;
}
export function saveCharacter(storage,character,id=crypto.randomUUID(),expectedSnapshot=undefined){
 const c=parseCharacter(character),r=readRoster(storage);
 if(expectedSnapshot!==undefined&&JSON.stringify(r.characters.find(e=>e.id===id)?.character)!==expectedSnapshot)throw Error('This character changed in another tab. Download your draft as a backup, then reopen the saved character before making more changes.');
 const entry={id,updatedAt:new Date().toISOString(),character:c};
 const i=r.characters.findIndex(e=>e.id===id);if(i<0)r.characters.push(entry);else r.characters[i]=entry;
 storage.setItem(KEY,JSON.stringify(r));return entry;
}
export function exportCharacter(character){return {fileType:'pf1-character',schemaVersion:1,character:parseCharacter(character)};}

export function deleteCharacter(storage,id){
 const roster=readRoster(storage);
 if(!roster.characters.some(e=>e.id===id))throw Error('This character is no longer in your saved roster.');
 roster.characters=roster.characters.filter(e=>e.id!==id);
 storage.setItem(KEY,JSON.stringify(roster));
}
