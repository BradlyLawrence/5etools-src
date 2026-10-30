import {evaluateCharacter} from './engine/homebrew.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newCharacter,calculate,materialize} from './character.mjs';
import {spellcasting} from './engine/spellcasting.mjs';
import {prestigeIssues,prestigeSummary,castingLevels} from './engine/justiciar.mjs';
import {smiteLevel,bloodlineLevel} from './engine/practiced.mjs';
import {paladinSummary} from './engine/paladin-archetypes.mjs';
import {setArchetype,conflicts} from './engine/archetypes.mjs';
import {featSlots} from './engine/feat-progression.mjs';
import {selectStartingFeat} from './feats.mjs';
import {equipmentSheet,equip,sheetCharacter} from './equipment.mjs';
import {parseCharacter,exportCharacter} from './roster.mjs';
import {renderPrestigeSummary} from './justiciar-ui.mjs';
const rules=JSON.parse(await readFile(new URL('rules.json',import.meta.url),'utf8'));
const build=(id='wyrmward-justiciar',mounted=true)=>{
 const c=newCharacter();c.builder.classOrder=[...Array(5).fill('paladin'),'sorcerer','sorcerer',...Array(10).fill(id)];c.builder.targetLevel=17;c.builder.baseScores={str:16,dex:14,con:14,int:14,wis:14,cha:18};c.builder.raceId='dragonborn';c.builder.skills={spellcraft:{normal:5,background:0}};
 c.builder.classOptions={'sorcerer-bloodline':'draconic','bloodline-dragon':'red','justiciar-heritage':'dragonborn','justiciar-induction':'confirmed',[id+'-arcane']:'sorcerer',[id+'-divine']:'paladin',[id+'-path']:mounted?'mounted':'standard','paladin-bond':'mount','paladin-mount':'muralis'};setArchetype(c,'shining-knight',true);setArchetype(c,'oath-against-wizardry',true);return c;
};
test('Justiciar and Theurge separate actual, casting, mount and feature levels',()=>{
 for(const id of ['wyrmward-justiciar','covenant-theurge']){const c=build(id),r=calculate(c),m=materialize(c),p=paladinSummary(m),s=spellcasting(c,r);
 assert.deepEqual(prestigeIssues(m),[]);assert.equal(r.bab,id==='wyrmward-justiciar'?16:13);assert.equal(s.find(x=>x.id==='sorcerer').level,10);assert.equal(s.find(x=>x.id==='paladin').level,id==='covenant-theurge'?13:5);assert.equal(p.mount.effectiveDruidLevel,15);assert.equal(p.mount.celestial,false);assert.equal(p.mount.spellResistance,0);assert.equal(p.smiteUses,2);assert.equal(bloodlineLevel(m),2);
 assert.equal(prestigeSummary(m)[0].interdict,id==='wyrmward-justiciar');assert.equal(featSlots(c).filter(x=>x.name.startsWith('Order Training')).length,id==='wyrmward-justiciar'?1:0);
 }
});
test('chronological entry, ten-level cap, variant exclusion and Holy Light gate',()=>{
 const c=build();setArchetype(c,'warrior-of-the-holy-light',true);assert.deepEqual(prestigeIssues(materialize(c)),[]);assert.equal(spellcasting(c,calculate(c)).some(x=>x.id==='paladin'),false);
 const t=build('covenant-theurge');setArchetype(t,'warrior-of-the-holy-light',true);assert.match(prestigeIssues(materialize(t)).join(' '),/divine casting/);
 const early=build();early.builder.classOrder=['wyrmward-justiciar',...early.builder.classOrder];assert.match(prestigeIssues(materialize(early)).join(' '),/ten levels|BAB/);
 const both=build();both.builder.classOrder[16]='covenant-theurge';assert.match(prestigeIssues(materialize(both)).join(' '),/variants/);
});
test('repeatable feats selected at legal levels do not increase actual class features',()=>{
 const c=build();selectStartingFeat(c,rules,'level-9','practiced-smite');selectStartingFeat(c,rules,'level-11','practiced-smite');selectStartingFeat(c,rules,'level-13','practiced-bloodline');selectStartingFeat(c,rules,'level-15','practiced-bloodline');
 const m=materialize(c);assert.equal(smiteLevel(m),13);assert.equal(bloodlineLevel(m),10);assert.equal(paladinSummary(m).wizardry.maximumSpellLevel,5);assert.equal(paladinSummary(m).smiteUses,2);assert.equal(castingLevels(m).sorcerer,10);assert.throws(()=>selectStartingFeat(c,rules,'level-3','practiced-smite'));
 const restored=parseCharacter(exportCharacter(c));assert.deepEqual(restored.feats,c.feats);
});
test('robe changes availability and maxima without resetting consumed breath uses',()=>{
 const c=build();for(const at of [9,11,13])selectStartingFeat(c,rules,'level-'+at,'practiced-bloodline');c.builder.classOptions['bloodline-robe']='worn';
 c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};c.ruleState.spent['bloodline.draconic-breath.uses']=2;
 for(const worn of ['worn','not-worn','worn']){c.builder.classOptions['bloodline-robe']=worn;const s=equipmentSheet(c,rules);assert.equal(s.bloodline.level,worn==='worn'?17:14);assert.equal(s.abilities.resources['bloodline.draconic-breath.uses'].remaining,0);}
});
test('Wizardry removes ordinary damage, retains conditional attacks and allows Holy Light/Shining Knight',()=>{
 const c=build();assert.equal(conflicts(c,'warrior-of-the-holy-light').length,0);assert.ok(conflicts(c,'hospitaler').length);assert.ok(conflicts(c,'oath-of-loyalty').length);
 c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};c.ruleState.toggles['paladin.smite-evil']=true;
 const s=evaluateCharacter(rules,sheetCharacter(c),{'smite-target':true});assert.equal(s.abilities.effects.some(e=>e.sourceId==='paladin.smite-evil'&&e.target.startsWith('damage.')),false);assert.ok(s.abilities.effects.some(e=>e.sourceId==='paladin.smite-evil'&&e.target==='attack.all'));
});
test('armour reduction is specific to progressed arcane class and leaves shield failure',()=>{
 for(const id of ['wyrmward-justiciar','covenant-theurge']){const c=build(id);const armor=rules.equipment.items.find(x=>x.kind==='armor'&&x.category==='heavy'&&!x.tech&&x.defense.arcaneFailurePercent===35);assert.ok(armor);equip(c,rules,'armorId',armor.id);const s=equipmentSheet(c,rules);assert.equal(s.equipment.arcaneFailureByClass.sorcerer,id==='wyrmward-justiciar'?0:15);assert.equal(s.equipment.arcaneFailurePercent,35);}
});
test('Theurge armour feats stack with passive reduction, shield stays and tech requires proficiency',()=>{
 const c=build('covenant-theurge');c.feats=[{featId:'arcane-armor-training'},{featId:'arcane-armor-mastery'}];c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};c.ruleState.toggles['feat.arcane-armor-mastery']=true;
 const armor=rules.equipment.items.find(x=>x.kind==='armor'&&x.category==='heavy'&&!x.tech&&x.defense.arcaneFailurePercent===35);equip(c,rules,'armorId',armor.id);equip(c,rules,'shieldId','buckler');assert.equal(equipmentSheet(c,rules).equipment.arcaneFailureByClass.sorcerer,5);
 for(const armorId of ['reinforced-work-harness','riveted-strider-suit','full-plate-bulwark']){equip(c,rules,'armorId',armorId);const before=JSON.stringify(c),s=equipmentSheet(c,rules);assert.ok(Number.isFinite(s.equipment.arcaneFailureByClass.sorcerer));assert.ok(s.equipment.arcaneFailureByClass.sorcerer>=5);assert.equal(JSON.stringify(c),before);}
});
test('normal smite gains practiced damage but not uses; bloodline bonus spells stay actual-level',()=>{
 const c=build();setArchetype(c,'oath-against-wizardry',false);selectStartingFeat(c,rules,'level-9','practiced-smite');c.ruleState??={choices:{},spent:{},toggles:{},conditions:{}};c.ruleState.toggles['paladin.smite-evil']=true;
 const s=evaluateCharacter(rules,sheetCharacter(c),{'smite-target':true});assert.equal(s.abilities.effects.find(e=>e.sourceId==='paladin.smite-evil'&&e.target==='damage.melee').value,9);assert.equal(s.abilities.resources['paladin.smite-evil.uses'].maximum,2);
 const sorc=spellcasting(c,calculate(c)).find(x=>x.id==='sorcerer');assert.equal(sorc.rows.flatMap(x=>x.automatic).length,0);
});
test('progression rendering, variant persistence and prerequisite dequalification',()=>{
 const c=build(),s=equipmentSheet(c,rules);assert.match(renderPrestigeSummary(s.prestige,s.bloodline),/Full prestige progression/);
 const saved=exportCharacter(c);saved.character.builder.classOrder[16]='covenant-theurge';assert.throws(()=>parseCharacter(saved),/mutually exclusive/);
 c.builder.classOptions['wyrmward-justiciar-arcane']='wizard';assert.equal(castingLevels(materialize(c)).sorcerer,2);assert.match(prestigeIssues(materialize(c)).join(' '),/spontaneous arcane/);
});
