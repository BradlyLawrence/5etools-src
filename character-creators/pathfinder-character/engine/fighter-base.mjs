import {replacedFighterSlot,alteredFighterSlot} from './archetypes.mjs';
export const retainsFighter=(c,id)=>!replacedFighterSlot(c,id)&&!alteredFighterSlot(c,id);
export function fighterArmorTraining(c){const n=c.classes?.fighter??0;return [3,7,11,15].filter((l,i)=>n>=l&&retainsFighter(c,'armor-training-'+(i+1))).length;}
export const fighterMasteryAvailable=c=>(c.classes?.fighter??0)>=20&&retainsFighter(c,'weapon-mastery');
export function fighterBaseSummary(c,e){const n=c.classes?.fighter??0;if(!n)return null;return {armorTraining:fighterArmorTraining(c),armorMastery:n>=19&&retainsFighter(c,'armor-mastery')&&!!(e?.armor||e?.shieldApplies),masteryAvailable:fighterMasteryAvailable(c),weaponMastery:fighterMasteryAvailable(c)&&!!e?.weapon&&c.builder?.classOptions?.['fighter-mastery']===e.weapon.id};}
