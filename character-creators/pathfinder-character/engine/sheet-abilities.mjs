import {SPELL_SCHOOLS} from './spell-schools.mjs';
import {SKILLS} from './skills.mjs';
/** Character-sheet rules: declarations, counters, toggles and conditional calculations. */
import { BONUS_TYPES, baseSneakAttackDice } from './class-grants.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const object=x=>x && typeof x==='object' && !Array.isArray(x);
const id=x=>typeof x==='string' && /^[a-z][a-z0-9:.-]{0,149}$/.test(x);
const fields=(x,keys)=>check(object(x) && Object.keys(x).every(k=>keys.includes(k)),'Unknown or invalid sheet rule field');
const stats=new Set(['attack.all','attack.weapon','attack.melee','attack.ranged','attack.rollOnly','damage.melee','damage.ranged','ac','save.fortitude','save.reflex','save.will','initiative','combatManeuver.check']);
for(const maneuver of ['trip','disarm','bull-rush','overrun','sunder','grapple','dirty-trick','drag','reposition','steal'])for(const stat of ['check','defense'])stats.add(`maneuver.${maneuver}.${stat}`);
for(const skill of Object.keys(SKILLS)) stats.add('skill.'+skill);
for(const stat of ['hitPoints.bonus','concentration.bonus','reach.bonus','opportunity.extra','critical.saveDC','speed.bonus','spell.slotAdjustment','endurance.constitutionBonus','unarmed.saveDC','scorpion.duration','damageReduction.typedBypass','damageReduction.untypedBypass','channel.dcBonus','channel.excludedTargets','leadership.baseScore','shield.acBonus','crafting.skillBonus','spell.armorFailureReduction','stunning.saveDC','spell.resistanceBonus','combatManeuver.defense','attack.confirm','sneakAttack.dice'])stats.add(stat);
for(const school of SPELL_SCHOOLS)stats.add('spell.dc.'+school);
const references=/^(bab|level|sneakAttackDice|casterLevel|arcaneCasterLevel|rank\.[a-z-]+|feat\.[a-z-]+|class\.[a-z]+|ability\.(str|dex|con|int|wis|cha)|choice\.[a-z.-]+|condition\.[a-z0-9.-]+|toggle\.[a-z:.-]+|context\.(attackType|meleeDamageMode))$/;
export function validateExpression(x,depth=0){
  check(depth<16,'Expression too deeply nested');
  if(typeof x==='number'){check(Number.isFinite(x)&&Math.abs(x)<=10000,'Invalid number');return 'number';}
  if(['boolean','string'].includes(typeof x))return typeof x;
  check(object(x),'Invalid expression');
  if(Object.hasOwn(x,'ref')){fields(x,['ref']);check(references.test(x.ref),'Unsupported reference');return /^(condition|toggle)\./.test(x.ref)?'boolean':/^(bab|level|sneakAttackDice|casterLevel|arcaneCasterLevel|rank\.[a-z-]+|feat\.|class\.|ability\.)/.test(x.ref)?'number':'string';}
  fields(x,['op','args']);const arity={add:[2,10],subtract:[2,2],multiply:[2,2],floorDivide:[2,2],min:[2,10],max:[2,10],eq:[2,2],ne:[2,2],gte:[2,2],all:[1,10],any:[1,10]};
  check(Object.hasOwn(arity,x.op)&&Array.isArray(x.args),'Unsupported operator');const [lo,hi]=arity[x.op];check(x.args.length>=lo&&x.args.length<=hi,'Invalid expression arity');
  const types=x.args.map(a=>validateExpression(a,depth+1));
  if(['eq','ne'].includes(x.op)){check(types[0]===types[1],'Comparison type mismatch');return 'boolean';}
  if(['all','any'].includes(x.op)){check(types.every(t=>t==='boolean'),'Boolean operands required');return 'boolean';}
  check(types.every(t=>t==='number'),'Numeric operands required');return x.op==='gte'?'boolean':'number';
}
export function expression(x,c,state,conditions=state.conditions){
  if(!object(x))return x;
  if(x.ref){const [kind,...parts]=x.ref.split('.'),key=parts.join('.');
    if(kind==='casterLevel')return Math.max(c.casterLevel??0,c.arcaneCasterLevel??0);if(kind==='arcaneCasterLevel')return c.arcaneCasterLevel??0;if(kind==='bab')return c.bab;if(kind==='level')return Object.values(c.classes).reduce((a,b)=>a+b,0);
    if(kind==='sneakAttackDice')return baseSneakAttackDice(c);
    if(kind==='feat')return c.activeFeatCounts?.[key]??0;
    if(kind==='rank')return c.skillRanks[key]??0;
    if(kind==='class')return c.classes[key]??0;if(kind==='ability')return Math.floor((c.abilities[key]-10)/2);
    if(kind==='choice')return state.choices[key];if(kind==='condition')return conditions[key]??false;
    if(kind==='toggle')return state.toggles[key]??false;if(kind==='context')return key==='meleeDamageMode'?c.context.weapon.damageMode??'standard':c.context[key];
  }
  const a=x.args.map(v=>expression(v,c,state,conditions));
  if(x.op==='all')return a.every(v=>v===true);if(x.op==='any')return a.some(v=>v===true);
  if(a.some(v=>v===undefined))return undefined;
  if(x.op==='eq')return a[0]===a[1];if(x.op==='ne')return a[0]!==a[1];
  check(a.every(Number.isFinite),'Numeric operands required');if(x.op==='gte')return a[0]>=a[1];
  let value;
  switch(x.op){case 'add':value=a.reduce((n,v)=>n+v,0);break;case 'subtract':value=a[0]-a[1];break;case 'multiply':value=a[0]*a[1];break;
    case 'floorDivide':check(a[1]>0,'Divisor must be positive');value=Math.floor(a[0]/a[1]);break;case 'min':value=Math.min(...a);break;case 'max':value=Math.max(...a);break;default:throw new Error('Unsupported operator');}
  check(Number.isFinite(value)&&Math.abs(value)<=1000000,'Expression result out of bounds');return value;
}
export function validateAbilities(pkg){
  fields(pkg,['schemaVersion','id','conditions','rules']);check(pkg.schemaVersion==='1.1.0'&&id(pkg.id)&&Array.isArray(pkg.rules)&&Array.isArray(pkg.conditions),'Invalid sheet package');
  const ids=new Set(),choices=new Set(),resources=new Set(),conditions=new Set();
  for(const c of pkg.conditions){fields(c,['id','label','control','default']);check(id(c.id)&&!conditions.has(c.id)&&typeof c.label==='string'&&typeof c.control==='boolean'&&typeof c.default==='boolean','Invalid condition');conditions.add(c.id);}
  for(const r of pkg.rules){
    fields(r,['id','name','sourceUrl','referenceId','acquisition','requires','choices','resource','toggle','effects','variants','manual']);
    check(id(r.id)&&!ids.has(r.id)&&typeof r.name==='string'&&r.name.length>0,'Invalid or duplicate rule');ids.add(r.id);
    fields(r.acquisition,['kind','classId','level','featId','selectedWeapon','weaponFeat']);check(['class','feat'].includes(r.acquisition.kind),'Unsupported acquisition');
    if(r.acquisition.kind==='class')check(id(r.acquisition.classId)&&Number.isInteger(r.acquisition.level)&&r.acquisition.level>=1,'Invalid class grant');else check(id(r.acquisition.featId),'Invalid feat grant');
    check(validateExpression(r.requires)==='boolean'&&typeof r.toggle==='boolean','Invalid requirements or toggle');
    check(Array.isArray(r.choices)&&Array.isArray(r.effects)&&Array.isArray(r.variants)&&Array.isArray(r.manual)&&r.manual.every(x=>typeof x==='string'),'Invalid collections');
    for(const ch of r.choices){fields(ch,['id','label','options','creation']);check((ch.creation===undefined||typeof ch.creation==='boolean')&&id(ch.id)&&!choices.has(ch.id)&&typeof ch.label==='string'&&Array.isArray(ch.options)&&ch.options.length&&ch.options.every(id)&&new Set(ch.options).size===ch.options.length,'Invalid choice');choices.add(ch.id);}
    if(r.resource){fields(r.resource,['id','maximum','recovery','unit']);check(r.resource.unit===undefined||['uses','rounds','points'].includes(r.resource.unit),'Invalid resource unit');check(id(r.resource.id)&&!resources.has(r.resource.id)&&r.resource.recovery==='daily'&&validateExpression(r.resource.maximum)==='number','Invalid resource');resources.add(r.resource.id);}
    if(r.acquisition.selectedWeapon!==undefined)check(r.acquisition.kind==='feat'&&typeof r.acquisition.selectedWeapon==='boolean','Invalid selected weapon acquisition');
    if(r.acquisition.weaponFeat!==undefined)check(r.acquisition.kind==='feat'&&id(r.acquisition.weaponFeat),'Invalid weapon feat requirement');
    const effects=new Set(),variants=new Set();
    for(const e of r.effects){fields(e,['id','kind','recipient','stat','amount','bonusType','stackingKey','when','description','actionKey','actionType','resolution','restrictions','priority']);check(id(e.id)&&!effects.has(e.id)&&validateExpression(e.when)==='boolean','Invalid effect');effects.add(e.id);
      if(e.kind==='modifier')check(e.recipient==='self'&&stats.has(e.stat)&&BONUS_TYPES.includes(e.bonusType)&&id(e.stackingKey)&&validateExpression(e.amount)==='number','Invalid modifier');
      else if(e.kind==='action')check(id(e.actionKey)&&['move','standard','swift','immediate','free','none','opportunity','full-round','full-attack'].includes(e.actionType)&&['bluff-check','single-melee-attack','melee-attack-per-opponent','cleave-sequence','movement','maneuver-check','ranged-attack','weapon-handling','class-ability','spellcasting','projectile-defense','unarmed-strike','critical-effect','weapon-attack'].includes(e.resolution)&&typeof e.description==='string'&&Array.isArray(e.restrictions)&&e.restrictions.every(x=>typeof x==='string')&&Number.isInteger(e.priority)&&e.priority>=0&&e.priority<=100,'Invalid sheet action');
      else check(e.kind==='note'&&typeof e.description==='string','Unsupported effect; use a note for manual mechanics');}
    for(const v of r.variants){fields(v,['id','label','conditions']);check(id(v.id)&&!variants.has(v.id)&&typeof v.label==='string','Invalid variant');variants.add(v.id);check(object(v.conditions)&&Object.keys(v.conditions).length>0,'Variant needs conditions');for(const [k,val]of Object.entries(v.conditions))check(conditions.has(k)&&typeof val==='boolean','Unknown variant condition');}
  }
  const visit=x=>{if(!object(x))return;if(x.ref){const [kind,...p]=x.ref.split('.');const key=p.join('.');if(kind==='choice')check(choices.has(key),'Unknown choice');if(kind==='condition')check(conditions.has(key),'Unknown condition');if(kind==='toggle')check(pkg.rules.some(r=>r.id===key&&r.toggle),'Unknown toggle');}x.args?.forEach(visit);};
  for(const r of pkg.rules){visit(r.requires);if(r.resource)visit(r.resource.maximum);for(const e of r.effects){visit(e.when);if(e.kind==='modifier')visit(e.amount);}}
  return pkg;
}
export function validateAbilityLinks(pkg,classes,featIds){
  validateAbilities(pkg);
  const visit=x=>{if(!object(x))return;if(x.ref?.startsWith('class.'))check(classes.includes(x.ref.slice(6)),'Unknown formula class');if(x.ref?.startsWith('feat.'))check(featIds.has(x.ref.slice(5)),'Unknown formula feat');x.args?.forEach(visit);};
  for(const r of pkg.rules){check(r.acquisition.kind==='class'?classes.includes(r.acquisition.classId):featIds.has(r.acquisition.featId),'Unknown acquisition');visit(r.requires);if(r.resource)visit(r.resource.maximum);for(const e of r.effects){visit(e.when);if(e.kind==='modifier')visit(e.amount);}}
}
export const emptyRuleState=()=>({choices:{},spent:{},toggles:{},conditions:{}});
/** Read compatibility for the prior sandbox; enemy IDs and turn ledger are discarded. */
export function migrateSheetCharacter(input){
  const c=structuredClone(input);
  if(c.ruleState&&Object.hasOwn(c.ruleState,'active')){
    fields(c.ruleState,['choices','spent','active','swiftTurn']);check(Array.isArray(c.ruleState.active),'Invalid legacy state');
    const old=c.ruleState;c.ruleState={choices:old.choices,spent:old.spent,toggles:Object.fromEntries(old.active.map(a=>[a.ruleId,true])),conditions:{}};
    for(const [key,dest]of Object.entries({mountedOnOwnMount:'mounted',orderBenefitsAvailable:'order-benefits-available',flanking:'flanking'}))if(typeof c.context[key]==='boolean')c.ruleState.conditions[dest]=c.context[key];
  }
  for(const key of ['attackTargetId','attackerId','criticalConfirmed','flankingAllies','mountedOnOwnMount','orderBenefitsAvailable','flanking'])delete c.context[key];
  return c;
}
export function validateRuleState(pkg,input=emptyRuleState()){
  fields(input,['choices','spent','toggles','conditions']);check(['choices','spent','toggles','conditions'].every(k=>object(input[k])),'Invalid sheet state');
  const choices=new Map(pkg.rules.flatMap(r=>r.choices.map(c=>[c.id,c]))),resources=new Set(pkg.rules.filter(r=>r.resource).map(r=>r.resource.id));
  for(const [k,v]of Object.entries(input.choices))check(choices.get(k)?.options.includes(v),'Unknown choice or option');
  for(const [k,v]of Object.entries(input.spent))check(resources.has(k)&&Number.isInteger(v)&&v>=0&&v<=10000,'Invalid spent resource');
  for(const [k,v]of Object.entries(input.toggles))check(pkg.rules.some(r=>r.id===k&&r.toggle)&&typeof v==='boolean','Invalid toggle');
  for(const [k,v]of Object.entries(input.conditions))check(pkg.conditions.some(c=>c.id===k&&c.control)&&typeof v==='boolean','Invalid sheet condition');
  return structuredClone(input);
}
export function evaluateAbilities(pkg,c,legacy,overrides={}){
  validateAbilities(pkg);const state=validateRuleState(pkg,c.ruleState);
  const conditions={...Object.fromEntries(pkg.conditions.map(c=>[c.id,c.default])),...state.conditions};
  for(const [k,v]of Object.entries(overrides)){check(pkg.conditions.some(c=>c.id===k)&&typeof v==='boolean','Invalid conditional row');conditions[k]=v;}
  const activeFeats=new Set(legacy.feats.filter(f=>f.active).map(f=>f.featId));
  c={...c,activeFeatCounts:Object.fromEntries(legacy.feats.filter(f=>f.active).map(f=>[f.featId,f.count??1]))};
  const rules=[],effects=[],explanations=[],notes=[],resources={},choices=[],axes=[],actionCandidates=[];
  for(const r of pkg.rules){
    const purchaseCount=r.acquisition.kind==='feat'?Math.max(1,...legacy.feats.filter(f=>f.active&&f.featId===r.acquisition.featId).map(f=>f.count??1)):1;
    const owned=r.acquisition.kind==='class'?(c.classes[r.acquisition.classId]??0)>=r.acquisition.level:activeFeats.has(r.acquisition.featId);
    const focusedWeapon=!r.acquisition.weaponFeat||legacy.feats.some(f=>f.active&&f.featId===r.acquisition.weaponFeat&&f.weaponId===c.context.weapon.id);
    const weaponEligible=focusedWeapon&&(!r.acquisition.selectedWeapon||legacy.feats.some(f=>f.active&&f.featId===r.acquisition.featId&&f.weaponId===c.context.weapon.id));
    const eligible=owned&&weaponEligible&&expression(r.requires,c,state,conditions)===true,enabled=eligible&&(!r.toggle||state.toggles[r.id]===true);
    rules.push({id:r.id,name:r.name,owned,eligible,enabled,toggle:r.toggle,resourceId:r.resource?.id,manual:r.manual});if(!owned)continue;
    choices.push(...r.choices.map(ch=>({...ch,selected:state.choices[ch.id]??null})));
    if(r.resource){const maximum=purchaseCount*expression(r.resource.maximum,c,state,conditions);check(Number.isInteger(maximum)&&maximum>=0,'Invalid maximum');resources[r.resource.id]={maximum,spent:state.spent[r.resource.id]??0,remaining:Math.max(0,maximum-(state.spent[r.resource.id]??0)),recovery:r.resource.recovery,...(r.resource.unit?{unit:r.resource.unit}:{})};}
    if(enabled&&r.variants.length)axes.push({ruleId:r.id,variants:r.variants});
    for(const e of r.effects){const applies=enabled&&expression(e.when,c,state,conditions)===true;
      explanations.push({sourceId:r.id,effectId:e.id,name:r.name,applied:applies,reason:!eligible?'Requirements not met':!enabled?'Toggle off':applies?'Applies':'Does not apply in this row'});
      if(!applies)continue;
      if(e.kind==='action'){actionCandidates.push({...e,sourceId:r.id,name:r.name,sourceUrl:r.sourceUrl});continue;}
      if(e.kind==='note'){notes.push({sourceId:r.id,description:e.description});continue;}
      const value=purchaseCount*expression(e.amount,c,state,conditions);check(Number.isFinite(value),'Invalid amount');effects.push({kind:'modifier',featId:e.stackingKey,sourceId:r.id,effectId:e.id,name:r.name,target:e.stat,bonusType:e.bonusType,value,...(e.bonusType==='circumstance'?{circumstanceSource:e.stackingKey}:{})});
    }
  }
  const selectedActions=new Map();
  for(const action of actionCandidates){const old=selectedActions.get(action.actionKey);if(!old||action.priority>old.priority)selectedActions.set(action.actionKey,action);}
  const actions=[...selectedActions.values()].map(a=>({...a,supersededSources:actionCandidates.filter(other=>other.actionKey===a.actionKey&&other!==a).map(other=>other.sourceId)}));
  return {rules,effects,explanations,notes,resources,choices,axes,actions,conditions,controls:pkg.conditions.filter(c=>c.control).map(c=>({...c,value:conditions[c.id]}))};
}
/** Cartesian combinations are intentional: concurrent abilities share the usual stacking pass. */
export function sheetScenarios(abilities){
  let rows=[{id:'normal',label:'Normal',conditions:{}}];
  for(const axis of abilities.axes){const next=[...rows];for(const row of rows)for(const v of axis.variants){
    if(Object.entries(v.conditions).some(([k,val])=>Object.hasOwn(row.conditions,k)&&row.conditions[k]!==val))continue;
    next.push({id:row.id+'|'+axis.ruleId+':'+v.id,label:(row.id==='normal'?'':row.label+' + ')+v.label,conditions:{...row.conditions,...v.conditions}});
  }rows=next;check(rows.length<=128,'Too many conditional combinations; narrow the active toggles');}
  return rows;
}
export function transitionAbility(pkg,c,legacy,event){
  const a=evaluateAbilities(pkg,c,legacy),next=migrateSheetCharacter(c),state=validateRuleState(pkg,next.ruleState);check(object(event),'Invalid event');
  if(event.type==='toggle'||event.type==='use'){
    fields(event,event.type==='toggle'?['type','ruleId','enabled']:['type','ruleId']);const r=pkg.rules.find(r=>r.id===event.ruleId);check(r&&a.rules.find(x=>x.id===r.id).eligible,'Ability unavailable');
    if(event.type==='toggle'){check(r.toggle&&typeof event.enabled==='boolean','Invalid toggle');state.toggles[r.id]=event.enabled;}
    else{check(r.resource&&a.resources[r.resource.id].remaining>0,'No uses remaining');state.spent[r.resource.id]=(state.spent[r.resource.id]??0)+1;if(r.toggle)state.toggles[r.id]=true;}
  }else if(event.type==='set-spent'){
    fields(event,['type','resourceId','spent']);check(a.resources[event.resourceId]&&Number.isInteger(event.spent)&&event.spent>=0&&event.spent<=a.resources[event.resourceId].maximum,'Invalid counter');state.spent[event.resourceId]=event.spent;
  }else if(event.type==='daily-recovery'){
    fields(event,['type']);state.spent={};for(const r of pkg.rules)if(r.resource&&r.toggle)state.toggles[r.id]=false;
  }else if(event.type==='choose'){
    fields(event,['type','choiceId','option']);check(a.choices.some(ch=>ch.id===event.choiceId&&ch.options.includes(event.option)),'Unavailable choice');state.choices[event.choiceId]=event.option;
  }else if(event.type==='condition'){
    fields(event,['type','conditionId','enabled']);check(pkg.conditions.some(c=>c.id===event.conditionId&&c.control)&&typeof event.enabled==='boolean','Invalid condition');state.conditions[event.conditionId]=event.enabled;
  }else throw new Error('Unsupported sheet event');
  next.ruleState=validateRuleState(pkg,state);return next;
}
export function validateAbilityContext(c){check(object(c.context),'Invalid character context');}
