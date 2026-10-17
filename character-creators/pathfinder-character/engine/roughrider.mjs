import {archetypeIds} from './archetypes.mjs';
export const roughriderLevel=c=>archetypeIds(c).includes('roughrider')?(c.classes.fighter??0):0;
export function roughriderSummary(c,e,conditions={}){const n=roughriderLevel(c);if(!n)return null;
 const mounted=!!(conditions['class-option.roughrider-mounted']||(conditions.mounted??c.ruleState?.conditions?.mounted)),adjacent=!!conditions['class-option.roughrider-adjacent'];
 return {mounted,adjacent,mountedWeaponAllowed:e?.weapon?.bow?.mountedUse!==false,mountDefense:n>=2?1+Math.floor((n-2)/4):0,mettle:n>=5?1+Math.floor((n-5)/4):0,mettleActive:n>=5&&(mounted||adjacent),armoredCharger:n>=3,leap:n>=7,rerolls:n>=11?1+Math.floor((n-11)/4):0,rideThemDown:n>=15,onslaught:n>=15,damageReduction:n>=19&&mounted?5:0,indomitable:n>=19};}
export function roughriderEffects(c,e,conditions={}){const s=roughriderSummary(c,e,conditions);if(!s)return [];const effects=[],add=(target,value,name)=>effects.push({kind:'modifier',target,value,name,bonusType:'untyped',featId:'archetype.'+name});
 if(s.armoredCharger&&e?.armor)add('skill.ride',-e.armor.defense.armorCheckPenalty,'Armored Charger');
 if(s.mettleActive&&(!s.mounted||s.mountedWeaponAllowed))for(const target of ['attack.weapon','damage.weapon'])add(target,s.mettle,'Mounted Mettle');return effects;}
export function roughriderScenarios(c,e){const n=roughriderLevel(c);if(n<5)return [];return [...(e?.weapon?.bow?.mountedUse===false?[]:[{id:'roughrider-mounted',label:'Mounted Mettle — mounted on your mount'+(n>=19?'; rider and mount DR 5/—':''),conditions:{'class-option.roughrider-mounted':true}}]),{id:'roughrider-adjacent',label:'Mounted Mettle — on foot adjacent to your mount',conditions:{'class-option.roughrider-adjacent':true,mounted:false}}];}
