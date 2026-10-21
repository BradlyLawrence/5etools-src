import {newCharacter,materialize} from './character.mjs';
import {selectStartingFeat} from './feats.mjs';
import {equip,techEvent} from './equipment.mjs';

// A fresh, unsaved example on every invocation; never replaces a roster entry.
export function sheetExample(rules){
 const c=newCharacter();
 c.name='Brassjaw — the improbable adventurer';
 Object.assign(c.builder,{targetLevel:13,classOrder:['barbarian','barbarian','barbarian','sorcerer','sorcerer','sorcerer','ironwright','ironwright','ironwright',...Array(4).fill('sorcerer')],orderConfirmed:true,raceId:'humans',flexAbility:'str',method:'manual',baseScores:{str:14,dex:12,con:14,int:12,wis:10,cha:14},increases:['cha','str','cha'],favoredClasses:['barbarian'],favoredRewards:['hp','hp','hp'],identity:{alignment:'Chaotic good',appearance:'Soot-stained coat, copper spectacles, a spectacularly impractical axe.'},classOptions:{'sorcerer-bloodline':'draconic','bloodline-dragon':'red'},skills:{'craft:weapons':{normal:6,background:0},'knowledge-arcana':{normal:3,background:0},perception:{normal:6,background:0},intimidate:{normal:6,background:0},spellcraft:{normal:3,background:0}},spellcasting:{sorcerer:{known:{0:['detect-magic','light','mage-hand','prestidigitation','read-magic','ray-of-frost','acid-splash'],1:['magic-missile','shield','burning-hands','feather-fall','grease'],2:['mirror-image','invisibility','scorching-ray'],3:['fireball','haste']}}}});
 c.notes='Example character for building the sheet. Barbarian 3 / Sorcerer 7 / Ironwright 3. Manual ability scores and average HP after first level. Remaining build choices are deliberately listed for review.\n\nTactics: check spellcasting restrictions before raging. Keep fuel for the moment that matters.';
 selectStartingFeat(c,rules,'level-7','extend-spell');
 selectStartingFeat(c,rules,'level-9','empower-spell');
 selectStartingFeat(c,rules,'sorcerer-bonus-7','improved-initiative');
 equip(c,rules,'weaponId','greataxe');
 equip(c,rules,'armorId','chain-shirt');
 c.carriedEquipment??={};c.carriedEquipment['chain-shirt']=1;
 const tech=rules.equipment.items.find(i=>i.tech&&i.kind==='weapon');
 if(tech)techEvent(c,rules,{type:'add',itemId:tech.id,instanceId:'brassjaw-tech-weapon'});
 return materialize(c);
}
