import {fighterBaseSummary} from './fighter-base.mjs';
import {drillSummary} from './drill-sergeant.mjs';
import {crossbowmanEffects,crossbowmanScenarios,crossbowmanSummary} from './crossbowman.mjs';
import {roughriderEffects,roughriderScenarios,roughriderSummary} from './roughrider.mjs';
import {polearmEffects,polearmScenarios,polearmSummary} from './polearm-master.mjs';
import {shieldedEffects,shieldedSummary,shieldedScenarios} from './shielded-fighter.mjs';
import {siegeSummary} from './siegebreaker.mjs';
import {brawlerEffects,brawlerScenarios,brawlerSummary} from './brawler.mjs';
import {archerEffects,archerScenarios,archerSummary} from './archer.mjs';
import {armorMasterDefense,armorMasterDR} from './armor-master.mjs';
import {mobileEffects,mobileScenarios,mobileSummary} from './mobile-fighter.mjs';
import {phalanxEffects,phalanxScenarios} from './phalanx.mjs';
import {validateArchetypes,archetypeSkills,archetypeIds,selectedArchetypes} from './archetypes.mjs';
import {validateCraftedItems,craftedAbilityScores,craftedEffects} from './magic-items.mjs';
import {activeAbilityScores,selectableEffects,selectableScenarios,selectableSummary} from './selectable-abilities.mjs';
import {martialEffects,martialScenarios} from './martial-options.mjs';
import {optionEffects,optionDefenses} from './core-options.mjs';
import {racialEffects,validateRacial} from './racial.mjs';
import {validateBackground,backgroundDetails,backgroundEffects} from './backgrounds.mjs';
import {overloadActive,techBroken,validateTechState,reservoirMaximum,poweredBenefits,applyTechEvent} from './technology.mjs';
export {applyTechEvent};
import {prepareEquipment,equipmentEffects,equipmentSummary} from './equipped-items.mjs';
import {migrateBowCharacter,validateBowRating} from './bows.mjs';
import {SPELL_SCHOOLS} from './spell-schools.mjs';
import {SKILLS} from './skills.mjs';
import { BONUS_TYPES, baseSneakAttackDice, validatePackage, evaluateClassGrants } from './class-grants.mjs';
import { evaluateAbilities, validateAbilityContext, validateAbilityLinks, transitionAbility, migrateSheetCharacter, sheetScenarios } from './abilities.mjs';

export const CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'wizard', 'gunslinger', 'alchemist', 'cavalier', 'inquisitor', 'ironwright'];
export const TARGETS = {
  'attack.all': 'All attacks', 'attack.melee': 'Melee attacks', 'attack.ranged': 'Ranged attacks',
  'ac': 'Armor Class', 'save.fortitude': 'Fortitude', 'save.reflex': 'Reflex', 'save.will': 'Will',
  'damage.melee': 'Melee damage', 'damage.ranged': 'Ranged damage', 'initiative': 'Initiative',
  'combatManeuver.check': 'Combat maneuver checks', 'skill.heal': 'Heal', 'skill.survival': 'Survival',
  'skill.perception': 'Perception', 'skill.stealth': 'Stealth', 'skill.acrobatics': 'Acrobatics', 'skill.diplomacy': 'Diplomacy'
};
export { BONUS_TYPES };
const fail = message => { throw new Error(message); };
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const number = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000;
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
function keys(v, allowed, label) {
  if (!object(v) || Object.keys(v).some(k => !allowed.includes(k))) fail(`Unsupported field in ${label}.`);
}

export function validateHomebrewFeat(feat) {
  keys(feat, ['id','name','description','combat','parameter','prerequisites','effects','automationStatus','selectable','source','index'], 'feat');
  if(feat.index!==undefined){keys(feat.index,['chains','topics','themes'],'feat index');for(const key of ['chains','topics','themes'])if(!Array.isArray(feat.index[key])||feat.index[key].some(v=>!str(v,150)))fail('Invalid feat index.');}
  if (!/^homebrew:feat:[a-z0-9-]{1,80}$/.test(feat.id)) fail('Invalid homebrew feat ID.');
  if (!str(feat.name, 100)) fail('Give the feat a name (up to 100 characters).');
  if (!str(feat.description, 10000)) fail('Add a rules description.');
  if (typeof feat.combat !== 'boolean' || ![null, 'weaponId'].includes(feat.parameter)) fail('Invalid feat type or choice.');
  if (!Array.isArray(feat.prerequisites) || feat.prerequisites.length > 20) fail('Use at most 20 prerequisites.');
  for (const p of feat.prerequisites) {
    keys(p, ['kind','ability','minimum','featId','classId','selection'], 'prerequisite');
    if (!['ability','bab','feat','class-level','weapon-proficiency'].includes(p.kind)) fail('Unsupported prerequisite.');
    if (p.kind === 'ability' && (!['str','dex','con','int','wis','cha'].includes(p.ability) || !integer(p.minimum, 1, 100))) fail('Invalid ability prerequisite.');
    if (p.kind === 'bab' && !integer(p.minimum, 0, 40)) fail('BAB prerequisite must be 0–40.');
    if (p.kind === 'class-level' && (!CLASSES.includes(p.classId) || !integer(p.minimum, 1, 20))) fail('Invalid class prerequisite.');
    if (p.kind === 'feat' && (!str(p.featId, 150) || p.featId === feat.id)) fail('Choose a different prerequisite feat.');
    if (p.kind === 'weapon-proficiency' && (feat.parameter !== 'weaponId' || p.selection !== 'weaponId')) fail('Weapon proficiency requires a weapon choice.');
  }
  if (!Array.isArray(feat.effects) || !feat.effects.length || feat.effects.length > 20) fail('Add 1–20 mechanical or manual effects.');
  for (const e of feat.effects) {
    keys(e, ['kind','target','bonusType','value','condition','activation','description','circumstanceSource'], 'effect');
    if (!['passive','toggle'].includes(e.activation)) fail('Choose passive or toggle activation.');
    if (e.kind === 'manual') { if (!str(e.description, 2000)) fail('Describe the manual effect.'); continue; }
    if (e.kind !== 'modifier' || !Object.hasOwn(TARGETS, e.target) || !BONUS_TYPES.includes(e.bonusType)) fail('Unsupported modifier target or bonus type.');
    if (!['always','selected-weapon','melee-only','ranged-only'].includes(e.condition)) fail('Unsupported condition.');
    if (e.condition === 'selected-weapon' && feat.parameter !== 'weaponId') fail('A selected-weapon condition requires a weapon choice.');
    if (e.bonusType === 'circumstance' && !str(e.circumstanceSource, 100)) fail('Name the circumstance source so matching circumstances do not stack.');
    if (e.circumstanceSource && !str(e.circumstanceSource, 100)) fail('Invalid circumstance source.');
    if (typeof e.value === 'number') { if (!number(e.value)) fail('Modifier must be between −1000 and 1000.'); }
    else {
      keys(e.value, ['op','source','classId','base','perStep','step'], 'formula');
      if (e.value.op !== 'scale' || !['level','bab','class-level'].includes(e.value.source) || !number(e.value.base) ||
        !number(e.value.perStep) || !integer(e.value.step, 1, 20) || (e.value.source === 'class-level' && !CLASSES.includes(e.value.classId))) fail('Invalid scaling formula.');
    }
  }
  const manual = feat.effects.some(e => e.kind === 'manual');
  const automated = feat.effects.some(e => e.kind !== 'manual');
  return { ...structuredClone(feat), name: feat.name.trim(), selectable: true, source: 'Local homebrew',
    automationStatus: manual ? automated ? 'partial-manual' : 'manual' : 'effects-and-prerequisites' };
}

export function mergeRules(core, homebrew) {
  if (homebrew.schemaVersion !== '1.0.0' || !Array.isArray(homebrew.feats)) fail('Unsupported homebrew catalogue.');
  const feats = homebrew.feats.map(validateHomebrewFeat);
  const merged = { ...core, feats: [...core.feats, ...feats] };
  validatePackage(merged);
  const byId = new Map(merged.feats.map(f => [f.id, f]));
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('Circular feat prerequisites are not allowed.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id).prerequisites) if (p.kind === 'feat') visit(p.featId);
    visiting.delete(id); visited.add(id);
  }
  for (const f of merged.feats) visit(f.id);
  return merged;
}

/** Bonuses of unlike types stack; dodge and different-source untyped/circumstance bonuses stack.
 * Same-source repetitions do not. Penalties from distinct sources stack regardless of type.
 */
export function stackModifiers(modifiers) {
  const rows = modifiers.map((m, index) => ({ ...m, index, applied: true, reason: 'Applied' }));
  const groups = new Map();
  for (const row of rows) {
    const source = row.bonusType === 'circumstance' ? row.circumstanceSource ?? row.featId : row.featId;
    const key = row.value < 0 ? `penalty:${source}` : ['untyped','dodge','circumstance'].includes(row.bonusType)
      ? `${row.bonusType}:${source}` : row.bonusType;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const group of groups.values()) {
    const best = group.reduce((a, b) => Math.abs(b.value) > Math.abs(a.value) ? b : a);
    for (const row of group) if (row !== best) {
      row.applied = false;
      row.reason = `Suppressed by ${best.name ?? best.featId} (${best.value >= 0 ? '+' : ''}${best.value} ${best.bonusType})`;
    }
  }
  return { total: rows.filter(r => r.applied).reduce((sum, r) => sum + r.value, 0), breakdown: rows };
}

export const DEFAULT_CHARACTER = {
  name: 'Aldren • test adventurer', classes: { fighter: 1 }, bab: 1,
  abilities: { str: 16, dex: 14, con: 14, int: 8, wis: 12, cha: 10 },
  skillRanks: { heal: 0, survival: 0, perception: 0, stealth: 0, acrobatics: 0, diplomacy: 0 },
  proficientWeapons: ['longsword','rapier','war-bow'], feats: [],
  baseSaves: { fortitude: 2, reflex: 0, will: 0 }, armorBonus: 0,
  context: { attackType: 'melee', weapon: { id: 'longsword', finesseEligible: false }, featToggles: {} }
};

export function validateCharacter(c) {
  c=migrateBowCharacter(c);
  if(c?.equipment?.bowStrengthRating!==undefined)validateBowRating(c.equipment.bowStrengthRating);
  validateTechState(c);
  validateCraftedItems(c);
  validateBackground(c.background);
  if(c.builder)validateRacial(c.builder);
  if(c.equipment!==undefined){if(!object(c.equipment))fail('Invalid equipment');if(c.equipment.baseSpeed!==undefined&&![20,30].includes(c.equipment.baseSpeed))fail('Equipment base speed must be 20 or 30');if(c.equipment.damageMode!==undefined&&!['standard','two-handed','off-hand'].includes(c.equipment.damageMode))fail('Invalid equipment handling');}
  for(const key of ['casterLevel','arcaneCasterLevel','craftingRanks','sneakAttackDice'])if(c[key]!==undefined&&!integer(c[key],0,40))fail('Invalid '+key);
  if(c.craftingSkill!==undefined&&typeof c.craftingSkill!=='string')fail('Invalid crafting skill');
  if(c.qualifications!==undefined&&(!object(c.qualifications)||Object.values(c.qualifications).some(v=>typeof v!=='boolean')))fail('Invalid confirmations');
  if (!object(c) || !str(c.name, 100) || !object(c.classes) || !Object.keys(c.classes).length) fail('Enter a character name and class levels.');
  if (Object.entries(c.classes).some(([id, level]) => !CLASSES.includes(id) || !integer(level, 0, 20)) ||
      Object.values(c.classes).reduce((a,b) => a+b,0) < 1 || Object.values(c.classes).reduce((a,b) => a+b,0) > 40) fail('Invalid test character levels.');
  if (!integer(c.bab, 0, 40) || !object(c.abilities) || ['str','dex','con','int','wis','cha'].some(a => !integer(c.abilities[a], 1, 100))) fail('Enter valid BAB and six ability scores.');
  if (c.classSkills !== undefined && (!Array.isArray(c.classSkills) || c.classSkills.some(id => typeof id !== 'string'))) fail('Invalid class skills.');
  if (!object(c.skillRanks) || Object.values(c.skillRanks).some(n => !integer(n, 0, 40))) fail('Invalid skill ranks.');
  if (!object(c.baseSaves) || ['fortitude','reflex','will'].some(s => !number(c.baseSaves[s])) || !number(c.armorBonus)) fail('Invalid base saves or armor bonus.');
  if (!Array.isArray(c.feats) || c.feats.length > 100 || c.feats.some(f => !object(f) || !str(f.featId, 150) || (f.weaponId != null && !str(f.weaponId, 100)) || (f.count!==undefined&&!integer(f.count,1,100)))) fail('Invalid selected feats.');
  if (!Array.isArray(c.proficientWeapons) || c.proficientWeapons.some(w => !str(w, 100))) fail('Invalid proficiencies.');
  if (!object(c.context) || !['melee','ranged'].includes(c.context.attackType) || !object(c.context.weapon) || !str(c.context.weapon.id, 100) || typeof c.context.weapon.finesseEligible !== 'boolean') fail('Invalid attack context.');
  if (!object(c.context.featToggles) || Object.values(c.context.featToggles).some(v => typeof v !== 'boolean')) fail('Invalid feat toggles.');
  if (c.context.shieldArmorCheckPenalty != null && (!number(c.context.shieldArmorCheckPenalty) || c.context.shieldArmorCheckPenalty > 0)) fail('Shield penalty must be zero or negative.');
  if (c.deity != null && (!object(c.deity) || (c.deity.favoredWeaponId != null && !str(c.deity.favoredWeaponId, 100)))) fail('Invalid deity weapon.');
  validateAbilityContext(c);
  if(c.combatSizeModifier!==undefined&&![ -8,-4,-2,-1,0,1,2,4,8 ].includes(c.combatSizeModifier))fail('Invalid combat maneuver size modifier.');
  if(c.context.weapon.damageMode!==undefined&&!['standard','two-handed','off-hand'].includes(c.context.weapon.damageMode))fail('Invalid melee damage handling.');
  validateArchetypes(c);
  return migrateSheetCharacter(c);
}

export function evaluateCharacter(rules, input, rowConditions = null, techActionId = null) {
  const prepared=prepareEquipment(rules,activeAbilityScores(craftedAbilityScores(validateCharacter(input))),techActionId);
  const c=prepared.character;
  if(archetypeSkills(c).length)c.classSkills=[...new Set([...(c.classSkills??[]),...archetypeSkills(c)])];
  const background=backgroundDetails(c.background,c);
  const result = evaluateClassGrants(rules, c, c.context);
  if(prepared.equipment){if(prepared.equipment.armor&&prepared.equipment.armor.category!=='light')c.ruleState.conditions['fleet-eligible']=false;
  if(['shield-light','shield-heavy','spiked-shield-light','spiked-shield-heavy'].includes(prepared.equipment.weapon?.id)&&!result.feats.some(f=>f.active&&f.featId==='improved-shield-bash'))c.ruleState.conditions['shield-bonus-applies']=false;}
  if(rules.abilities)validateAbilityLinks(rules.abilities,CLASSES,new Set(rules.feats.map(f=>f.id)));
  const abilities = rules.abilities ? evaluateAbilities(rules.abilities, c, result, Object.fromEntries(Object.entries(rowConditions??{}).filter(([k])=>!k.startsWith('class-option.')))) : null;
  if (abilities) result.effects.push(...abilities.effects);
  result.effects.push(...equipmentEffects(prepared.equipment,c,result,abilities),...craftedEffects(c),...crossbowmanEffects(c,prepared.equipment?.weapon,rowConditions??{}),...roughriderEffects(c,prepared.equipment,{...abilities?.conditions,...rowConditions}),...polearmEffects(c,prepared.equipment?.weapon,rowConditions??{}),...shieldedEffects(c,prepared.equipment,rowConditions??{},result.feats),...phalanxEffects(c,prepared.equipment,rowConditions??{}),...mobileEffects(c,rowConditions??{}),...archerEffects(c,prepared.equipment?.weapon,rowConditions??{}),...brawlerEffects(c,prepared.equipment?.weapon,rowConditions??{}));
  result.effects.push(...backgroundEffects(c.background,abilities?.conditions ?? rowConditions ?? {},c),...racialEffects(c),...optionEffects(c),...selectableEffects(c,rowConditions??{}),...martialEffects(c,rowConditions??{},prepared.equipment?.weapon,result.effects));
  if(archetypeIds(c).includes('tech-fighter')&&(c.classes.fighter??0)>=2){const value=1+Math.floor((c.classes.fighter-2)/4);for(const target of ['skill.tech-use',...(prepared.equipment?.weapon?.proficiency==='tech-melee'?['maneuver.disarm.defense','maneuver.sunder.defense']:[])])result.effects.push({kind:'modifier',target,value,bonusType:target.startsWith('skill.')?'competence':'untyped',featId:'archetype.technical-handling',name:'Technical Handling'});}
  const mod = ability => Math.floor((c.abilities[ability] - 10) / 2);
  const dexAC = c.context.deniedDexToAC ? Math.min(0, mod('dex')) : mod('dex');
  const maxDex=prepared.equipment?Math.min(...[prepared.equipment.armor,prepared.equipment.shield].filter(Boolean).map(i=>i.defense.maxDexBonus??Infinity)):Infinity;
  const armorDex=Math.min(dexAC,maxDex);
  const finesse = result.effects.find(e => e.kind === 'ability-substitution' && e.target==='attack.melee.ability');
  const attackAbility = c.context.attackType === 'ranged' ? mod('dex') : finesse?.replacementModifier ?? mod('str');
  const agile=result.effects.find(e=>e.kind==='ability-substitution'&&e.target==='combatManeuver.ability');
  const maneuverAbility=agile?.replacementModifier??mod('str');
  const bases = {
    attack: c.bab + attackAbility, ac: 10 + armorDex + c.armorBonus,
    'save.fortitude': c.baseSaves.fortitude + mod('con'), 'save.reflex': c.baseSaves.reflex + mod('dex'),
    'save.will': c.baseSaves.will + mod('wis'), initiative: mod('dex'), 'combatManeuver.check': c.bab + maneuverAbility,
    damage: c.context.attackType === 'melee' ? (mod('str')>0?Math.floor(mod('str')*(c.context.weapon.damageMode==='two-handed'?1.5:c.context.weapon.damageMode==='off-hand'?0.5:1)):mod('str')) : 0
  };
  const skillAbilities = {...SKILLS,...Object.fromEntries(Object.keys(c.skillRanks).filter(id=>id.includes(':')&&SKILLS[id.split(':')[0]]).map(id=>[id,SKILLS[id.split(':')[0]]]))};
  for (const [skill, ability] of Object.entries(skillAbilities)) bases[`skill.${skill}`] = (c.skillRanks[skill] ?? 0) + mod(ability) + ((c.skillRanks[skill]??0)>0 && (c.classSkills?.includes(skill)||background.classSkills.includes(skill)) ? 3 : 0);
  if(prepared.equipment){
    for(const [skill,ability]of Object.entries(skillAbilities))if(['str','dex'].includes(ability))result.effects.push({kind:'modifier',featId:'equipment.armor-check',name:'Equipment armor check penalty',target:'skill.'+skill,bonusType:'untyped',value:prepared.equipment.skillPenalty??0});
    const w=prepared.equipment.weapon;if(w&&c.context.attackType==='ranged'){if(c.equipment.thrown||['dart','javelin','sling','sling-staff-halfling','shuriken-5'].includes(w.id))bases.damage=mod('str');else if(prepared.equipment.bow)bases.damage=prepared.equipment.bow.strengthDamage;}
  }
  bases['combatManeuver.check']+=c.combatSizeModifier??0;
  bases['combatManeuver.defense']=10+c.bab+mod('str')+dexAC+(c.combatSizeModifier??0);
  for(const maneuver of ['trip','disarm','bull-rush','overrun','sunder','grapple','dirty-trick','drag','reposition','steal']){
    bases[`maneuver.${maneuver}.check`]=c.bab+(c.context.attackType==='melee'&&['trip','disarm','sunder'].includes(maneuver)?(agile?.replacementModifier??attackAbility):maneuverAbility)+(c.combatSizeModifier??0);
    bases[`maneuver.${maneuver}.defense`]=bases['combatManeuver.defense'];
  }
  for(const stat of ['hitPoints.bonus','concentration.bonus','reach.bonus','opportunity.extra','critical.saveDC','speed.bonus','spell.slotAdjustment','endurance.constitutionBonus','unarmed.saveDC','scorpion.duration','damageReduction.typedBypass','damageReduction.untypedBypass','channel.dcBonus','channel.excludedTargets','leadership.baseScore','shield.acBonus','crafting.skillBonus','spell.armorFailureReduction','stunning.saveDC','spell.resistanceBonus']) bases[stat]=0;
  for(const school of SPELL_SCHOOLS)bases['spell.dc.'+school]=0;
  bases['skill.feint']=bases['skill.bluff'];bases['coupDeGrace.dcBonus']=0;
  bases['attack.confirm']=bases.attack;
  bases['sneakAttack.dice']=baseSneakAttackDice(c);
  const names = new Map(rules.feats.map(f => [f.id, f.name]));
  const modifiers = result.effects.filter(e => e.kind === 'modifier').map(e => ({ ...e, name: e.name ?? names.get(e.featId) }));
  if (abilities?.conditions.flanking && c.context.attackType === 'melee') modifiers.push({kind:'modifier',featId:'context.flanking',name:'Flanking',target:'attack.melee',bonusType:'untyped',value:2});
  if(abilities?.conditions['firing-into-melee']&&c.context.attackType==='ranged')modifiers.push({kind:'modifier',featId:'context.firing-into-melee',name:'Firing into melee',target:'attack.ranged',bonusType:'untyped',value:-4});
  if(abilities?.conditions['improvised-weapon'])modifiers.push({kind:'modifier',featId:'context.improvised',name:'Improvised weapon',target:'attack.weapon',bonusType:'untyped',value:-4});
  const stats = {};
  for (const [target, base] of Object.entries(bases)) {
    const cmd=target==='combatManeuver.defense'||target.startsWith('maneuver.')&&target.endsWith('.defense');
    const maneuverCheck=target.startsWith('maneuver.')&&target.endsWith('.check');
    const matches = e => target==='skill.feint' ? e.target==='skill.feint'||e.target==='skill.bluff' : cmd ? e.target===target || e.target==='combatManeuver.defense' || e.target==='ac'&&(e.value<0||['circumstance','deflection','dodge','insight','luck','morale','profane','sacred'].includes(e.bonusType))
      : maneuverCheck ? e.target===target || e.target==='combatManeuver.check' || e.target==='attack.all' || c.context.attackType==='melee'&&(e.target==='attack.melee'||e.target==='attack.weapon'&&['maneuver.trip.check','maneuver.disarm.check','maneuver.sunder.check'].includes(target))
      : (target === 'attack'||target==='attack.confirm') ? (target==='attack.confirm'&&e.target==='attack.confirm')||['attack.all', 'attack.weapon','attack.rollOnly', `attack.${c.context.attackType}`].includes(e.target)
      : target === 'damage' ? e.target === 'damage.weapon' || e.target === `damage.${c.context.attackType}` : e.target === target;
    const eligible = modifiers.filter(matches); 
    const suppressed = c.context.deniedDexToAC ? eligible.filter(e => e.bonusType === 'dodge' && e.value > 0) : [];
    const stacked = stackModifiers(eligible.filter(e => !suppressed.includes(e)));
    stacked.breakdown.push(...suppressed.map(e => ({ ...e, applied: false, reason: 'Dodge bonus lost while denied Dexterity to AC' })));
    stats[target] = { base, total: base + stacked.total, modifier: stacked.total, breakdown: stacked.breakdown };
  }
  const output = { ...result, mobileFighter:mobileSummary(c), archetypeFeatures:selectedArchetypes(c).flatMap(p=>p.features.filter(f=>f.level<=(c.classes.fighter??0)).map(f=>({name:f.name,archetype:p.name,text:f.rulesText}))), stats, defenses:optionDefenses(c),effectiveAbilities:c.abilities,classAbilities:selectableSummary(c), equipment:equipmentSummary(prepared.equipment,c,result,stats), ...(abilities ? { abilities } : {}), manualEffects: result.effects.filter(e => e.kind === 'manual') };
  output.drillSergeant=drillSummary(c,prepared.equipment?.weapon,result.feats,rules.feats);
  output.crossbowman=crossbowmanSummary(c,prepared.equipment?.weapon);
  if(output.crossbowman?.weaponMastery&&output.equipment?.critical)for(const critical of output.equipment.critical)critical.multiplier+=1;
  output.roughrider=roughriderSummary(c,prepared.equipment,{...abilities?.conditions,...rowConditions});
  if(output.roughrider?.damageReduction&&output.equipment){output.equipment.untypedDamageReduction=Math.max(output.equipment.untypedDamageReduction??0,5);output.equipment.physicalProtection={nonmagical:Math.max(5,output.equipment.damageReduction?.amount??0),magical:5};}
  output.polearmMaster=polearmSummary(c,prepared.equipment?.weapon,stats);
  if(output.polearmMaster?.shortGrip&&rowConditions?.['class-option.short-grip']&&output.equipment)output.equipment.reachFt=5;
  if(output.polearmMaster?.parry&&rowConditions?.['class-option.polearm-parry']&&output.equipment)output.equipment.conditionalDamageReduction={amount:5,bypass:'none',scope:'This one melee attack from a threatened nonadjacent enemy; use the highest applicable DR.'};
  if(output.polearmMaster?.weaponMastery&&output.equipment?.critical)for(const critical of output.equipment.critical)critical.multiplier+=1;
  output.shieldedFighter=shieldedSummary(c,prepared.equipment,rowConditions??{},result.feats);
  if(output.shieldedFighter?.held){const sh=output.shieldedFighter;if(sh.ward){const touch=stackModifiers(stats.ac.breakdown.filter(e=>!['armor','shield','natural-armor'].includes(e.bonusType)&&e.applied));output.stats['ac.touch']={base:stats.ac.base,total:stats.ac.base+touch.total+sh.wardBonus,modifier:touch.total+sh.wardBonus,breakdown:[...touch.breakdown,{name:'Shield Ward',value:sh.wardBonus,applied:true,bonusType:'untyped'}]};}if(output.equipment){output.equipment.untypedDamageReduction=sh.damageReduction;output.equipment.physicalProtection={nonmagical:Math.max(sh.damageReduction,output.equipment.damageReduction?.amount??0),magical:sh.damageReduction};}}
  output.siegebreaker=siegeSummary(c,prepared.equipment,result.feats);
  output.brawler=brawlerSummary(c,prepared.equipment?.weapon,rowConditions??{});
  if(output.brawler?.weaponMastery&&output.equipment?.critical)for(const critical of output.equipment.critical)critical.multiplier+=1;
  output.archer=archerSummary(c,prepared.equipment,stats);
  if(output.archer?.weaponMastery&&output.equipment?.critical)for(const critical of output.equipment.critical)critical.multiplier+=1;
  const armorMaster=armorMasterDefense(c,prepared.equipment,rowConditions??{});
  if(armorMaster){output.armorMaster=armorMaster;const touch=stackModifiers(stats.ac.breakdown.filter(e=>!['armor','shield','natural-armor'].includes(e.bonusType)&&e.applied));output.stats['ac.touch']={base:stats.ac.base,total:stats.ac.base+touch.total+armorMaster.deflectiveShield,modifier:touch.total+armorMaster.deflectiveShield,breakdown:[...touch.breakdown,{name:'Deflective Shield',value:armorMaster.deflectiveShield,applied:true,bonusType:'untyped'}]};if(output.equipment){output.equipment.fortificationPercent=Math.max(output.equipment.fortificationPercent,armorMaster.fortificationPercent);output.equipment.untypedDamageReduction=armorMaster.damageReduction;output.equipment.physicalProtection={nonmagical:armorMasterDR(armorMaster,output.equipment.damageReduction),magical:armorMasterDR(armorMaster,output.equipment.damageReduction,{magical:true})};}}
  output.fighterBase=fighterBaseSummary(c,prepared.equipment);
  if(output.fighterBase?.weaponMastery&&output.equipment?.critical)for(const critical of output.equipment.critical)critical.multiplier+=1;
  if(output.fighterBase?.armorMastery&&output.equipment){output.equipment.untypedDamageReduction=Math.max(5,output.equipment.untypedDamageReduction??0);output.equipment.physicalProtection={nonmagical:Math.max(output.equipment.untypedDamageReduction,output.equipment.damageReduction?.amount??0),magical:output.equipment.untypedDamageReduction};}
  if(output.equipment)output.equipment.traitDefinitions=rules.equipmentTraits?.traits??[];
  if(abilities && rowConditions===null){
    const ordinaryRows=sheetScenarios(abilities);
    const extraRows=ordinaryRows.flatMap(base=>[...martialScenarios(c,prepared.equipment?.weapon),...phalanxScenarios(c,prepared.equipment),...mobileScenarios(c),...archerScenarios(c),...brawlerScenarios(c),...crossbowmanScenarios(c,prepared.equipment?.weapon),...roughriderScenarios(c,prepared.equipment),...polearmScenarios(c,prepared.equipment?.weapon),...shieldedScenarios(c,prepared.equipment),...selectableScenarios(c)].map(row=>({...row,id:base.id+'|'+row.id,label:(base.id==='normal'?'':base.label+' + ')+row.label,conditions:{...base.conditions,...row.conditions}})));
    output.sheetRows=[...ordinaryRows,...extraRows].map(row=>{
      const evaluated=row.id==='normal'?output:evaluateCharacter(rules,input,row.conditions);
      return {...row,weaponId:c.context.weapon.id,attackType:c.context.attackType,stats:evaluated.stats,notes:evaluated.abilities.notes};
    });
  }
  if(rowConditions===null&&rules.technology&&(input.techEquipment||(c.classes.ironwright??0)>0)){
    const tech=prepared.equipment?.tech;
    const recovery=Math.max(0,...rules.technology.ironwright.recovery.filter(r=>(c.classes.ironwright??0)>=r.minimumLevel).map(r=>r.points));
    output.technology={recovery,selectedInstanceId:tech?.instance.instanceId??null,specialist:tech?.specialist??false,
      items:(input.techEquipment?.items??[]).map(i=>{const model=rules.equipment.items.find(m=>m.id===i.itemId);return {...i,name:model.name,maximum:reservoirMaximum(model,i)};}),actions:[]};
    if(tech)for(const a of tech.family.actions){
      const action=poweredBenefits(tech,a.id),eligible=tech.proficient&&c.context.attackType==='melee'&&!tech.instance.mechanismBroken&&!techBroken(tech.item,tech.instance);
      const rows=eligible?(output.sheetRows??[{id:'normal',label:'Normal',conditions:{}}]).map(row=>{
        const evaluated=evaluateCharacter(rules,input,row.conditions??{},a.id);
        return {label:row.label,stats:evaluated.stats,equipment:evaluated.equipment};
      }):[];
      output.technology.actions.push({...action,eligible,available:eligible&&(tech.instance.reservoir>=a.cost||overloadActive(c,tech.instance)),rows});
    }
  }
  return output;
}

export function applyAbilityEvent(rules, input, event) {
  if (!rules.abilities) fail('No structured abilities configured.');
  const c=prepareEquipment(rules,validateCharacter(input)).character;
  validateAbilityLinks(rules.abilities,CLASSES,new Set(rules.feats.map(f=>f.id)));
  const updated=transitionAbility(rules.abilities,c,evaluateClassGrants(rules,c,c.context),event);
  return {...structuredClone(input),ruleState:updated.ruleState};
}
