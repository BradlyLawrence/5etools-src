import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate,materialize} from './character.mjs';
import {equip,equipmentSheet} from './equipment.mjs';
import {setArchetype,validateArchetypes,bardProgression} from './engine/archetypes.mjs';
import {bardSpecs,bardSummary,bardBonusSpells,weirdWordsDamage,BARD_ARCANE_SOURCES} from './engine/bard-archetypes.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
import {renderArchetypes} from './archetypes-ui.mjs';
import {setClassChoice,renderClassSheet} from './class-choices.mjs';
import {calculateSkills} from './skills.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('rules.json',import.meta.url),'utf8'));
const make=(n,...ids)=>{const c=newCharacter();c.builder.targetLevel=n;c.builder.classOrder=Array(n).fill('bard');c.builder.baseScores.cha=18;for(const id of ids)setArchetype(c,id,true);return c;};
const sheet=c=>equipmentSheet(c,rules),row=(s,id)=>s.sheetRows.find(r=>r.id.includes(id));
test('bard selector reserves individual slots, persists combinations and keeps progression outside disclosure',()=>{
 const c=make(10,'magician','sound-striker');validateArchetypes(c);assert.throws(()=>setArchetype(c,'dirge-bard',true),/conflicts/);
 const html=renderArchetypes(c);assert.match(html,/Bard archetypes/);assert.match(html,/<\/details><h3>Bard progression/);
 assert.match(html,/data-field="archetype.dirge-bard"\s+disabled/);
 const p=bardProgression(c);assert.ok(p[0].features.some(f=>f.id==='improved-counterspell'));assert.ok(!p.flatMap(r=>r.features).some(f=>f.id==='inspire-courage'));
 assert.ok(p[5].features.some(f=>f.id==='weird-words'));assert.ok(p[19].features.some(f=>f.id==='deadly-performance'));
 assert.deepEqual(parseCharacter(exportCharacter(c)).builder.archetypes.bard,['magician','sound-striker']);
 setArchetype(c,'magician',false);setArchetype(c,'dirge-bard',true);validateArchetypes(c);
});
test('Archivist Naturalist supports tech and mundane weapons without damage, proficiency or reservoir changes',()=>{
 for(const weapon of ['steam-axe','vibro-dagger','hunting-bow','long-bow']){
  const c=make(11,'archivist');equip(c,rules,'weaponId',weapon);const s=sheet(c),natural=row(s,'bard-naturalist');
  assert.equal(natural.stats.attack.total-s.stats.attack.total,3);assert.equal(natural.stats.ac.total-s.stats.ac.total,3);assert.equal(natural.stats.damage.total,s.stats.damage.total);
  assert.ok(natural.stats.attack.total);
  const b=make(11);equip(b,rules,'weaponId',weapon);assert.equal(s.equipment.proficient,sheet(b).equipment.proficient);
 }
});
test('bonus spell choices use enabled arcane lists, gained bard level, Charisma, source level and school',()=>{
 assert.deepEqual(BARD_ARCANE_SOURCES,['bard','sorcerer','wizard']);
 for(const [n,max] of [[2,1],[6,2],[10,4],[14,5],[18,6]]){
  const c=make(n,'dirge-bard');const spec=bardSpecs(materialize(c)).find(s=>s.id==='bard-bonus-spell-'+n);
  assert.equal(spec.maximumSpellLevel,max);assert.ok(spec.options.length);assert.ok(spec.options.every(o=>o.spellLevel<=max&&BARD_ARCANE_SOURCES.includes(o.sourceClass)));
 }
 const c=make(2,'dirge-bard');c.builder.classOrder.push(...Array(10).fill('wizard'));c.builder.targetLevel=12;
 const spec=bardSpecs(materialize(c)).find(s=>s.id==='bard-bonus-spell-2');assert.equal(spec.maximumSpellLevel,1);
 const picked=spec.options.find(o=>o.sourceClass==='wizard'&&o.spellLevel===1);setClassChoice(c,rules,spec.id,picked.id);
 const caster=spellcasting(c,calculate(c)).find(s=>s.id==='bard');assert.ok(caster.rows.find(r=>r.level===1).automatic.includes(picked.spellId));
 assert.equal(caster.rows.find(r=>r.level===1).slots,spellcasting(make(2),calculate(make(2))).find(s=>s.id==='bard').rows.find(r=>r.level===1).slots);
 assert.throws(()=>setClassChoice(c,rules,spec.id,picked.spellId+'|witch'),/available/);
 setArchetype(c,'dirge-bard',false);assert.equal(bardBonusSpells(materialize(c)).length,0);
});
test('Magician grants fixed feat, skill bonuses and bond without self-applied ally or tech bonuses',()=>{
 const c=make(16,'magician');setClassChoice(c,rules,'bard-arcane-bond','wand');const s=sheet(c);
 assert.ok(s.feats.some(f=>f.featId==='improved-counterspell'&&f.active));
 const skills=calculateSkills(c,calculate(c));assert.equal(skills.rows.find(r=>r.id==='spellcraft').total,8);assert.equal(skills.rows.find(r=>r.id==='tech-use').total,0);
 assert.equal(skills.rows.find(r=>r.id==='knowledge-history').total,0);
 assert.equal(s.bard.bond,'wand');assert.match(renderClassSheet(s,rules),/Wand Mastery/);
 setArchetype(c,'magician',false);assert.ok(!sheet(c).feats.some(f=>f.featId==='improved-counterspell'&&f.active));
});
test('Dirge and Court conditional benefits stay out of unconditional skills and saves',()=>{
 const d=make(10,'dirge-bard'),s=sheet(d),r=row(s,'bard-haunted-eyes');assert.equal(r.stats['save.will'].total-s.stats['save.will'].total,4);
 assert.equal(row(s,'bard-identify-undead').stats['skill.knowledge-religion'].total-s.stats['skill.knowledge-religion'].total,5);
 assert.match(renderClassSheet(s,rules),/Social consequences are determined by the GM/);
 const c=make(10,'court-bard'),skills=calculateSkills(c,calculate(c));assert.equal(skills.rows.find(r=>r.id==='diplomacy').total,9);assert.equal(skills.rows.find(r=>r.id==='knowledge-arcana').total,0);
 assert.equal(sheet(c).stats.attack.total,sheet(make(10)).stats.attack.total);
});
test('Weird Words uses one Charisma and resistance application per target, not weapon dice',()=>{
 const c=make(12,'sound-striker');const m=materialize(c);assert.deepEqual(weirdWordsDamage(m,3,10),{dice:12,die:6,bonus:4,resistance:10,average:36,performanceCost:3});
 assert.throws(()=>weirdWordsDamage(m,4),/Invalid/);equip(c,rules,'weaponId','steam-axe');assert.deepEqual(weirdWordsDamage(materialize(c),3,10),weirdWordsDamage(m,3,10));
});
test('retained Jack of All Trades and Versatile Performance work and replaced choices disappear',()=>{
 const a=make(11,'archivist');assert.equal(calculateSkills(a,calculate(a)).rows.find(r=>r.id==='disable-device').classSkill,true);
 const c=make(6,'sound-striker');setClassChoice(c,rules,'bard-versatile-2','oratory');c.builder.skills['perform:oratory']={normal:6,background:0};
 const skills=calculateSkills(c,calculate(c));assert.equal(skills.rows.find(r=>r.id==='diplomacy').total,13);
 assert.equal(sheet(c).stats['skill.diplomacy'].total,13);
 setArchetype(c,'magician',true);assert.ok(!bardSpecs(materialize(c)).some(s=>s.id.startsWith('bard-versatile')));assert.equal(calculateSkills(c,calculate(c)).rows.find(r=>r.id==='diplomacy').total,4);
});
test('bard archetypes preserve tech armour and shield penalties, defenses and reservoir capacity',()=>{
 for(const id of ['archivist','court-bard','magician','sound-striker','dirge-bard']){
  const c=make(10,id),base=make(10);
  for(const draft of [c,base]){equip(draft,rules,'weaponId','vibro-dagger');equip(draft,rules,'armorId','riveted-strider-suit');equip(draft,rules,'shieldId','tech-heavy-shield');}
  const a=sheet(c),b=sheet(base);
  assert.equal(a.stats.ac.total,b.stats.ac.total,id);
  assert.equal(a.stats.attack.total,b.stats.attack.total,id);
  assert.equal(a.stats.damage.total,b.stats.damage.total,id);
  const resources=d=>d.techEquipment.items.map(({instanceId,...item})=>item);
  assert.deepEqual(resources(c),resources(base));
 }
});

