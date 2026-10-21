import {sheetExample} from './sheet-example.mjs';
import {materialize} from './character.mjs';
import {selectStartingFeat} from './feats.mjs';
import {saveHomebrewFeat,withHomebrew,exportHomebrewFeat,readHomebrewFeats} from './homebrew-feats.mjs';
import {saveCharacter} from './roster.mjs';
import {createPackage} from './transfer.mjs';
export const GREAtAXE_TEST_FEAT={id:'homebrew:feat:brassjaw-greataxe-practice',name:'Greataxe Practice (test)',description:'Gain +1 on attack rolls with the weapon selected for this feat. For this test, select greataxe. Other weapons and damage rolls are unchanged.',combat:true,parameter:'weaponId',prerequisites:[{kind:'weapon-proficiency',selection:'weaponId'}],effects:[{kind:'modifier',activation:'passive',target:'attack.all',bonusType:'untyped',value:1,condition:'selected-weapon'}]};
export function brassjawFeatExample(core){
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const feat=saveHomebrewFeat(storage,GREAtAXE_TEST_FEAT,core),rules=withHomebrew(core,storage),character=sheetExample(rules);
 character.name='Brassjaw — greataxe feat test';
 selectStartingFeat(character,rules,'starting',feat.id,'greataxe');
 saveCharacter(storage,materialize(character),'brassjaw-greataxe-feat-test');
 return {package:createPackage(storage,{characters:['brassjaw-greataxe-feat-test']}),featFile:exportHomebrewFeat(feat,readHomebrewFeats(storage)),rules,character};
}
