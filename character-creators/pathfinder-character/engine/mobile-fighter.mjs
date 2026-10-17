import {archetypeIds} from './archetypes.mjs';
const level=c=>archetypeIds(c).includes('mobile-fighter')?(c.classes.fighter??0):0;
export function mobileEffects(c,conditions={}){
 const n=level(c),effects=[],add=(target,value,name)=>effects.push({kind:'modifier',target,value,name,bonusType:'untyped',featId:'archetype.'+name});
 if(n>=2&&conditions['class-option.agility'])for(const s of ['fortitude','reflex','will'])add('save.'+s,1+Math.floor((n-2)/4),'Agility');
 if(n>=5&&conditions['class-option.leaping-attack'])for(const target of ['attack.weapon','damage.weapon'])add(target,1+Math.floor((n-5)/4),'Leaping Attack');
 if(n>=15)add('speed.bonus',10,'Fleet Footed');
 return effects;
}
export function mobileScenarios(c){const n=level(c),rows=[];
 if(n>=2)rows.push({id:'mobile-agility',label:'Agility — saves against paralysis, slow or entangle',conditions:{'class-option.agility':true}});
 if(n>=5)rows.push({id:'leaping-attack',label:'Leaping Attack — moved at least 5 ft before attacking (no jump required)',conditions:{'class-option.leaping-attack':true}});
 return rows;
}
export function mobileSummary(c){const n=level(c);return n?{fighterLevel:n,rapidAttack:n>=11,fleetFooted:n>=15,acrobaticsTake20UsesPerDay:n>=15?Math.floor(n/5):0,whirlwindBlitz:n>=20}:null;}
