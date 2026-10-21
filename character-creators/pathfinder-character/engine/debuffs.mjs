export const DEBUFFS={
 dazzled:{name:'Dazzled',text:'−1 attack. Apply −1 to sight-based Perception checks at the table; other Perception checks are unchanged.'},
 deafened:{name:'Deafened',text:'−4 initiative. At the table: sound-based Perception fails automatically; −4 opposed Perception; 20% failure chance for spells with verbal components.'},
 entangled:{name:'Entangled',text:'−2 attack, −4 Dexterity, half speed; cannot run or charge. At the table: anchored bonds may prevent movement; casting requires concentration DC 15 + spell level.'},
 exhausted:{name:'Exhausted',text:'−6 Strength and Dexterity, half speed; cannot run or charge. Replaces Fatigued penalties while active. Recovery is manual.'},
 shaken:{name:'Shaken',text:'−2 on attacks, saves, skills and ability checks (including initiative).'},
 sickened:{name:'Sickened',text:'−2 on attacks, weapon damage, saves, skills and ability checks (including initiative).'},
 fatigued:{name:'Fatigued',text:'−2 Strength and Dexterity. Cannot run or charge; those action restrictions are handled at the table.'}
};
export function validateDebuffs(list){if(list===undefined)return;if(!Array.isArray(list)||list.length>50)throw Error('Invalid debuffs.');const seen=new Set();for(const b of list){if(!b||!Object.hasOwn(DEBUFFS,b.id)||seen.has(b.id)||typeof b.active!=='boolean')throw Error('Invalid debuff.');seen.add(b.id);}}
export function changeDebuff(input,action,id,value){validateDebuffs(input.debuffs);if(!Object.hasOwn(DEBUFFS,id))throw Error('Unknown debuff.');const c=structuredClone(input);c.debuffs??=[];const b=c.debuffs.find(x=>x.id===id);if(action==='add'){if(!b)c.debuffs.push({id,active:false});}else if(action==='remove')c.debuffs=c.debuffs.filter(x=>x.id!==id);else if(action==='active'&&b)b.active=value;else throw Error('Invalid debuff action.');validateDebuffs(c.debuffs);return c;}
export function debuffScores(input){validateDebuffs(input.debuffs);const c=structuredClone(input),active=new Set(c.debuffs?.filter(x=>x.active).map(x=>x.id));const fatigue=active.has('exhausted')?6:active.has('fatigued')?2:0;c.abilities.str=Math.max(1,c.abilities.str-fatigue);c.abilities.dex=Math.max(1,c.abilities.dex-fatigue-(active.has('entangled')?4:0));return c;}
export function debuffEffects(c,skillKeys){const effects=[];validateDebuffs(c.debuffs);const add=(b,target,value)=>effects.push({kind:'modifier',target,value,bonusType:'untyped',name:DEBUFFS[b.id].name,featId:'debuff.'+b.id,stackingKey:'debuff.'+b.id});for(const b of c.debuffs??[]){if(!b.active)continue;
 if(b.id==='dazzled')add(b,'attack.all',-1);
 if(b.id==='deafened')add(b,'initiative',-4);
 if(b.id==='entangled')add(b,'attack.all',-2);
 if(['shaken','sickened'].includes(b.id)){const targets=['attack.all','save.fortitude','save.reflex','save.will','initiative',...skillKeys];if(b.id==='sickened')targets.push('damage.weapon');for(const target of targets)add(b,target,-2);}
 }return effects;}
export function debuffSpeed(c,speed){return speed/2**(c.debuffs??[]).filter(b=>b.active&&['exhausted','entangled'].includes(b.id)).length;}
