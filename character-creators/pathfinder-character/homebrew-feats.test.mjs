import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {readHomebrewFeats,saveHomebrewFeat,exportHomebrewFeat,importHomebrewFile,withHomebrew,FEATS_KEY} from './homebrew-feats.mjs';
import {createPackage,planImport,applyImport} from './transfer.mjs';
import {newCharacter,materialize} from './character.mjs';import {selectStartingFeat,availableStartingFeats} from './feats.mjs';import {equipmentSheet} from './equipment.mjs';import {saveCharacter,readRoster} from './roster.mjs';import {renderCombatBuffs} from './combat-buffs.mjs';
const core=JSON.parse(fs.readFileSync(new URL('./rules.json',import.meta.url)));
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const feat=(id='precision',prerequisites=[])=>({id:'homebrew:feat:'+id,name:'Test '+id,description:'A +2 bonus on attacks.',combat:true,parameter:null,prerequisites,effects:[{kind:'modifier',activation:'passive',target:'attack.all',bonusType:'competence',condition:'always',value:2}]});
const character=()=>{const c=newCharacter();c.builder.classOrder=['fighter'];c.builder.targetLevel=1;c.builder.method='manual';c.builder.baseScores={str:14,dex:12,con:14,int:10,wis:10,cha:10};return c;};
test('create, save, reload, select and calculate homebrew while retaining level prerequisites',()=>{
 const s=store(),f=saveHomebrewFeat(s,feat(),core),rules=withHomebrew(core,s),c=character(),base=equipmentSheet(c,rules);
 assert.ok(availableStartingFeats(c,rules,'starting').some(x=>x.id===f.id));selectStartingFeat(c,rules,'starting',f.id);assert.equal(equipmentSheet(c,rules).stats.attack.total,base.stats.attack.total+2);
 saveCharacter(s,materialize(c),'one');assert.equal(equipmentSheet(readRoster(s).characters[0].character,withHomebrew(core,s)).stats.attack.total,base.stats.attack.total+2);
 const gated=saveHomebrewFeat(s,feat('advanced',[{kind:'bab',minimum:5}]),core);assert.throws(()=>selectStartingFeat(character(),withHomebrew(core,s),'starting',gated.id));
 assert.throws(()=>saveHomebrewFeat(s,{...f,name:'Changed'},core),/already exists/);saveHomebrewFeat(s,{...f,name:'Changed'},core,JSON.stringify(f));assert.equal(readHomebrewFeats(s)[0].name,'Changed');
});
test('individual files include dependencies, reject conflicts/cycles and never grant feats',()=>{
 const a=store(),b=store(),parent=saveHomebrewFeat(a,feat(),core),child=saveHomebrewFeat(a,feat('child',[{kind:'feat',featId:parent.id}]),core);
 const file=JSON.parse(JSON.stringify(exportHomebrewFeat(child,readHomebrewFeats(a))));assert.equal(file.dependencies.length,1);importHomebrewFile(b,file,core);importHomebrewFile(b,file,core);assert.equal(readHomebrewFeats(b).length,2);assert.equal(readRoster(b).characters.length,0);
 const before=b.getItem(FEATS_KEY);file.feat.name='Conflict';assert.throws(()=>importHomebrewFile(b,file,core),/Conflicting/);assert.equal(b.getItem(FEATS_KEY),before);
 assert.throws(()=>saveHomebrewFeat(a,feat('missing',[{kind:'feat',featId:'homebrew:feat:absent'}]),core),/Missing/);
 assert.throws(()=>saveHomebrewFeat(a,{...parent,prerequisites:[{kind:'feat',featId:child.id}]},core,JSON.stringify(parent)),/Circular/);
});
test('character package automatically carries needed feat definitions and rejects deselected dependencies atomically',()=>{
 const a=store(),b=store(),f=saveHomebrewFeat(a,feat(),core),c=character();selectStartingFeat(c,withHomebrew(core,a),'starting',f.id);saveCharacter(a,materialize(c),'one');
 const file=createPackage(a,{characters:['one']});assert.equal(file.feats.length,1);let plan=planImport(b,file);assert.throws(()=>applyImport(b,plan,{'characters:one':'import'},core),/Missing/);assert.equal(readRoster(b).characters.length,0);
 const choices=Object.fromEntries(plan.rows.map(r=>[r.kind+':'+r.id,'import']));applyImport(b,plan,choices,core);assert.equal(equipmentSheet(readRoster(b).characters[0].character,withHomebrew(core,b)).stats.attack.total,equipmentSheet(c,withHomebrew(core,a)).stats.attack.total);
 const again=planImport(b,file);assert.equal(applyImport(b,again,{},core),0);
});
test('toggle feats change combat numbers only when enabled and expose a checkbox',()=>{
 const s=store(),draft=feat();draft.effects[0].activation='toggle';const f=saveHomebrewFeat(s,draft,core),rules=withHomebrew(core,s),c=character();selectStartingFeat(c,rules,'starting',f.id);const off=equipmentSheet(c,rules);assert.match(renderCombatBuffs(c,rules,off),/homebrewToggle.homebrew:feat:precision/);c.context??={attackType:'melee',weapon:{id:'unarmed-strike',finesseEligible:true},featToggles:{}};c.context.featToggles={[f.id]:true};assert.equal(equipmentSheet(c,rules).stats.attack.total,off.stats.attack.total+2);
});

