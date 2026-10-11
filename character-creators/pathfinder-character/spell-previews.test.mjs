import test from 'node:test';
import assert from 'node:assert/strict';
import {spellBrief} from './spellcasting-ui.mjs';
import {SPELLCASTING} from './engine/spellcasting.mjs';
test('spell previews describe the effect rather than the spell stat block',()=>{
 const fortune=SPELLCASTING.spells.find(s=>s.name==="Crafter's Fortune");
 assert.match(spellBrief(fortune.id),/\+5 luck bonus.*Craft skill check/);
 assert.doesNotMatch(spellBrief(fortune.id),/Casting Time|School transmutation/);
 assert.match(spellBrief('burning-hands'),/1d4 points of fire damage/);
 assert.equal(spellBrief('missing-spell'),'');
 for(const s of SPELLCASTING.spells)assert.ok(spellBrief(s.id).length<=420);
});
