import {archetypeIds,replacedBarbarianSlot} from './archetypes.mjs';
export const barbarianLevel=c=>c.classes?.barbarian??0;
export const hasBarbarian=(c,id)=>barbarianLevel(c)>0&&archetypeIds(c,'barbarian').includes(id);
const options=c=>c.builder?.classOptions??{};
const mod=(c,a)=>Math.floor((c.abilities[a]-10)/2);
export const titanicActive=c=>hasBarbarian(c,'titan-mauler')&&barbarianLevel(c)>=14&&options(c)['barbarian-raging']==='on'&&options(c)['titanic-rage']==='on';
export function barbarianSkills(c,base){
 if(hasBarbarian(c,'savage-technologist'))return ['acrobatics','climb','craft','diplomacy','intimidate','knowledge-local','perception','sense-motive','ride','survival','swim','tech-use'];
 if(hasBarbarian(c,'urban-barbarian'))return [...base.filter(s=>!['handle-animal','knowledge-nature','survival'].includes(s)),'diplomacy','knowledge-local','knowledge-nobility','linguistics','profession'];
 return base;
}
export function barbarianSpecs(c){
 const n=barbarianLevel(c),b=options(c),s=[],add=(id,label,values)=>s.push({id,label,options:values.map(v=>typeof v==='string'?{id:v,name:v}:v)});
 if(n)add('barbarian-load','Movement load',[{id:'normal',name:'Light or medium load'},{id:'heavy',name:'Heavy load — no Fast Movement / Improved Armored Swiftness'}]);
 if(hasBarbarian(c,'invulnerable-rager')&&n>=3)add('extreme-endurance','Extreme Endurance',['fire','cold']);
 if(hasBarbarian(c,'urban-barbarian')){const pool=n>=20?8:n>=11?6:4,alloc=[];for(let str=0;str<=pool;str+=2)for(let dex=0;dex<=pool-str;dex+=2){const con=pool-str-dex;alloc.push({id:[str,dex,con].join('-'),name:`+${str} Strength / +${dex} Dexterity / +${con} Constitution`});}add('controlled-rage','Controlled Rage allocation (choose when entering rage)',alloc);}
 if(hasBarbarian(c,'brutal-pugilist')&&n>=2)add('barbarian-grappled','Grappled (Savage Grapple penalties)',[{id:'off',name:'Not grappled'},{id:'on',name:'Grappled'}]);
 if(hasBarbarian(c,'brutal-pugilist'))for(let i=1;i<=Math.floor(n/3);i++){const others=new Set(Object.entries(b).filter(([id])=>id.startsWith('pit-fighter-')&&id!=='pit-fighter-'+i).map(([,v])=>v));add('pit-fighter-'+i,'Pit Fighter maneuver '+i,['bull-rush','disarm','drag','grapple','overrun','reposition','steal','sunder','trip','dirty-trick'].flatMap(m=>['check','defense'].map(t=>({id:m+'.'+t,name:m+' — '+(t==='check'?'CMB':'CMD')}))).filter(v=>!others.has(v.id)));}
 if(hasBarbarian(c,'titan-mauler')){
  if(n>=2)add('titan-grip','Titan Mauler weapon handling',[{id:'normal',name:'Normal grip'},{id:'jotungrip',name:'Jotungrip — correctly sized two-handed melee weapon in one hand'},...(n>=3?[{id:'massive',name:'Massive Weapons — oversized melee weapon, always two hands'}]:[])]);
  if(n>=3&&b['titan-grip']==='massive')add('massive-gap','Weapon size above your current size',Array.from({length:n>=15?3:n>=9?2:1},(_,i)=>({id:String(i+1),name:(i+1)+' size category(s) larger'})));
  if(n>=14)add('titanic-rage','Titanic Rage (choose when entering rage)',[{id:'off',name:'Ordinary rage'},{id:'on',name:'Enlarge; spend 2 rage rounds per round'}]);
 }
 if(hasBarbarian(c,'savage-technologist')&&n>=2)add('sword-and-gun','Sword and Gun loadout',[{id:'off',name:'Not using the paired loadout'},{id:'on',name:'One-handed firearm and light/one-handed melee weapon equipped'}]);
 return s;
}
export function barbarianRage(c){const n=barbarianLevel(c),pool=n>=20?8:n>=11?6:4;
 if(hasBarbarian(c,'urban-barbarian')){const value=options(c)['controlled-rage']??`${pool}-0-0`,valid=barbarianSpecs(c).find(s=>s.id==='controlled-rage').options.some(o=>o.id===value);const [str,dex,con]=(valid?value:`${pool}-0-0`).split('-').map(Number);return {str,dex,con,will:0,ac:0};}
 if(hasBarbarian(c,'savage-technologist'))return {str:4,dex:pool,con:0,will:n>=20?4:n>=11?3:2,ac:0};
 return {str:pool,dex:0,con:pool,will:n>=20?4:n>=11?3:2,ac:-2};
}
export function applyBarbarianScores(c){if(hasBarbarian(c,'brutal-pugilist')&&barbarianLevel(c)>=2&&barbarianLevel(c)<5&&options(c)['barbarian-grappled']==='on')c.abilities.dex-=2;if(barbarianLevel(c)&&options(c)['barbarian-raging']==='on'){const r=barbarianRage(c);for(const a of ['str','dex','con'])c.abilities[a]+=r[a];if(titanicActive(c)){c.abilities.str+=2;c.abilities.dex-=2;}}}
const diceStep={'1d2':'1d3','1d3':'1d4','1d4':'1d6','1d6':'1d8','1d8':'2d6','1d10':'2d8','1d12':'3d6','2d4':'2d6','2d6':'3d6','2d8':'3d8','3d6':'4d6','3d8':'4d8','4d6':'6d6','4d8':'6d8','6d6':'8d6','6d8':'8d8','8d6':'12d6','8d8':'12d8','12d6':'16d6','12d8':'16d8'};
export function barbarianEquipment(c,weapon,armor){const n=barbarianLevel(c),b=options(c);if(!n)return;
 if(armor&&hasBarbarian(c,'armored-hulk')){armor.defense.speedByBaseFt={...armor.defense.speedByBaseFt};if(n>=2&&['medium','heavy'].includes(armor.category))for(const base of [20,30,40])armor.defense.speedByBaseFt[base]=Math.min(base,(armor.defense.speedByBaseFt[base]??(armor.defense.speedByBaseFt[30]===30?base:base===40?30:base))+5);}
 if(!weapon)return;let steps=titanicActive(c)?1:0;
 if(hasBarbarian(c,'titan-mauler')&&b['titan-grip']==='jotungrip'&&n>=2&&weapon.handling==='two-handed'){
  weapon.handling='one-handed';weapon.jotungrip=true;weapon.titanPenalty=n>=10?0:n>=6?-1:-2;
  if(weapon.tech)weapon.tech.twoWeaponEligible=true;
 }else if(hasBarbarian(c,'titan-mauler')&&b['titan-grip']==='massive'&&n>=3&&weapon.handling!=='ranged'&&weapon.proficiency!=='natural'&&weapon.id!=='unarmed-strike'){
  const gap=Number(b['massive-gap']??1),max=n>=15?3:n>=9?2:1;if(!Number.isInteger(gap)||gap<1||gap>max)throw Error('Massive Weapons size exceeds your barbarian level limit.');
  const bastard=weapon.id==='sword-bastard'||weapon.id==='bastard-sword',exotic=(c.feats??[]).some(f=>f.featId==='exotic-weapon-proficiency'&&f.weaponId===weapon.id);
  const effort=bastard?(exotic?1:2):weapon.handling==='light'?0:weapon.handling==='one-handed'?1:2;
  weapon.titanPenalty=Math.min(0,-2*gap-(effort+gap>2?2:0)+Math.floor(n/3));weapon.massive=true;weapon.handling='two-handed';steps+=gap;
  c.equipment.damageMode='two-handed';if(c.ruleState?.conditions?.['two-weapon-full-attack'])throw Error('Massive Weapons always requires both hands; it cannot be used for two-weapon fighting.');
 }
 if(steps){for(const size of ['small','medium'])if(weapon.damage?.[size])weapon.damage[size]=weapon.damage[size].map((d,index)=>{if(size==='small')d=weapon.damage.medium[index]??d;for(let i=size==='small'?1:0;i<steps;i++){if(!diceStep[d])throw Error('Unsupported enlarged weapon damage: '+d);d=diceStep[d];}return d;});}
}
export function swordGunActive(c,w){return hasBarbarian(c,'savage-technologist')&&barbarianLevel(c)>=2&&options(c)['barbarian-raging']==='on'&&options(c)['sword-and-gun']==='on'&&!!w&&(w.firearm?.hands===1||['light','one-handed'].includes(w.handling));}
export function barbarianEffects(c,e,conditions={},activeFeats=[]){
 const n=barbarianLevel(c),out=[],w=e?.weapon,a=e?.armor,has=id=>hasBarbarian(c,id),on=id=>conditions['class-option.'+id],add=(target,value,name,bonusType='untyped')=>{if(value)out.push({kind:'modifier',target,value,name,bonusType,featId:'barbarian.'+name});};if(!n)return out;
 const load=options(c)['barbarian-load'],baseSpeed=c.equipment?.baseSpeed??30,moveGain=armor=>armor?((armor.defense.speedByBaseFt[baseSpeed+10]??(armor.defense.speedByBaseFt[30]===30?baseSpeed+10:baseSpeed===30?30:20))-(armor.defense.speedByBaseFt[baseSpeed]??baseSpeed)):10;
 if(!replacedBarbarianSlot(c,'fast-movement')&&a?.category!=='heavy'&&load!=='heavy')add('speed.bonus',moveGain(a),'Fast Movement');
 if(has('armored-hulk')){
  add('maneuver.overrun.check',1,'Indomitable Stance');add('maneuver.overrun.defense',1,'Indomitable Stance');
  if(n>=5&&load!=='heavy')add('speed.bonus',moveGain(a),'Improved Armored Swiftness');
  if(on('charging-enemy')){add('ac',1,'Indomitable Stance');add('attack.weapon',1,'Indomitable Stance');add('damage.weapon',1,'Indomitable Stance');}
  if(on('trample'))add('save.reflex',1,'Indomitable Stance');
  if(n>=3&&a?.category==='heavy'&&on('critical-confirmation'))add('ac',Math.floor(n/3),'Resilience of Steel');
 }
 if(has('urban-barbarian')){if(on('crowded')){add('attack.weapon',1,'Crowd Control');add('ac',1,'Crowd Control','dodge');}if(on('crowd-influence'))add('skill.intimidate',Math.floor(n/2),'Crowd Control');}
 if(has('brutal-pugilist')&&n>=2&&n<5&&options(c)['barbarian-grappled']==='on'){add('attack.weapon',-1,'Savage Grapple — grappled');for(const m of ['trip','disarm','sunder','bull-rush','overrun','drag','reposition','steal','dirty-trick'])add('maneuver.'+m+'.check',-1,'Savage Grapple — grappled');}
 if(!replacedBarbarianSlot(c,'trap-sense')&&n>=3&&on('trap')){add('save.reflex',Math.floor(n/3),'Trap Sense');add('ac',Math.floor(n/3),'Trap Sense','dodge');}
 if(has('superstitious')&&n>=3){add('initiative',Math.floor(n/3),'Sixth Sense');if(on('surprise-round'))add('ac',Math.floor(n/3),'Sixth Sense','insight');}
 if(has('breaker')&&on('object-damage')&&c.context.attackType==='melee')add('damage.weapon',Math.max(1,Math.floor(n/2)),'Destructive — object or successful sunder only');
 if(has('breaker')&&n>=3&&(on('scavenged-weapon')||conditions['improvised-weapon'])&&!(e?.tech&&(e.tech.instance.damageTaken??0)>=(e.tech.item.durability.hitPoints+e.tech.instance.enhancement*10)/2))add('damage.weapon',Math.max(0,Math.floor(n/3)-1),'Battle Scavenger');
 if(has('brutal-pugilist'))for(const id of new Set(Object.entries(options(c)).filter(([k])=>k.startsWith('pit-fighter-')&&Number(k.slice(12))<=Math.floor(n/3)).map(([,v])=>v))){if(/^(bull-rush|disarm|drag|grapple|overrun|reposition|steal|sunder|trip|dirty-trick)\.(check|defense)$/.test(id))add('maneuver.'+id,a?1:2,'Pit Fighter','insight');}
 if(has('savage-technologist')&&n>=3){if(on('strength-audience'))add('skill.diplomacy',mod(c,'str'),'Primal Magnetism');if(on('primal-spend'))add('skill.diplomacy',Math.floor(n/2),'Primal Magnetism — spend 2 rage rounds');}
 if(has('savage-technologist')&&n>=5&&options(c)['barbarian-raging']==='on'&&w?.firearm)add('damage.weapon',mod(c,'dex'),'Crack Shot');
 if(w?.titanPenalty)add('attack.weapon',w.titanPenalty,'Titan Mauler grip');
 if(w?.jotungrip&&n>=6&&c.context.weapon.damageMode==='off-hand'&&!(activeFeats.some(f=>f.active&&f.featId==='double-slice')&&conditions['two-weapon-full-attack']))add('damage.weapon',Math.max(0,mod(c,'str'))-Math.floor(Math.max(0,mod(c,'str'))/2),'Jotungrip full off-hand Strength');
 if(has('titan-mauler')&&on('larger-enemy')&&c.context.attackType==='melee'){add('attack.weapon',1,'Big Game Hunter');add('ac',1,'Big Game Hunter','dodge');}
 if(titanicActive(c)){const medium=c.equipment?.size!=='small';add('attack.weapon',-1,'Titanic Rage size');add('ac',-1,'Titanic Rage size');add('combatManeuver.check',1,'Titanic Rage size');add('combatManeuver.defense',1,'Titanic Rage size');for(const m of ['trip','disarm','sunder','grapple','bull-rush','overrun','drag','reposition','steal','dirty-trick']){add('maneuver.'+m+'.check',1,'Titanic Rage size');add('maneuver.'+m+'.defense',1,'Titanic Rage size');}if(medium&&c.context.attackType==='melee')add('reach.bonus',w?.traits?.includes('reach')?10:5,'Titanic Rage reach');}
 return out;
}
export function barbarianScenarios(c){const n=barbarianLevel(c),rows=[],add=(id,label)=>rows.push({id:'barbarian-'+id,label,conditions:{['class-option.'+id]:true}}),has=id=>hasBarbarian(c,id);
 if(n>=3&&!replacedBarbarianSlot(c,'trap-sense'))add('trap','Trap Sense — Reflex and AC against traps');
 if(has('armored-hulk')){add('charging-enemy','Indomitable Stance — against a charging creature');add('trample','Indomitable Stance — Reflex against trample');if(n>=3)add('critical-confirmation','Resilience of Steel — AC against critical confirmation, heavy armour only');}
 if(has('urban-barbarian')){add('crowded','Crowd Control — adjacent to at least two enemies');add('crowd-influence','Crowd Control — Intimidate a crowd');}
 if(has('superstitious')&&n>=3)add('surprise-round','Sixth Sense — surprise round');
 if(has('breaker')){add('object-damage','Destructive — unattended object / successful sunder damage only');if(n>=3)add('scavenged-weapon','Battle Scavenger — broken or improvised weapon');}
 if(has('savage-technologist')&&n>=3){add('strength-audience','Primal Magnetism — audience respects strength');add('primal-spend','Primal Magnetism — spend 2 rage rounds on Diplomacy');}
 if(has('titan-mauler'))add('larger-enemy','Big Game Hunter — melee against a larger creature');return rows;
}
export function barbarianSummary(c,e,powers=[]){const n=barbarianLevel(c);if(!n)return null;const inv=hasBarbarian(c,'invulnerable-rager'),base=inv?Math.floor(n/2):replacedBarbarianSlot(c,'damage-reduction')?0:Math.max(0,1+Math.floor((n-7)/3)),extra=options(c)['barbarian-raging']==='on'?powers.filter(p=>p.id==='increased-damage-reduction').length:0,dr=base+extra;
 return {level:n,damageReduction:dr,nonlethalDamageReduction:inv?2*dr:dr,endurance:inv&&n>=3?{energy:options(c)['extreme-endurance']??null,resistance:Math.floor(n/3)-1}:null,uncannyDodge:n>=2&&!replacedBarbarianSlot(c,'uncanny-dodge'),improvedUncannyDodge:n>=5&&!replacedBarbarianSlot(c,'improved-uncanny-dodge'),trapSense:replacedBarbarianSlot(c,'trap-sense')?0:Math.floor(n/3),senses:hasBarbarian(c,'superstitious')?{lowLight:n>=7,darkvision:n>=10?60:0,scent:n>=13,blindsense:n>=16?30:0,blindsight:n>=19?30:0}:null,titanic:titanicActive(c)?{roundCost:2,endCondition:n>=17?'none (Tireless Rage)':'exhausted'}:null,swordAndGun:swordGunActive(c,e?.weapon),grapplePenalty:hasBarbarian(c,'brutal-pugilist')&&n>=2?(n>=5?0:0.5):1};
}
