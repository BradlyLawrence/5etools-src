import {archetypeIds} from './archetypes.mjs';
import {shieldKind} from './phalanx.mjs';
export const shieldedLevel=c=>archetypeIds(c).includes('shielded-fighter')?(c.classes.fighter??0):0;
const bashIds=['shield-light','shield-heavy','spiked-shield-light','spiked-shield-heavy'];
export function shieldedSummary(c,e,conditions={},feats=[]){
 const n=shieldedLevel(c);if(!n)return null;
 const held=!!e?.shield&&(e.weapon?.handling!=='two-handed'||!!e.weapon?.phalanxOneHanded),kind=shieldKind(e?.shield);
 const totalDefense=!!conditions['class-option.shielded-total-defense'];
 const defensive=held&&(c.equipment?.fightingDefensively||totalDefense||(c.context?.combatExpertiseActive&&feats.some(f=>f.active&&f.featId==='combat-expertise')));
 const bonus=n>=3?1+Math.floor((n-3)/4):0;
 return {held,activeDefense:bonus,activeDefenseApplied:defensive?bonus:0,totalDefense,shieldFighter:n>=5&&held&&bashIds.includes(e?.weapon?.id)?1+Math.floor((n-5)/4):0,buffet:held&&n>=9?{action:n>=13?'swift':'move',penalty:-2}:null,guardSquares:held&&n>=17?({heavy:2,tower:3}[kind]??1):0,damageReduction:held&&n>=19?5:0,ward:held&&n>=20,wardBonus:held&&n>=20?(e.shield.baseDefenseBonus??e.shield.defense.bonus):0};
}
export function shieldedEffects(c,e,conditions={},feats=[]){const s=shieldedSummary(c,e,conditions,feats);if(!s)return [];const effects=[],add=(target,value,name,bonusType='untyped')=>{if(value)effects.push({kind:'modifier',target,value,name,bonusType,featId:'archetype.'+name});};add('ac',s.activeDefenseApplied,'Active Defense','dodge');if(s.totalDefense)add('ac',(c.skillRanks.acrobatics??0)>=3?6:4,'Total defense','dodge');for(const target of ['attack.weapon','damage.weapon'])add(target,s.shieldFighter,'Shield Fighter');add('save.reflex',s.wardBonus,'Shield Ward');return effects;}
export function shieldedScenarios(c,e){return shieldedLevel(c)>=3&&shieldedSummary(c,e)?.held&&!c.equipment?.fightingDefensively&&!c.context?.combatExpertiseActive?[{id:'shielded-total-defense',label:'Total defense — no attacks or attacks of opportunity',conditions:{'class-option.shielded-total-defense':true}}]:[];}
export function shieldBuffetResult(s,succeeded){return s?.buffet&&succeeded===true?{attackPenalty:-2,acPenalty:-2,damage:0}:{attackPenalty:0,acPenalty:0,damage:0};}
