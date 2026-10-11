import test from 'node:test';
import assert from 'node:assert/strict';
import {newCharacter,calculate} from './character.mjs';
import {spellcasting,setSpell,SPELLCASTING} from './engine/spellcasting.mjs';
import {renderSpellcasting} from './spellcasting-ui.mjs';
import {exportCharacter,parseCharacter} from './roster.mjs';
import {equipmentSheet} from './equipment.mjs';
import {readFile} from 'node:fs/promises';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
function make(cls,level,score=16){const c=newCharacter();c.builder.classOrder=Array(level).fill(cls);c.builder.targetLevel=level;c.builder.baseScores[SPELLCASTING.classes[cls].ability]=score;return c;}
const cast=c=>spellcasting(c,calculate(c));const pick=(c,cls,kind,level,index,id)=>setSpell(c,calculate(c),cls,kind,level,index,id);
test('imported casting tables cover all nine classes and 20 levels',()=>{
 assert.equal(Object.keys(SPELLCASTING.classes).length,9);
 for(const def of Object.values(SPELLCASTING.classes)){assert.equal(def.daily.length,20);if(def.mode==='known')assert.equal(def.known.length,20);}
 const w=cast(make('wizard',1))[0];assert.equal(w.rows.find(r=>r.level===1).slots,2);assert.equal(w.rows.find(r=>r.level===0).slots,3);
});
test('multiclass casters keep independent known counts and daily slots',()=>{
 const c=make('wizard',3);c.builder.classOrder.push('sorcerer','sorcerer','sorcerer');c.builder.baseScores.cha=14;const s=cast(c);
 assert.equal(s[0].casterLevel,3);assert.equal(s[1].casterLevel,3);assert.equal(s[0].rows.find(r=>r.level===2).slots,2);assert.ok(!s[1].rows.some(r=>r.level===2));assert.equal(s[1].rows.find(r=>r.level===1).knownCount,3);
});
test('paladin and ranger unlock at class level 4 with zero base slots and ability bonuses',()=>{
 assert.equal(cast(make('paladin',3))[0].rows.length,0);const low=cast(make('ranger',4,11))[0],high=cast(make('ranger',4,12))[0];assert.equal(low.rows[0].slots,0);assert.equal(high.rows[0].slots,1);assert.equal(high.casterLevel,1);
 const incapable=cast(make('wizard',5,11))[0];assert.equal(incapable.rows.find(r=>r.level===3).slots,0);assert.equal(incapable.rows.find(r=>r.level===3).eligible,false);
});
test('spontaneous known choices enforce quotas and bloodline spells do not consume normal choices',()=>{
 const c=make('sorcerer',3);c.builder.classOptions={'sorcerer-bloodline':'draconic'};const row=cast(c)[0].rows.find(r=>r.level===1);assert.ok(row.automatic.includes('mage-armor'));
 pick(c,'sorcerer','known',1,0,'magic-missile');assert.throws(()=>pick(c,'sorcerer','known',1,1,'magic-missile'));assert.throws(()=>pick(c,'sorcerer','known',1,1,'mage-armor'));assert.throws(()=>pick(c,'sorcerer','prepared',1,0,'magic-missile'));
 assert.equal(cast(parseCharacter(exportCharacter(c)))[0].rows.find(r=>r.level===1).selected[0],'magic-missile');
});
test('wizard book and opposition preparation costs interact; specialists have a separate school slot',()=>{
 const c=make('wizard',3,18);c.builder.classOptions={'wizard-school':'evocation','wizard-opposition-1':'enchantment','wizard-opposition-2':'illusion'};
 assert.throws(()=>pick(c,'wizard','prepared',1,0,'magic-missile'));pick(c,'wizard','book',1,0,'magic-missile');pick(c,'wizard','book',1,1,'charm-person');pick(c,'wizard','prepared',1,0,'charm-person');pick(c,'wizard','prepared',1,1,'magic-missile');
 assert.equal(cast(c)[0].rows.find(r=>r.level===1).used,3);assert.throws(()=>pick(c,'wizard','prepared',1,2,'charm-person'));pick(c,'wizard','special',1,0,'magic-missile');assert.throws(()=>pick(c,'wizard','special',1,0,'charm-person'));
 c.builder.classOptions['wizard-school']='universalist';assert.equal(cast(c)[0].rows.find(r=>r.level===1).specialSlots,0);assert.ok(cast(c)[0].issues.some(x=>x.includes('specialist preparation')));pick(c,'wizard','special',1,0,'');
});
test('cleric and druid domains provide restricted extra preparation; inquisitor domain does not',()=>{
 const c=make('cleric',1);c.builder.classOptions={'cleric-domain-1':'fire','cleric-domain-2':'healing'};pick(c,'cleric','special',1,0,'burning-hands');assert.throws(()=>pick(c,'cleric','prepared',1,0,'burning-hands'));pick(c,'cleric','prepared',1,0,'bless');
 const d=make('druid',1);d.builder.classOptions={'druid-bond':'domain','druid-domain':'fire'};assert.equal(cast(d)[0].rows.find(r=>r.level===1).specialSlots,1);
 const i=make('inquisitor',1);i.builder.classOptions={'inquisitor-domain':'fire'};assert.equal(cast(i)[0].rows.find(r=>r.level===1).specialSlots,0);assert.ok(cast(i)[0].rows.find(r=>r.level===1).options.some(s=>s.id==='cure-light-wounds'));
});
test('alchemist formula list includes core and imported formulae and uses extract slots',()=>{
 const c=make('alchemist',4);const rows=cast(c)[0].rows;assert.ok(!rows.some(r=>r.level===0));assert.ok(rows.find(r=>r.level===1).options.some(s=>s.id==='cure-light-wounds'));assert.ok(rows.find(r=>r.level===2).options.some(s=>s.id==='alchemical-allocation'));
 pick(c,'alchemist','book',2,0,'alchemical-allocation');pick(c,'alchemist','prepared',2,0,'alchemical-allocation');assert.throws(()=>pick(c,'alchemist','book',1,0,'magic-missile'));
});
test('lowering levels preserves unavailable choices for review without granting slots',()=>{
 const c=make('wizard',5);pick(c,'wizard','book',3,0,'fireball');pick(c,'wizard','prepared',3,0,'fireball');c.builder.classOrder=['wizard'];const s=cast(c)[0];assert.ok(!s.rows.some(r=>r.level===3));assert.ok(s.issues.some(x=>x.includes('saved level 3')));
});
test('spell focus affects displayed spell DC and prepared cantrips are at will',()=>{
 const c=make('wizard',1);c.feats=[{featId:'spell-focus'}];c.ruleState={choices:{'spell-focus-school':'evocation'},spent:{},toggles:{},conditions:{}};pick(c,'wizard','book',1,0,'magic-missile');pick(c,'wizard','prepared',1,0,'magic-missile');pick(c,'wizard','prepared',0,0,'detect-magic');
 assert.match(renderSpellcasting(c,equipmentSheet(c,rules)),/Magic Missile.*DC 15/);assert.equal(cast(c)[0].rows[0].atWill,true);
});
