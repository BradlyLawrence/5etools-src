import {FEATS_KEY,readHomebrewFeats,validateHomebrewLibrary,dependencyFeats} from './homebrew-feats.mjs';
import {validateHomebrewFeat} from './engine/homebrew.mjs';
import {KEY as ROSTER,readRoster,parseCharacter} from './roster.mjs';
import {PRESET_KEY,readPresets,exportPreset} from './sheet-presets.mjs';
import {KEY as DESIGNS,readDesigns,exportDesign,parseDesign} from '../pathfinder/crafting/storage.mjs';
const keys={characters:ROSTER,presets:PRESET_KEY,designs:DESIGNS,feats:FEATS_KEY};
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function readTransferData(storage){return {characters:readRoster(storage).characters,presets:readPresets(storage),designs:readDesigns(storage),feats:readHomebrewFeats(storage)};}
const content=(kind,e)=>kind==='characters'?e.character:kind==='presets'?e.preset:e;
export function parsePackage(file){
 check(file?.fileType==='pf1-package'&&file.schemaVersion===1,'Choose a supported Pathfinder package.');
 check(Object.keys(file).every(k=>['fileType','schemaVersion','characters','presets','designs','feats'].includes(k)),'Unknown package fields.');
 const out={fileType:'pf1-package',schemaVersion:1};file={...file,feats:file.feats??[]};
 for(const kind of Object.keys(keys)){
  check(Array.isArray(file[kind])&&file[kind].length<=(kind==='presets'?100:kind==='designs'?200:500),'Invalid package '+kind);const seen=new Set();
  out[kind]=file[kind].map(e=>{check(e&&typeof e.id==='string'&&e.id.length>0&&e.id.length<=150&&!seen.has(e.id),'Invalid or duplicate '+kind+' ID.');seen.add(e.id);
   if(kind==='characters'){check(typeof e.updatedAt==='string'&&!Number.isNaN(Date.parse(e.updatedAt)),'Invalid character save date.');return {id:e.id,updatedAt:e.updatedAt,character:parseCharacter(e.character)};}
   if(kind==='presets')return {id:e.id,preset:exportPreset(e.preset).preset};
   if(kind==='feats')return validateHomebrewFeat(e);
   return parseDesign(exportDesign(e));
  });
 }return out;
}
export function createPackage(storage,selection=null){const data=readTransferData(storage),chosen=Object.fromEntries(Object.entries(data).map(([kind,list])=>[kind,selection?list.filter(e=>selection[kind]?.includes(e.id)):list]));chosen.feats=dependencyFeats(data.feats,[...chosen.feats.map(f=>f.id),...chosen.characters.flatMap(e=>e.character.feats.map(f=>f.featId))]);return parsePackage({fileType:'pf1-package',schemaVersion:1,...chosen});}
export function planImport(storage,file){const incoming=parsePackage(file),existing=readTransferData(storage);return {incoming,snapshot:Object.fromEntries(Object.entries(keys).map(([k,key])=>[k,storage.getItem(key)])),rows:Object.entries(keys).flatMap(([kind])=>incoming[kind].map(entry=>{const same=existing[kind].find(x=>canonical(content(kind,x))===canonical(content(kind,entry))),collision=existing[kind].find(x=>x.id===entry.id);return {kind,id:entry.id,entry,status:same?'identical':collision?'conflict':'new'};}))};}
export function applyImport(storage,plan,choices,core=null){
 for(const [kind,key] of Object.entries(keys))check(storage.getItem(key)===plan.snapshot[kind],'Saves changed since preview. Preview the package again.');
 const data=readTransferData(storage),touched=new Set();let count=0;
 for(const row of plan.rows){const action=choices[row.kind+':'+row.id]??'skip';check(['skip','import','replace'].includes(action),'Invalid import choice.');if(action==='skip'||row.status==='identical')continue;check(action!=='import'||row.status==='new','Choose Replace explicitly for conflicting entries.');
  const list=data[row.kind],i=list.findIndex(x=>x.id===row.id);if(i<0)list.push(structuredClone(row.entry));else list[i]=structuredClone(row.entry);count++;touched.add(row.kind);
 }
 parsePackage({fileType:'pf1-package',schemaVersion:1,...data});
 validateHomebrewLibrary(data.feats,core);dependencyFeats(data.feats,data.characters.flatMap(e=>e.character.feats.map(f=>f.featId))); 
 const writes={characters:JSON.stringify({version:1,characters:data.characters}),presets:JSON.stringify(data.presets),designs:JSON.stringify(data.designs),feats:JSON.stringify(data.feats)};
 const changed=[...touched].filter(k=>writes[k]!==plan.snapshot[k]),done=[];
 try{for(const kind of changed){storage.setItem(keys[kind],writes[kind]);done.push(kind);}}
 catch(error){const failures=[];for(const kind of done.reverse())try{if(plan.snapshot[kind]===null)storage.removeItem(keys[kind]);else storage.setItem(keys[kind],plan.snapshot[kind]);}catch{failures.push(kind);}throw Error(failures.length?'Import failed and rollback could not restore '+failures.join(', ')+'. Keep your package and check these saves.':'Import failed; previous saves restored. '+error.message);}
 return count;
}
