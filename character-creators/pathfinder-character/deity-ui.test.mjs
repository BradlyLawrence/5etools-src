import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readRoster} from './roster.mjs';

test('creator handlers save domain benefits, domain-linked text and added/removed concern lines',async()=>{
 const index=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const node=()=>({innerHTML:'',textContent:'',value:'',hidden:false,children:[],addEventListener(){},querySelectorAll(){return [];},replaceChildren(){this.children=[];},append(c){this.children.push(c);},focus(){}});
 const nodes=new Map([...index.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],node()]));
 const map=new Map(),originals={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
 globalThis.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 globalThis.document={getElementById:id=>nodes.get(id),createElement:node};globalThis.window={addEventListener(){}};
 const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8')),catalogue=JSON.parse(await readFile(new URL('../pathfinder/data/catalogue.json',import.meta.url),'utf8'));
 globalThis.fetch=async url=>({ok:true,json:async()=>url==='./rules.json'?rules:catalogue});
 try{
  await import('./app.mjs');nodes.get('new').onclick();
  const change=(key,value)=>nodes.get('panel').onchange({target:{dataset:{field:key},value,type:'select-one'}});
  const click=(selector,dataset={})=>nodes.get('panel').onclick({target:{closest:q=>q===selector?{dataset}:null}});
  change('class.0','paladin');nodes.get('steps').onclick({target:{closest:()=>({dataset:{step:'3'}})}});
  assert.match(nodes.get('panel').innerHTML,/Deity & faith/);
  change('deity.name','The Open Hand');['protection','travel','water'].forEach((d,i)=>change('deity.domain.'+i,d));change('deity.weapon','rapier');
  for(const d of ['protection','travel','water'])change('deity.oath.'+d,'My '+d+' oath');
  click('[data-sacred-add]');change('deity.concern.0','Mercy');click('[data-sacred-add]');change('deity.concern.1','Ale');click('[data-sacred-remove]',{sacredRemove:'0'});
  nodes.get('save').onclick();let saved=readRoster(localStorage).characters[0].character;
  assert.equal(saved.builder.identity.deity,'The Open Hand');assert.deepEqual(saved.deity.sacredConcerns,['Ale']);assert.equal(saved.deity.oaths.water,'My water oath');
  change('class.0','cleric');change('deity.active.cleric-domain-1','protection');change('deity.active.cleric-domain-2','travel');
  assert.doesNotMatch(nodes.get('panel').innerHTML,/data-field="deity.oath/);nodes.get('save').onclick();saved=readRoster(localStorage).characters[0].character;
  assert.equal(saved.builder.classOptions['cleric-domain-2'],'travel');
  change('class.0','inquisitor');change('deity.active.inquisitor-domain','water');change('deity.mission.water','Keep the wells open.');nodes.get('save').onclick();saved=readRoster(localStorage).characters[0].character;
  assert.equal(saved.deity.missions.water,'Keep the wells open.');
  change('deity.domain.2','fire');nodes.get('save').onclick();saved=readRoster(localStorage).characters[0].character;assert.equal(saved.builder.classOptions['inquisitor-domain'],undefined);
  assert.equal(saved.deity.missions.water,'Keep the wells open.');
  assert.match(nodes.get('message').textContent,/^Draft saved/);
 }finally{Object.assign(globalThis,originals);}
});
