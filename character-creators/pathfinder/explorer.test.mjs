import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterEntries,branches,prerequisiteText} from './model.mjs';
const data=JSON.parse(await readFile(new URL('./data/catalogue.json',import.meta.url),'utf8'));
test('published catalogue preserves unique IDs, prerequisites and indexes',()=>{
 for(const entries of [data.feats,data.equipment.items])assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
 for(const feat of data.feats){assert.ok(Array.isArray(feat.prerequisites));assert.ok(Array.isArray(feat.index.themes));}
 assert.equal(data.equipment.items.length,148);
 for(const item of data.equipment.items)assert.ok(item.recovery,item.id);
 assert.equal(data.character,undefined);
});
test('prerequisite chain search and linked descendants agree',()=>{
 const expertise=data.feats.find(e=>e.id==='combat-expertise');
 const children=branches(data,expertise);
 assert.ok(children.some(e=>e.id==='improved-feint'));
 const results=filterEntries(data,'feats','combat expertise');
 for(const entry of [expertise,...children])assert.ok(results.some(e=>e.id===entry.id));
 assert.ok(filterEntries(data,'feats','power attack').some(e=>e.id==='cleave'));
});
test('themes and equipment filters combine with search',()=>{
 assert.ok(filterEntries(data,'feats','counterspell','defensive').length);
 assert.ok(filterEntries(data,'feats','','skills').every(e=>e.index.themes.includes('skills')));
 assert.equal(filterEntries(data,'equipment','reservoir','tech-melee').length,8);
 assert.equal(filterEntries(data,'equipment','steam axe','martial').length,0);
 assert.equal(filterEntries(data,'feats','nonexistentexample').length,0);
});
test('prerequisites and powered action definitions remain available',()=>{
 assert.equal(prerequisiteText({kind:'bab',minimum:6},new Map()),'Base attack bonus +6');
 assert.ok(data.feats.find(e=>e.id==='lunge').prerequisites.some(p=>p.kind==='bab'&&p.minimum===6));
 const axe=data.technology.families.find(e=>e.id==='axes');
 assert.equal(axe.actions[0].specialistBenefits.extraDice,'2d4');
 for(const item of data.equipment.items)for(const trait of item.traits)assert.ok(data.traits.some(t=>t.id===trait));
});
test('all detail pages render and search controls run against the published data',async()=>{
 const elements=new Map(['kind','category','query','count','results','detail','reset'].map(id=>[id,{value:id==='kind'?'feats':'',innerHTML:'',textContent:'',handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}}]));
 const events={};
 const old={document:globalThis.document,window:globalThis.window,location:globalThis.location,fetch:globalThis.fetch};
 try{
  globalThis.document={getElementById:id=>elements.get(id)};
  globalThis.window={addEventListener:(event,fn)=>events[event]=fn};
  globalThis.location={hash:''};
  globalThis.fetch=async()=>({ok:true,json:async()=>data});
  await import('./app.mjs');
  assert.equal(elements.get('count').textContent,`${data.feats.length} matching feats`);
  for(const [kind,entries] of [['feats',data.feats],['equipment',data.equipment.items],['services',data.services.items],['classes',data.classes.items],['races',data.races.items]])for(const entry of entries){
   globalThis.location.hash=`#${kind}/${encodeURIComponent(entry.id)}`;
   events.hashchange();
   assert.ok(elements.get('detail').innerHTML.includes('View entry JSON'),entry.id);
  }
  elements.get('kind').value='feats';elements.get('kind').handlers.change();
  elements.get('query').value='combat expertise';elements.get('query').handlers.input();
  assert.match(elements.get('results').innerHTML,/Improved Feint/);
  globalThis.location.hash='#equipment/steam-axe';events.hashchange();
  assert.match(elements.get('detail').innerHTML,/Pressure Strike/);
  assert.match(elements.get('detail').innerHTML,/Reservoir 4/);
  assert.doesNotMatch(elements.get('detail').innerHTML,/Ironwright specialist benefits/);
  globalThis.location.hash='#equipment/caltrops';events.hashchange();
  assert.match(elements.get('detail').innerHTML,/Requires Recycle/);
  assert.match(elements.get('detail').innerHTML,/Rapid Fabrication/);
  globalThis.location.hash='#equipment/alchemists-fire-flask';events.hashchange();
  assert.match(elements.get('detail').innerHTML,/Consumed on use/);
  globalThis.location.hash='#feats/missing';events.hashchange();
  assert.match(elements.get('detail').innerHTML,/Entry not found/);
 }finally{Object.assign(globalThis,old);}
});

test('services distinguish purchases, fares and unset campaign prices',()=>{
 assert.ok(filterEntries(data,'services','wagon').some(e=>e.id==='wagon-hire'));
 assert.equal(data.services.items.find(e=>e.id==='wagon').cost.gp,35);
 assert.equal(data.services.items.find(e=>e.id==='coach-cab').cost.text,'3 cp per mile');
 assert.equal(data.services.items.find(e=>e.id==='tech-refuelling').cost.gp,null);
 assert.equal(filterEntries(data,'services','','Technology services').length,2);
});

test('classes include core, approved additions and the Ironwright playtest',()=>{
 assert.equal(data.classes.items.length,16);
 assert.equal(filterEntries(data,'classes','','Core classes').length,11);
 assert.equal(data.classes.items.find(c=>c.id==='ironwright').status,'playtest');
 assert.match(data.classes.items.find(c=>c.id==='ironwright').rulesHtml,/Rapid Fabrication/);
 assert.match(data.classes.items.find(c=>c.id==='ironwright').rulesHtml,/Recycle/);
 assert.ok(data.classes.items.find(c=>c.id==='gunslinger').definition);
 for(const c of data.classes.items){assert.ok(c.rulesHtml);assert.doesNotMatch(c.rulesHtml,/<script|javascript:| onerror=/i);}
});

test('seven core races have readable traits and searchable racial abilities',()=>{
 assert.equal(data.races.items.length,8);
 assert.ok(filterEntries(data,'races','darkvision').some(e=>e.id==='dwarves'));
 assert.ok(filterEntries(data,'races','skill focus').some(e=>e.id==='half-elves'));
 for(const r of data.races.items){assert.ok(r.description);assert.match(r.traitsHtml,/Languages/);assert.doesNotMatch(r.traitsHtml,/<script|javascript:| onerror=/i);}
});

test('class pages show attunement beside skills and use feminine generic pronouns',()=>{
 for(const c of data.classes.items){
  assert.match(c.rulesHtml,/Attunement Cap/);
  assert.equal(c.attunement.ability,'int');
  const prose=c.rulesHtml.replace(/<[^>]*>/g,' ');
  assert.doesNotMatch(prose,/\b(?:he|him|his|himself)\b/i);
 }
 assert.equal(data.classes.items.find(c=>c.id==='fighter').attunement.base,2);
 assert.equal(data.classes.items.find(c=>c.id==='wizard').attunement.base,3);
 assert.equal(data.classes.items.find(c=>c.id==='ironwright').attunement.base,4);
 const guns=data.classes.items.find(c=>c.id==='gunslinger');
 assert.doesNotMatch(guns.rulesHtml,/Implementation and balance status|pending a broader economy review|project.s duplicate/);
});

test('Gunslinger has the standard 20-level progression table',()=>{
 const c=data.classes.items.find(c=>c.id==='gunslinger');
 const table=c.rulesHtml.match(/<table id="gunslinger-progression">[\s\S]*?<\/table>/)[0];
 assert.equal((table.match(/<tr>/g)||[]).length,21);
 for(const heading of ['Base Attack Bonus','Fort Save','Ref Save','Will Save','Special'])assert.ok(table.includes(heading));
 assert.ok(table.includes('+20/+15/+10/+5'));
 assert.ok(table.includes('primary legendary handling'));
});
