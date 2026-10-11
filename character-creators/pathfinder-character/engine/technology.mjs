/** Per-item resources and declarative powered profiles; no turns or enemy records. */
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const integer=(n,min=0,max=100)=>Number.isInteger(n)&&n>=min&&n<=max;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validateTechnology(data){
 check(data?.schemaVersion==='1.0.0'&&Array.isArray(data.families),'Invalid technology rules');
 const ids=new Set();
 const numeric=['attackBonus','brutal','ignoreHardness','attackReachBonus','targets','secondaryTargetDamageMultiplier','knockbackFt','tripBonus','threatRangeBonus','criticalMultiplierBonus','gripBonus','craftBonus','quickCraftBonus','speedBonusFt','horizontalFt','verticalFt','cmdBonus','interceptDamage','shieldBonus','edges'];
 for(const family of data.families){
  check(typeof family.id==='string'&&!ids.has(family.id)&&Array.isArray(family.actions),'Invalid technology family');ids.add(family.id);
  const actions=new Set();
  for(const a of family.actions){
   check(typeof a.id==='string'&&!actions.has(a.id)&&typeof a.name==='string'&&integer(a.cost,1,100)&&['attack','standard','full-round','swift','immediate','move','activation'].includes(a.actionType)&&typeof a.description==='string','Invalid powered action');actions.add(a.id);
   for(const b of [a.benefits,a.specialistBenefits]){
    check(object(b)&&Object.keys(b).every(k=>[...numeric,'extraDice','targetCondition','duration'].includes(k)),'Unknown powered benefit');
    for(const k of numeric)if(k in b)check(k==='secondaryTargetDamageMultiplier'?[0.5,1].includes(b[k]):integer(b[k],0,100),'Invalid powered amount');
    if(b.extraDice)check(/^[1-9]\d*d[1-9]\d*$/.test(b.extraDice),'Invalid powered damage dice');
    if(b.targetCondition!==undefined)check(b.targetCondition==='flat-footed'&&b.duration==='through-end-of-your-next-turn','Invalid powered condition');
   }
  }
 }
 for(const item of data.items)check(ids.has(item.tech?.family)&&integer(item.tech.reservoirBase,1)&&integer(item.tech.reservoirPerEnhancement)&&typeof item.tech.twoWeaponEligible==='boolean','Invalid tech model');
 check(data.ironwright?.specializationMinimumLevel===1&&integer(data.ironwright.spendingTrainingMinimumLevel,1,20)&&integer(data.ironwright.spendingTrainingBonus,0,5),'Invalid Ironwright training');
 check(Array.isArray(data.ironwright.recovery)&&data.ironwright.recovery.every(r=>integer(r.minimumLevel,1,20)&&integer(r.points,1,10)),'Invalid maintenance progression');
 return data;
}
export const reservoirMaximum=(item,instance)=>item.tech.reservoirBase+item.tech.reservoirPerEnhancement*instance.enhancement;
export function validateTechState(c,rules){
 if(c.techEquipment===undefined)return;
 const state=c.techEquipment;
 check(object(state)&&Array.isArray(state.items)&&state.items.length<=100,'Invalid tech inventory');
 check(state.specialization===undefined||typeof state.specialization==='string','Invalid specialization');
 if(rules&&state.specialization)check((state.specialization==='armour'||rules.technology?.families.some(f=>f.id===state.specialization)),'Unknown specialization');
 check(state.items.filter(i=>i.overloaded).length<=1,'Only one item may be overloaded');
 const ids=new Set();
 for(const i of state.items){
  check(object(i)&&typeof i.instanceId==='string'&&/^[a-z0-9-]{1,100}$/.test(i.instanceId)&&!ids.has(i.instanceId),'Invalid or duplicate owned item');ids.add(i.instanceId);
  check(typeof i.itemId==='string'&&integer(i.enhancement,0,5)&&integer(i.reservoir,0,100)&&typeof i.attuned==='boolean'&&typeof i.keen==='boolean','Invalid owned tech item');
  for(const key of ['overloaded','mechanismBroken','overloadCharged'])check(i[key]===undefined||typeof i[key]==='boolean','Invalid overload state');
  check(i.damageTaken===undefined||integer(i.damageTaken,0,10000),'Invalid item damage');check(i.deployed===undefined||typeof i.deployed==='boolean','Invalid deployment');check(i.material===undefined||['steel','mithral','adamantine'].includes(i.material),'Invalid material');
  if(rules){check(rules.technology,'Technology rules are not loaded');const model=rules.equipment?.items.find(m=>m.id===i.itemId);check(model?.tech,'Unknown tech item');check(i.reservoir<=reservoirMaximum(model,i),'Reservoir exceeds capacity');check(!i.keen||model.damage?.types.some(t=>['piercing','slashing'].includes(t)),'Keen requires a piercing or slashing blade');}
 }
 for(const key of ['armorInstanceId','shieldInstanceId'])check(state[key]===undefined||state[key]===null||ids.has(state[key]),'Unknown defensive item');
 check(state.selectedInstanceId===undefined||state.selectedInstanceId===null||ids.has(state.selectedInstanceId),'Unknown selected tech item');
}
export function techProficient(c,item){
 return (c.classes.ironwright??0)>0||(c.proficientWeapons??[]).includes(item.id)||(c.feats??[]).some(f=>f.featId===(item.kind==='weapon'?'tech-melee-proficiency':'tech-armour-proficiency'));
}
export function selectedTech(rules,c){
 validateTechState(c,rules);
 const instance=c.techEquipment?.items.find(i=>i.instanceId===c.techEquipment.selectedInstanceId);
 if(!instance)return null;
 const item=rules.equipment.items.find(i=>i.id===instance.itemId);
 if(item.kind!=='weapon')return null;
 const family=rules.technology.families.find(f=>f.id===item.tech.family);
 const level=c.classes.ironwright??0;
 return {instance,item,family,specialist:level>=rules.technology.ironwright.specializationMinimumLevel&&c.techEquipment.specialization===family.id,
  training:Math.max(0,...rules.technology.ironwright.spendingTrainingProgression.filter(r=>level>=r.minimumLevel).map(r=>r.bonus)),
  maximum:reservoirMaximum(item,instance),proficient:techProficient(c,item)};
}
export function poweredBenefits(tech,actionId){
 const action=tech.family.actions.find(a=>a.id===actionId);check(action,'Unknown powered action');
 return {...action,benefits:tech.specialist?action.specialistBenefits:action.benefits};
}
export function techModifiers(tech,action,c){
 if(!tech)return [];
 const effects=[];
 const add=(target,value,key,bonusType='untyped')=>{if(value)effects.push({kind:'modifier',target,value,bonusType,featId:'technology.'+key,name:key});};
 add('attack.weapon',tech.instance.enhancement,'weapon-enhancement','enhancement');
 add('damage.weapon',tech.instance.enhancement,'weapon-enhancement','enhancement');
 if(techBroken(tech.item,tech.instance)){add('attack.weapon',-2,'broken weapon');add('damage.weapon',-2,'broken weapon');}
 if(overloadActive(c,tech.instance)&&(c.classes.ironwright??0)>=20)add('damage.weapon',2,'Overload Mastery');
 if(action){
  check(!tech.instance.mechanismBroken&&!techBroken(tech.item,tech.instance),'Powered mechanism or item is broken');
  check(tech.proficient,'Powered actions require tech melee proficiency');
  check(c.context.attackType==='melee','These powered actions require a melee attack');
  add('attack.weapon',action.benefits.attackBonus??0,action.id);
  add('attack.weapon',tech.training,'Ironwright powered training');
  add('damage.weapon',tech.training,'Ironwright powered training');
  // Trip bonus is specific to the follow-up maneuver, not the weapon's attack.
  add('maneuver.trip.check',action.benefits.tripBonus??0,action.id+' follow-up trip');
 }
 return effects;
}
export const techMaximumHp=(model,instance)=>model.durability.hitPoints+instance.enhancement*10;
export const techBroken=(model,instance)=>(instance.damageTaken??0)>=techMaximumHp(model,instance)/2;
export function overloadActive(c,i){return !!i.overloaded&&!i.mechanismBroken&&(c.classes.ironwright??0)>=10&&[c.techEquipment?.selectedInstanceId,c.techEquipment?.armorInstanceId,c.techEquipment?.shieldInstanceId].includes(i.instanceId);}
function endOverload(i){if(i.overloaded){i.overloaded=false;i.mechanismBroken=true;i.overloadCharged=false;}}
function payPowered(c,model,i,cost){
 check(!i.mechanismBroken&&!techBroken(model,i),'Broken equipment or mechanism cannot use powered abilities');
 if(overloadActive(c,i)){
  if(!i.overloadCharged){i.damageTaken=(i.damageTaken??0)+Math.ceil(techMaximumHp(model,i)*((c.classes.ironwright??0)>=20?.1:.2));i.overloadCharged=true;}
  if(techBroken(model,i))endOverload(i);
 }else{check(i.reservoir>=cost,'Not enough reservoir');i.reservoir-=cost;}
}
export function applyTechEvent(rules,input,event){
 validateTechState(input,rules);
 const c=structuredClone(input);c.techEquipment??={items:[],selectedInstanceId:null,specialization:''};
 const state=c.techEquipment;
 const item=()=>{const i=state.items.find(i=>i.instanceId===event.instanceId);check(i,'Unknown owned item');return i;};
 switch(event.type){
  case 'overload-start':{const i=item(),model=rules.equipment.items.find(m=>m.id===i.itemId);check((c.classes.ironwright??0)>=10,'Overload requires Ironwright level 10');check([state.selectedInstanceId,state.armorInstanceId,state.shieldInstanceId].includes(i.instanceId),'Equip this item first');check(techProficient(c,model)&&!i.mechanismBroken&&!techBroken(model,i),'A working proficient item is required');check(!state.items.some(x=>x.overloaded),'Only one item may be overloaded');i.overloaded=true;i.overloadCharged=false;break;}
  case 'overload-end':endOverload(item());break;
  case 'overload-new-round':{const i=item();check(overloadActive(c,i),'Item is not overloaded');i.overloadCharged=false;break;}
  case 'workshop-repair':{const i=item();check(!i.overloaded,'End Overload first');i.mechanismBroken=false;break;}

  case 'add':{
   const model=rules.equipment.items.find(m=>m.id===event.itemId&&m.tech);check(model,'Unknown technology model');
   check(typeof event.instanceId==='string'&&!state.items.some(i=>i.instanceId===event.instanceId),'Duplicate item identity');
   state.items.push({instanceId:event.instanceId,itemId:model.id,enhancement:0,reservoir:model.tech.reservoirBase,keen:false,attuned:false});break;
  }
  case 'select':{
   if(event.instanceId===null){state.selectedInstanceId=null;break;}
   const i=item(),model=rules.equipment.items.find(m=>m.id===i.itemId);if(model.kind!=='weapon'){check(!i.deployed,'Disengage the shield before equipping it');const key=model.kind==='armor'?'armorInstanceId':'shieldInstanceId';state[key]=i.instanceId;c.equipment??={};c.equipment[model.kind==='armor'?'armorId':'shieldId']=model.id;break;}state.selectedInstanceId=i.instanceId;c.equipment??={size:'medium',baseSpeed:30};
   c.equipment.weaponId=i.itemId;delete c.equipment.damageMode;delete c.equipment.thrown;
   if(!rules.equipment.items.find(m=>m.id===i.itemId).tech.twoWeaponEligible&&c.ruleState?.conditions){c.ruleState.conditions['two-weapon-full-attack']=false;c.ruleState.conditions['two-weapon-defense-eligible']=false;}
   c.context.weapon.id=i.itemId;break;
  }
  case 'update':{
   check(['enhancement','reservoir','attuned','keen','damageTaken','material'].includes(event.field),'Unsupported item field');
   const i=item();i[event.field]=event.value;
   // Capacity changes never create fuel. Lower capacity safely clamps the counter.
   if(event.field==='enhancement'&&integer(event.value,0,5)){const model=rules.equipment.items.find(m=>m.id===i.itemId);i.reservoir=Math.min(i.reservoir,reservoirMaximum(model,i));}break;
  }
  case 'specialization':state.specialization=event.family;break;
  case 'disengage':{const i=item();check(i.deployed,'Shield is not deployed');i.deployed=false;break;}
  case 'spend':{
   const owned=item(),model=rules.equipment.items.find(m=>m.id===owned.itemId);if(model.kind!=='weapon'){const key=model.kind==='armor'?'armorInstanceId':'shieldInstanceId';check(state[key]===owned.instanceId,'Equip this owned item before spending');check(techProficient(c,model),'Tech armour proficiency is required');const action=rules.technology.families.find(f=>f.id===model.tech.family).actions.find(a=>a.id===event.actionId);check(action,'Unknown powered action');payPowered(c,model,owned,action.cost);if(action.id==='deploy-bulwark'){owned.deployed=true;state.shieldInstanceId=null;c.equipment.shieldId=null;}break;}
   const tech=selectedTech(rules,c);check(tech&&tech.instance.instanceId===event.instanceId,'Equip this owned item before spending');
   check(tech.proficient,'Powered actions require tech melee proficiency');
   check(!c.equipment?.thrown,'Powered actions require melee mode');
   const action=poweredBenefits(tech,event.actionId);payPowered(c,model,owned,action.cost);break;
  }
  case 'maintenance':{
   const level=c.classes.ironwright??0;
   const amount=Math.max(0,...rules.technology.ironwright.recovery.filter(r=>level>=r.minimumLevel).map(r=>r.points));
   check(amount>0,'Ironwright levels are required for overnight maintenance');
   // One explicit completed overnight rest per event, analogous to daily recovery.
   for(const i of state.items)if(i.attuned){const model=rules.equipment.items.find(m=>m.id===i.itemId);i.reservoir=Math.min(reservoirMaximum(model,i),i.reservoir+amount);}break;
  }
  case 'refill':{const i=item(),model=rules.equipment.items.find(m=>m.id===i.itemId);i.reservoir=reservoirMaximum(model,i);break;}
  case 'remove':{item();state.items=state.items.filter(i=>i.instanceId!==event.instanceId);for(const key of ['selectedInstanceId','armorInstanceId','shieldInstanceId'])if(state[key]===event.instanceId)state[key]=null;break;}
  default:throw new Error('Unknown technology event');
 }
 for(const i of state.items)if(i.overloaded&&(!overloadActive(c,i)||techBroken(rules.equipment.items.find(m=>m.id===i.itemId),i)))endOverload(i);
 validateTechState(c,rules);return c;
}
