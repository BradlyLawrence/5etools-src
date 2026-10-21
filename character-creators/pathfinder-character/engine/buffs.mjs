export const BUFFS={
 'enlarge-person':{name:'Enlarge Person',common:true,text:'One size larger; +2 size Strength, −2 Dexterity, size changes to attacks/AC and melee weapon dice. Large humanoids have 10 ft. natural reach. Speed is unchanged. Humanoids only. Thrown weapons and projectiles return to normal damage. Activating this turns Reduce Person off.'},
 'reduce-person':{name:'Reduce Person',common:true,text:'One size smaller; −2 Strength, +2 size Dexterity, size changes to attacks/AC and weapon dice. Tiny humanoids have 0 ft. natural reach. Speed is unchanged. Humanoids only. Thrown weapons retain normal dice; projectile weapons use reduced dice. Activating this turns Enlarge Person off.'},
 "bulls-strength":{"name": "Bull's Strength", "ability": "str", "text": "+4 enhancement to Strength; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry."},
 "cats-grace":{"name": "Cat's Grace", "ability": "dex", "text": "+4 enhancement to Dexterity; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry."},
 "bears-endurance":{"name": "Bear's Endurance", "ability": "con", "text": "+4 enhancement to Constitution; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry. Updates maximum HP and Fortitude; this is not temporary HP. Current HP tracking remains manual."},
 "foxs-cunning":{"name": "Fox's Cunning", "ability": "int", "text": "+4 enhancement to Intelligence; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry. Improves spell DCs and related checks, but grants no extra spell slots or skill ranks."},
 "owls-wisdom":{"name": "Owl's Wisdom", "ability": "wis", "text": "+4 enhancement to Wisdom; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry. Improves spell DCs and related checks, but grants no extra spell slots or skill ranks."},
 "eagles-splendor":{"name": "Eagle's Splendor", "ability": "cha", "text": "+4 enhancement to Charisma; only the highest enhancement bonus from buffs or equipped items applies. Mass versions use this same entry. Improves spell DCs and related checks, but grants no extra spell slots or skill ranks."},
 prayer:{name:'Prayer',common:true,text:'+1 luck to attacks, weapon damage, saves and skills. Applies only to this character; enemy penalties are handled at the table.'},
 'divine-favor':{name:'Divine Favor',common:true,strength:true,minBonus:1,maxBonus:3,text:'Luck bonus to attacks and weapon damage: +1 at caster levels 1–5, +2 at 6–8, +3 at 9+. Does not stack with Prayer on those rolls.'},
 'shield-of-faith':{name:'Shield of Faith',common:true,strength:true,minBonus:2,maxBonus:5,text:'Deflection bonus to AC: +2 at caster levels 1–5, +3 at 6–11, +4 at 12–17, +5 at 18+. Uses the highest deflection bonus.'},
 resistance:{name:'Resistance',common:true,text:'+1 resistance to all saves; uses the highest resistance bonus, including equipment.'},
 haste:{name:'Haste',common:true,text:'+1 attack, dodge AC and Reflex; faster movement. One extra attack is included in the full-attack sequence. Does not stack with Speed or add attacks to Vital Strike.'},
 bless:{name:'Bless',common:true,text:'+1 morale on attacks. +1 morale against fear only; apply that conditional save bonus at the table.'},
 'inspire-courage':{name:'Bardic inspiration — Inspire Courage',common:true,text:'Competence bonus on attacks and weapon damage. Matching morale bonus against charm and fear only; conditional saves are resolved at the table.',strength:true},
 heroism:{name:'Heroism',common:true,text:'+2 morale on attack rolls, saving throws and skill checks.'},
 'mage-armor':{name:'Mage Armor',text:'+4 armor AC; does not stack with worn armor.'},
 shield:{name:'Shield',text:'+4 shield AC; immunity to magic missile is resolved at the table.'}
};
export function validateBuffs(buffs){if(buffs===undefined)return;if(!Array.isArray(buffs)||buffs.length>50)throw Error('Invalid saved buffs.');const ids=new Set();for(const b of buffs){if(!b||!Object.hasOwn(BUFFS,b.id)||ids.has(b.id)||typeof b.active!=='boolean'||!Number.isInteger(b.bonus)||b.bonus<(BUFFS[b.id].minBonus??1)||b.bonus>(BUFFS[b.id].maxBonus??(BUFFS[b.id].strength?4:1)))throw Error('Invalid saved buff.');ids.add(b.id);}if(buffs.filter(b=>b.active&&['enlarge-person','reduce-person'].includes(b.id)).length>1)throw Error('Choose only one active size spell.');}
export function changeBuff(input,action,id,value){validateBuffs(input.buffs);if(!Object.hasOwn(BUFFS,id))throw Error('Unknown buff.');const c=structuredClone(input);c.buffs??=[];const b=c.buffs.find(b=>b.id===id);if(action==='add'){if(!b)c.buffs.push({id,active:false,bonus:BUFFS[id].minBonus??1});}else if(action==='remove')c.buffs=c.buffs.filter(b=>b.id!==id);else if(!b)throw Error('Buff not found.');else if(action==='active'){b.active=value;if(value&&['enlarge-person','reduce-person'].includes(id))for(const other of c.buffs)if(other.id!==id&&['enlarge-person','reduce-person'].includes(other.id))other.active=false;}else if(action==='bonus')b.bonus=value;else throw Error('Unknown buff action.');validateBuffs(c.buffs);return c;}
export function buffEffects(c){validateBuffs(c.buffs);const effects=[],add=(b,target,value,bonusType)=>effects.push({kind:'modifier',target,value,bonusType,name:BUFFS[b.id].name,featId:'buff.'+b.id,stackingKey:'buff.'+b.id});for(const b of c.buffs??[]){if(!b.active)continue;
 if(b.id==='haste'){add(b,'attack.all',1,'untyped');add(b,'ac',1,'dodge');add(b,'save.reflex',1,'untyped');add(b,'speed.bonus',Math.min(30,c.equipment?.baseSpeed??30),'enhancement');}
 if(b.id==='prayer'){for(const target of ['attack.all','damage.weapon','save.fortitude','save.reflex','save.will'])add(b,target,1,'luck');}
 if(b.id==='divine-favor'){add(b,'attack.all',b.bonus,'luck');add(b,'damage.weapon',b.bonus,'luck');}
 if(b.id==='shield-of-faith')add(b,'ac',b.bonus,'deflection');
 if(b.id==='resistance')for(const save of ['fortitude','reflex','will'])add(b,'save.'+save,1,'resistance');
 if(b.id==='bless')add(b,'attack.all',1,'morale');
 if(b.id==='inspire-courage'){add(b,'attack.all',b.bonus,'competence');add(b,'damage.weapon',b.bonus,'competence');}
 if(b.id==='heroism'){add(b,'attack.all',2,'morale');for(const save of ['fortitude','reflex','will'])add(b,'save.'+save,2,'morale');}
 if(b.id==='mage-armor')add(b,'ac',4,'armor');if(b.id==='shield')add(b,'ac',4,'shield');
 }return effects;}

export function buffAbilityEnhancement(c,ability){validateBuffs(c.buffs);return c.buffs?.some(b=>b.active&&BUFFS[b.id].ability===ability)?4:0;}
