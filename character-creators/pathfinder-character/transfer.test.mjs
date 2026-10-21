import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPackage,planImport,applyImport,readTransferData,parsePackage} from './transfer.mjs';
import {saveCharacter,KEY} from './roster.mjs';import {savePreset,PRESET_KEY} from './sheet-presets.mjs';import {saveDesign} from '../pathfinder/crafting/storage.mjs';import {sheetExample} from './sheet-example.mjs';import {equipmentSheet} from './equipment.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const storage=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
function source(){const s=storage();saveCharacter(s,sheetExample(rules),'person');savePreset(s,{name:'Setup',buffs:[{id:'haste',bonus:1}],debuffs:[],disclosures:{'spell-list':false}});saveDesign(s,{id:'design',name:'Ring',description:'Recipe',slot:'ring1',baseId:'',basePrice:0,weight:0,casterLevel:1,missing:0,accelerated:false,requirements:'',priceOverride:null,effects:[{kind:'deflection',value:1,target:'',detail:'',casterLevel:1,daily:0,components:0,duration:'hours'}]});return s;}
const choices=p=>Object.fromEntries(p.rows.map(r=>[r.kind+':'+r.id,r.status==='new'?'import':'skip']));
test('full and selective packages roundtrip between devices without granting items or changing numbers',()=>{
 const a=source(),b=storage(),file=JSON.parse(JSON.stringify(createPackage(a)));const p=planImport(b,file);assert.equal(applyImport(b,p,choices(p)),3);assert.deepEqual(readTransferData(b),readTransferData(a));assert.deepEqual(equipmentSheet(readTransferData(b).characters[0].character,rules).stats,equipmentSheet(readTransferData(a).characters[0].character,rules).stats);
 const repeat=planImport(b,file);assert.ok(repeat.rows.every(r=>r.status==='identical'));assert.equal(applyImport(b,repeat,choices(repeat)),0);
 const share=createPackage(a,{presets:readTransferData(a).presets.map(e=>e.id),designs:['design']});assert.equal(share.characters.length,0);assert.ok(!JSON.stringify(share).includes('Brassjaw'));const recipient=storage(),sp=planImport(recipient,share);applyImport(recipient,sp,choices(sp));assert.equal(readTransferData(recipient).characters.length,0);assert.equal(readTransferData(recipient).designs.length,1);
});
test('conflicts require explicit replacement; stale previews and malformed packages never write',()=>{
 const a=source(),b=source();let file=createPackage(a);file.characters[0].character.notes='Changed';let p=planImport(b,file),before=b.getItem(KEY);assert.equal(p.rows.find(r=>r.kind==='characters').status,'conflict');applyImport(b,p,choices(p));assert.equal(b.getItem(KEY),before);
 p=planImport(b,file);applyImport(b,p,{'characters:person':'replace'});assert.equal(readTransferData(b).characters[0].character.notes,'Changed');
 p=planImport(b,file);b.setItem(PRESET_KEY,'[]');assert.throws(()=>applyImport(b,p,choices(p)),/changed/);
 file.characters.push(file.characters[0]);assert.throws(()=>parsePackage(file),/duplicate/);assert.throws(()=>parsePackage({...file,schemaVersion:9}));
});
test('failed multi-store write restores previous keys and leaves unrelated tools untouched',()=>{
 const a=source(),b=storage();b.setItem('another-tool','private');const p=planImport(b,createPackage(a));const set=b.setItem;let calls=0;b.setItem=(k,v)=>{if(++calls===2)throw Error('quota');set(k,v);};assert.throws(()=>applyImport(b,p,choices(p)),/previous saves restored/);assert.equal(b.getItem(KEY),null);assert.equal(b.getItem(PRESET_KEY),null);assert.equal(b.getItem('another-tool'),'private');
});
