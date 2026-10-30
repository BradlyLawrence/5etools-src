import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {newCharacter,calculate,materialize} from './character.mjs';
import {equipmentSheet} from './equipment.mjs';
import {scoundrelSummary,scoundrelSpecs,selectedScoundrelTalents,retainsScoundrel,scoundrelEffects} from './engine/scoundrel.mjs';
import {featSlots} from './engine/feat-progression.mjs';
import {setClassChoice,renderClassChoices} from './class-choices.mjs';
import {parseCharacter,exportCharacter,saveCharacter,readRoster} from './roster.mjs';
import {createPackage,planImport,applyImport,readTransferData} from './transfer.mjs';
import {renderCombatSheet} from './combat-spells.mjs';
import {bowProfile} from './engine/bows.mjs';
import {stackModifiers} from './engine/homebrew.mjs';
const rules=JSON.parse(fs.readFileSync(new URL('rules.json',import.meta.url)));
function build(n=10,a='base'){
 const c=newCharacter();c.builder.classOrder=Array(n).fill('scoundrel');c.builder.targetLevel=n;c.builder.baseScores={str:12,dex:18,con:14,int:14,wis:10,cha:16};c.builder.classOptions={'scoundrel-archetype':a,'scoundrel-expertise-1':'stealth','scoundrel-expertise-2':'bluff','scoundrel-talent-2':'finesse-rogue'};c.equipment={...c.equipment,weaponId:'dagger',size:'medium'};return c;
}
test('all archetypes use class-level chassis through twenty and retain replacements',()=>{
 for(const a of ['base','confidence-artist','masked-duelist','outlaw','tech-scoundrel'])for(let n=1;n<=20;n++){
 const c=build(n,a),r=calculate(c),s=scoundrelSummary(materialize(c));assert.equal(r.bab,Math.floor(n*.75));assert.equal(r.saves.fortitude,Math.floor(n/3));assert.equal(r.saves.reflex,2+Math.floor(n/2));assert.equal(r.saves.will,2+Math.floor(n/2));assert.equal(s.progression.length,20);assert.equal(s.expertiseBonus,2+Math.floor((n-1)/4));assert.equal(retainsScoundrel(materialize(c),'cunning-feint'),a==='base'&&n>=2);
 assert.doesNotThrow(()=>equipmentSheet(c,rules));
 }
});
test('talent gates, duplicates, prerequisites and independent bonus-feat slots',()=>{
 const c=build(10);setClassChoice(c,rules,'scoundrel-talent-4','combat-trick');setClassChoice(c,rules,'scoundrel-talent-6','weapon-training');assert.throws(()=>setClassChoice(c,rules,'scoundrel-talent-8','combat-trick'));
 assert.equal(featSlots(c).filter(s=>s.id.startsWith('scoundrel-talent-feat')).length,2);
 assert.throws(()=>setClassChoice(c,rules,'scoundrel-talent-8','improved-evasion'));
 setClassChoice(c,rules,'scoundrel-talent-10','improved-evasion');assert.ok(selectedScoundrelTalents(materialize(c)).some(t=>t.id==='improved-evasion'));
 setClassChoice(c,rules,'scoundrel-archetype','tech-scoundrel');assert.ok(!selectedScoundrelTalents(materialize(c)).some(t=>t.id==='improved-evasion'));
 assert.ok(equipmentSheet(c,rules).feats.some(f=>f.active&&f.featId==='weapon-finesse'));
});
test('Masked Duelist replaces strength damage and loses free-hand defenses with a shield',()=>{
 const c=build(6,'masked-duelist'),s=equipmentSheet(c,rules);assert.equal(s.stats.damage.base,4);assert.ok(s.feats.some(f=>f.featId==='improved-feint'&&f.active));assert.ok(s.stats.ac.breakdown.some(x=>x.name==='Confident Defence'&&x.applied));
 c.equipment.shieldId='shield-light-wooden';const shield=rules.equipment.items.find(x=>x.kind==='shield');c.equipment.shieldId=shield.id;
 const blocked=equipmentSheet(c,rules);assert.equal(blocked.stats.damage.base,1);assert.ok(!blocked.stats.ac.breakdown.some(x=>x.name==='Confident Defence'&&x.applied));
});
test('expertise is competence, tier choices are gated, and Con Artist initiative uses positive charisma',()=>{
 const c=build(4),m=materialize(c),spec=scoundrelSpecs(m).find(x=>x.id==='scoundrel-strike-4');assert.ok(spec.options.every(x=>x.minimumClassLevel<=4));assert.equal(scoundrelEffects(m).find(x=>x.target==='skill.stealth').bonusType,'competence');
 const base=equipmentSheet(build(8),rules),con=equipmentSheet(build(8,'confidence-artist'),rules);assert.equal(con.stats.initiative.total-base.stats.initiative.total,3);
});
test('Outlaw improves bow draw only; Tech Scoundrel changes only its personal dagger dice',()=>{
 const c=materialize(build(3,'outlaw')),bow=rules.equipment.items.find(w=>w.id==='war-bow');c.equipment.bowStrengthRating=2;
 assert.equal(bowProfile(bow,c).attackPenalty,0);assert.equal(bowProfile(bow,c).strengthDamage,1);c.builder.classOptions['scoundrel-archetype']='base';assert.equal(bowProfile(bow,c).attackPenalty,-2);
 const t=build(3,'tech-scoundrel');t.equipment.weaponId='vibro-dagger';const original=structuredClone(rules.equipment.items.find(w=>w.id==='vibro-dagger'));
 const upgraded=equipmentSheet(t,rules);assert.match(JSON.stringify(upgraded.equipment),/1d6/);assert.deepEqual(rules.equipment.items.find(w=>w.id==='vibro-dagger'),original);
 t.builder.classOptions['scoundrel-archetype']='base';assert.notDeepEqual(upgraded.equipment.damageDice,equipmentSheet(t,rules).equipment.damageDice);
});
test('Cunning Feint is prerequisite equivalence only, and Expertise competence bonuses do not stack',()=>{
 const c=build(8),s=equipmentSheet(c,rules);assert.ok(!s.feats.some(f=>f.featId==='improved-feint'));const feat=s.eligibility.find(f=>f.featId==='greater-feint');assert.ok(feat.prerequisites.find(p=>p.featId==='improved-feint').met);assert.ok(!feat.prerequisites.find(p=>p.featId==='combat-expertise').met);
 const effect=scoundrelEffects(materialize(c)).find(x=>x.target==='skill.stealth');assert.equal(stackModifiers([effect,{...effect,value:5,name:'Equipment competence'}]).total,5);
 c.builder.classOptions['scoundrel-archetype']='tech-scoundrel';assert.equal(equipmentSheet(c,rules).eligibility.find(f=>f.featId==='greater-feint').prerequisites.find(p=>p.featId==='improved-feint').met,false);
});
test('advancing volley affects only the conditional bow attack and damage row',()=>{
 for(const [level,bonus]of [[3,2],[9,3],[15,4]]){const c=build(level,'outlaw');c.equipment.weaponId='hunting-bow';const sheet=equipmentSheet(c,rules),row=sheet.sheetRows.find(r=>r.id==='normal|scoundrel-advancing');assert.equal(row.stats.attack.total-sheet.stats.attack.total,bonus);assert.equal(row.stats.damage.total-sheet.stats.damage.total,bonus);c.equipment.weaponId='dagger';const melee=equipmentSheet(c,rules);assert.equal(melee.sheetRows.find(r=>r.id==='normal|scoundrel-advancing').stats.attack.total,melee.stats.attack.total);}
});
test('extra strike selections survive saves but disappear when the feature is replaced',()=>{
 const c=build(10);c.feats.push({featId:'extra-debilitating-strike'});let m=materialize(c);assert.equal(scoundrelSpecs(m).filter(s=>s.id.startsWith('scoundrel-strike-')).length,3);assert.ok(equipmentSheet(c,rules).feats.some(f=>f.featId==='extra-debilitating-strike'&&f.active));
 c.builder.classOptions['scoundrel-archetype']='outlaw';m=materialize(c);assert.ok(!scoundrelSpecs(m).some(s=>s.id.startsWith('scoundrel-strike-')));assert.ok(equipmentSheet(c,rules).feats.some(f=>f.featId==='extra-debilitating-strike'&&!f.active));assert.ok(equipmentSheet(c,rules).feats.some(f=>f.featId==='improved-called-shot'&&f.active));
});
test('Scoundrel save/reload, JSON and package roundtrips preserve choices and numeric effects',()=>{
 const c=build(10,'masked-duelist');setClassChoice(c,rules,'scoundrel-talent-4','combat-trick');const expected=equipmentSheet(c,rules).stats;
 const restored=parseCharacter(exportCharacter(c));assert.deepEqual(equipmentSheet(restored,rules).stats,expected);
 const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
 const a=storage(),b=storage();saveCharacter(a,c,'scoundrel-test');assert.deepEqual(readRoster(a).characters[0].character.builder.classOptions,c.builder.classOptions);
 const p=planImport(b,JSON.parse(JSON.stringify(createPackage(a))));applyImport(b,p,Object.fromEntries(p.rows.map(r=>[r.kind+':'+r.id,'import'])));const loaded=readTransferData(b).characters[0].character;assert.deepEqual(equipmentSheet(loaded,rules).stats,expected);assert.deepEqual(loaded.builder.classOptions,c.builder.classOptions);
 assert.match(renderClassChoices(loaded,rules),/Scoundrel talent/);assert.match(renderCombatSheet(loaded,rules),/GM adjudicates/);
});
