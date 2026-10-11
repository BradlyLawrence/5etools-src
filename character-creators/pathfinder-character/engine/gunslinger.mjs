/** Campaign gunslinger v0.3: progression and handling helpers, not a combat simulator.
 * No class-based weapon damage or ammunition capacity increases.
 */
export const FIREARM_FAMILIES = ['pistol','rifle','trenchgun','handcannon'];
export const GUNSLINGER_FEATURES = [
 ['primary-family','grit','safe-handling','clear-mechanism','gunsmithing'],
 ['reliable-operation','rapid-reload-primary','evasive-step'],
 ['primary-technique','primary-handling'],
 ['combat-feat'],
 ['field-loading','nimble-1'],
 ['primary-handling-6'],
 ['secondary-family','primary-advanced-technique'],
 ['combat-feat','controlled-loads'],
 ['secondary-handling'],
 ['primary-handling-10','nimble-2'],
 ['composure'],
 ['combat-feat','primary-technique-improvement'],
 ['secondary-advanced-technique'],
 ['mobile-loading'],
 ['primary-handling-15','nimble-3'],
 ['combat-feat','controlled-loads-improvement'],
 ['primary-advanced-technique-improvement'],
 ['second-wind'],
 ['evasive-step-improvement'],
 ['combat-feat','primary-handling-20','nimble-4']
];
const int=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)throw new Error(`Invalid ${label}`);return v;};
const family=f=>{if(!FIREARM_FAMILIES.includes(f))throw new Error('Invalid firearm family');return f;};
export function gunslingerProgression(level,wisdom=10,primary='pistol',secondary=null){
 int(level,1,20,'gunslinger level');int(wisdom,1,100,'Wisdom');family(primary);
 if(secondary!==null){family(secondary);if(level<7||secondary===primary)throw new Error('Secondary family needs level 7 and a different family');}
 return {version:'0.3.0',level,primary,secondary,bab:level,
  iterativeAttacks:Array.from({length:1+Math.floor((level-1)/5)},(_,i)=>level-5*i),
  baseSaves:{fortitude:2+Math.floor(level/2),reflex:2+Math.floor(level/2),will:Math.floor(level/3)},
  gritMaximum:Math.max(2,2+Math.floor((wisdom-10)/2)),gritRecoveryMinutes:10,
  capacityBase:2,reliability:level>=2?2:1,nimble:Math.floor(level/5),
  bonusFeatLevels:[4,8,12,16,20].filter(l=>l<=level),
  features:GUNSLINGER_FEATURES.slice(0,level).flatMap((ids,i)=>ids.map(id=>({id,level:i+1}))),
  automationStatus:'progression-and-handling-helpers; combat-actions-manual'};
}
export function gritAfter({current,maximum,spend=0,quietMinutes=0}){
 int(maximum,2,100,'grit maximum');int(current,0,maximum,'current grit');int(spend,0,100,'grit cost');
 if(!Number.isFinite(quietMinutes)||quietMinutes<0)throw new Error('Invalid quiet time');
 const available=quietMinutes>=10?maximum:current;
 if(spend>available)throw new Error('Insufficient grit');return available-spend;
}
export function firearmMisfire({level=0,base=1,ammo=0,damaged=false,proficient=true,maintained=true,controlled=false}){
 int(level,0,20,'level');int(base,0,10,'base misfire');int(ammo,0,10,'ammunition surcharge');
 if([damaged,proficient,maintained,controlled].some(v=>typeof v!=='boolean'))throw new Error('Invalid handling flag');
 if(controlled&&level<8)throw new Error('Controlled loads requires gunslinger 8');
 const reliability=maintained?(level>=2?2:level===1?1:0):0;
 const ammoReduction=controlled?(level>=16?2:1):0;
 const threshold=Math.min(10,Math.max(0,base-reliability)+Math.max(0,ammo-ammoReduction)+(damaged?2:0)+(proficient?0:2));
 return {threshold,probability:threshold/20,rupturePossible:threshold>0&&!controlled&&(!proficient||damaged||ammo>0)};
}
export function firearmReload({family:weaponFamily,capacity=1,level=0,primary=null,rapidReload=false}){
 family(weaponFamily);int(capacity,1,20,'weapon capacity');int(level,0,20,'level');
 if(primary!==null)family(primary);if(typeof rapidReload!=='boolean')throw new Error('Invalid Rapid Reload flag');
 if(['trenchgun','handcannon'].includes(weaponFamily)&&capacity!==1)throw new Error('This family has one charge');
 const specialized=primary===weaponFamily&&level>0;
 // Free primary-family feat at class level 2; a purchased feat may apply otherwise.
 const rapid=rapidReload||(specialized&&level>=2);
 const result={action:'move',rounds:0,roundsLoaded:1,weaponsLoaded:1,
  requiresFreeHand:true,provokes:true,integratedFullAttackReloads:0,freeReloadsPerTurn:0};
 if(weaponFamily==='pistol'){
  result.roundsLoaded=capacity;result.action=rapid?'swift':'move';
  if(specialized&&level>=6)result.requiresFreeHand=false;
  if(specialized&&level>=10&&rapid)result.weaponsLoaded=2;
  if(specialized&&level>=15){result.action='free-during-own-full-attack';result.freeReloadsPerTurn=1;result.weaponsLoaded=2;}
  if(specialized&&level>=20){result.action='free-during-own-attack-actions';result.freeReloadsPerTurn='as-needed';result.weaponsLoaded=2;}
 }else if(weaponFamily==='rifle'){
  result.roundsLoaded=rapid?Math.min(2,capacity):1;
  if(specialized&&level>=6)result.integratedFullAttackReloads=1;
  if(specialized&&level>=15)result.integratedFullAttackReloads=2;
  if(specialized&&level>=20)result.integratedFullAttackReloads='as-needed';
 }else if(weaponFamily==='trenchgun'){
  result.action=rapid?'swift':'move';
  if(specialized&&level>=15){result.action='free-with-own-standard-discharge';result.freeReloadsPerTurn=1;}
 }else{
  result.action='full-round';result.rounds=rapid?1:2;
  if(specialized&&level>=20){result.action='free-on-own-turn';result.rounds=0;result.freeReloadsPerTurn=1;}
 }
 if(specialized&&level>=3&&weaponFamily!=='pistol')result.provokes=false;
 return result;
}
