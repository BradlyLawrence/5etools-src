import {archetypeIds} from './archetypes.mjs';
import data from './martial-options-data.mjs';
export const polearmLevel=c=>archetypeIds(c).includes('polearm-master')?(c.classes.fighter??0):0;
export const polearmWeapon=w=>!!w&&(w.tech?.family==='spears'||data.weaponGroups.filter(g=>['spears','polearms'].includes(g.id)).some(g=>g.weapons.includes(w.id)));
export function polearmEffects(c,w,conditions={}){
 const n=polearmLevel(c),out=[],add=(target,value,name,bonusType='untyped')=>out.push({kind:'modifier',target,value,name,bonusType,featId:'archetype.'+name});
 if(polearmWeapon(w)&&c.context?.attackType==='melee'){
 if(n>=5)for(const target of ['attack.weapon','damage.weapon'])add(target,1+Math.floor((n-5)/4),'Polearm Training');
 if(n>=2&&w.traits.includes('reach')&&conditions['class-option.short-grip'])add('attack.weapon',Math.min(0,-4+Math.floor((n-2)/4)),'Pole Fighting');
 if(n>=3&&conditions['class-option.steadfast-pike'])add('attack.weapon',1+Math.floor((n-3)/4),'Steadfast Pike');
 }
 if(n>=17&&conditions['class-option.step-aside'])add('ac',2,'Step Aside','dodge');
 if(n>=19&&polearmWeapon(w)&&conditions['class-option.polearm-parry'])add('ac',2,'Polearm Parry','shield');
 return out;
}
export function polearmScenarios(c,w){const n=polearmLevel(c),rows=[],add=(id,label,conditions)=>rows.push({id,label,conditions});if(polearmWeapon(w)&&c.context?.attackType==='melee'){
 if(n>=2&&w.traits.includes('reach')){add('short-grip','Pole Fighting — shortened grip against adjacent targets',{'class-option.short-grip':true});if(n>=3)add('short-grip-pike','Shortened grip + readied attack / attack of opportunity',{'class-option.short-grip':true,'class-option.steadfast-pike':true});}
 if(n>=3)add('steadfast-pike','Steadfast Pike — readied attack / attack of opportunity',{'class-option.steadfast-pike':true});
 if(n>=19)add('polearm-parry','Polearm Parry — one melee attack from a threatened, nonadjacent enemy; DR 5/—',{'class-option.polearm-parry':true});}
 if(n>=17)add('step-aside','Step Aside — AC against the triggering opponent only',{'class-option.step-aside':true});return rows;}
export function polearmSummary(c,w,stats){const n=polearmLevel(c);if(!n)return null;const eligible=polearmWeapon(w)&&c.context?.attackType==='melee',weaponBonus=stats.attack.breakdown.filter(e=>e.applied&&e.target==='attack.weapon').reduce((v,e)=>v+e.value,0);
 return {eligible,shortGrip:eligible&&n>=2&&w.traits.includes('reach'),gripPenalty:Math.min(0,-4+Math.floor((n-2)/4)),training:eligible&&n>=5?1+Math.floor((n-5)/4):0,pike:eligible&&n>=3?1+Math.floor((n-3)/4):0,flexibleFlanker:n>=9,sweepingFend:eligible&&n>=13?{bullRush:stats['maneuver.bull-rush.check'].total+weaponBonus-4,trip:stats['maneuver.trip.check'].total-(w.traits.includes('trip')?0:4),tripPenalty:w.traits.includes('trip')?0:-4}:null,stepAside:n>=17,parry:eligible&&n>=19,weaponMastery:eligible&&n>=20&&c.builder?.classOptions?.['polearm-mastery']===w.id};}
