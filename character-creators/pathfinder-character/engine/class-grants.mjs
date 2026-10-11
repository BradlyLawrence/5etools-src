import {featSlotWaives,featSlots,slotAllows} from './feat-progression.mjs';
/** Pure, browser-compatible evaluator for the approved class-grant package.
 * No I/O, eval, mutations of character state, or external dependencies.
 * This is a scoped module, not a complete PF1 combat engine.
 */
const CONDITIONS = new Set(['always', 'selected-weapon', 'melee-only', 'ranged-only', 'expertise-active',
  'expertise-active-and-dodge-allowed', 'finesse-selected-and-eligible']);
const VALUE_OPS = new Set(['shield-armor-check-penalty', 'expertise-scaling', 'rank-threshold', 'scale']);
const PREREQUISITES = new Set(['ability', 'feat', 'bab', 'weapon-proficiency', 'class-level', 'skill-ranks', 'feat-count', 'character-level', 'class-feature', 'sheet-choice','caster-level','confirmed','craft-ranks','weapon-choice']);
export const baseSneakAttackDice = c => c.sneakAttackDice ?? Math.floor(((c.classes.rogue ?? 0) + 1) / 2);
export const BONUS_TYPES = ['untyped', 'morale', 'luck', 'enhancement', 'competence', 'insight', 'sacred', 'profane', 'resistance', 'deflection', 'dodge', 'armor', 'shield', 'circumstance'];
const integer = (v, min = 0) => Number.isInteger(v) && v >= min;
const keyOf = (id, weaponId) => JSON.stringify([id, weaponId ?? null]);
const modifier = score => Math.floor((score - 10) / 2);

export function validatePackage(pkg) {
  if (pkg.schemaVersion !== '1.0.0') throw new Error('Unsupported rules schema version');
  if (!Array.isArray(pkg.feats) || !Array.isArray(pkg.grants) || !Array.isArray(pkg.prerequisiteExceptions))
    throw new Error('Invalid package collections');
  const ids = new Set();
  for (const feat of pkg.feats) {
    if(feat.repeatability!==undefined&&(!['none','stack','different-choice'].includes(feat.repeatability.mode)||feat.repeatable!==(feat.repeatability.mode!=='none')))throw new Error('Invalid feat repeatability');
    if (!feat.id || ids.has(feat.id)) throw new Error('Missing or duplicate feat ID');
    ids.add(feat.id);
    if (typeof feat.combat !== 'boolean' || !Array.isArray(feat.prerequisites) || !Array.isArray(feat.effects))
      throw new Error(`Invalid feat ${feat.id}`);
    for (const p of feat.prerequisites) {
      if(p.kind==='confirmed'&&(typeof p.key!=='string'||typeof p.description!=='string'))throw new Error('Invalid confirmation');
      if(p.kind==='weapon-choice'&&!Array.isArray(p.options))throw new Error('Invalid weapon choices');
      if(['caster-level','craft-ranks'].includes(p.kind)&&!integer(p.minimum))throw new Error('Invalid minimum');
      if(p.kind==='feat-count'&&(!Array.isArray(p.featIds)||new Set(p.featIds).size!==p.featIds.length||!integer(p.minimum,1)||p.minimum>p.featIds.length))throw new Error('Invalid feat count prerequisite');
      if(p.kind==='class-feature'&&!['channel-energy','channel-positive-energy','channel-negative-energy','rage','bardic-performance','ki-pool','lay-on-hands','mercy','wild-shape','sneak-attack'].includes(p.feature))throw new Error('Unsupported class feature');
      if(p.kind==='sheet-choice'&&(!/^[a-z-]+$/.test(p.choiceId)||typeof p.option!=='string'))throw new Error('Invalid choice prerequisite');
      if (!PREREQUISITES.has(p.kind)) throw new Error(`Unsupported prerequisite ${p.kind}`);
      if (['ability', 'bab', 'character-level'].includes(p.kind) && !integer(p.minimum)) throw new Error('Invalid prerequisite minimum');
      if(p.sameWeapon!==undefined&&(p.kind!=='feat'||typeof p.sameWeapon!=='boolean'))throw new Error('Invalid same-weapon prerequisite');
      if (p.kind === 'ability' && !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(p.ability)) throw new Error('Invalid ability');
      if(p.kind==='skill-ranks'&&(!/^[a-z-]+$/.test(p.skill)||!integer(p.minimum,1)))throw new Error('Invalid skill prerequisite');
      if (p.kind === 'class-level' && (!p.classId || !integer(p.minimum, 1))) throw new Error('Invalid class prerequisite');
    }
    for (const e of feat.effects) {
      if (e.kind === 'manual') { if (!e.description?.trim()) throw new Error('Manual effects need a description'); continue; }
      if (!['modifier', 'ability-substitution'].includes(e.kind) || !CONDITIONS.has(e.condition))
        throw new Error('Unsupported effect or condition');
      if (e.kind === 'modifier') {
        if (!BONUS_TYPES.includes(e.bonusType)) throw new Error('Unsupported bonus type');
        if (typeof e.value === 'number') {
          if (!Number.isFinite(e.value)) throw new Error('Invalid modifier value');
        } else {
          if (!e.value || !VALUE_OPS.has(e.value.op)) throw new Error('Unsupported value expression');
          if (e.value.op === 'expertise-scaling' && ![-1, 1].includes(e.value.sign)) throw new Error('Invalid scaling sign');
          if (e.value.op === 'rank-threshold' && ![e.value.threshold, e.value.below, e.value.atOrAbove].every(v => integer(v))) throw new Error('Invalid rank expression');
          if (e.value.op === 'scale' && (!['level', 'bab', 'class-level'].includes(e.value.source) ||
              !integer(e.value.step, 1) || !Number.isFinite(e.value.base) || !Number.isFinite(e.value.perStep) ||
              (e.value.source === 'class-level' && !e.value.classId))) throw new Error('Invalid scaling expression');
        }
      } else if (e.from !== 'str' || e.to !== 'dex') throw new Error('Unsupported substitution');
    }
  }
  for (const feat of pkg.feats) for (const p of feat.prerequisites)
    if(p.fromFeat!==undefined&&(p.kind!=='weapon-proficiency'||!ids.has(p.fromFeat)))throw new Error('Invalid proficiency feat source');
    else if(p.kind==='feat-count'&&p.featIds.some(id=>!ids.has(id)))throw new Error('Unknown counted prerequisite feat');
    else if (p.kind === 'feat' && !ids.has(p.featId)) throw new Error('Unknown prerequisite feat');
  const grantIds = new Set();
  for (const g of pkg.grants) {
    if (!g.id || grantIds.has(g.id) || !ids.has(g.featId) || !g.classId || !integer(g.classLevel, 1)) throw new Error('Invalid class grant');
    grantIds.add(g.id);
    if (g.selectionFrom && g.selectionFrom !== 'deity.favoredWeaponId') throw new Error('Unsupported selection source');
    if ((g.waivePrerequisites ?? []).some(a => a !== 'int')) throw new Error('Unsupported grant waiver');
  }
  for (const e of pkg.prerequisiteExceptions)
    if (!e.classId || !integer(e.classLevel, 1) || e.ability !== 'int' || !integer(e.minimumEffectiveScore) ||
        !e.combatFeatsOnly || !ids.has(e.requiresFeatInPrerequisites)) throw new Error('Invalid prerequisite exception');
  return true;
}

function normalizeCharacter(input) {
  const c = { classes: {}, abilities: {}, bab: 0, skillRanks: {}, feats: [], proficientWeapons: [], ...structuredClone(input) };
  if (!integer(c.bab)) throw new Error('BAB must be a nonnegative integer');
  for (const [id, level] of Object.entries(c.classes)) if (!integer(level)) throw new Error(`Invalid class level: ${id}`);
  for (const [ability, score] of Object.entries(c.abilities)) if (!integer(score)) throw new Error(`Invalid ability score: ${ability}`);
  for (const [skill, ranks] of Object.entries(c.skillRanks)) if (!integer(ranks)) throw new Error(`Invalid skill ranks: ${skill}`);
  if (!Array.isArray(c.feats) || !Array.isArray(c.proficientWeapons)) throw new Error('Invalid character collections');
  if (c.deity?.favoredWeaponId != null && typeof c.deity.favoredWeaponId !== 'string') throw new Error('Invalid favored weapon ID');
  return c;
}

function checkPrerequisites(def, selection, sources, c, active, pkg) {
  const waived = new Set(sources.flatMap(s => s.waivePrerequisites ?? []));
  return def.prerequisites.map(p => {
    if(sources.some(s=>s.slotWaiver))return {...p,met:true,waived:true};
    if(def.id==='stunning-fist'&&(c.classes.monk??0)>=1)return {...p,met:true,waived:true};
    if(p.kind==='confirmed')return {...p,met:c.qualifications?.[p.key]===true};
    if(p.kind==='weapon-choice')return {...p,met:p.options.includes(selection)};
    if(p.kind==='craft-ranks')return {...p,met:(c.craftingRanks??0)>=p.minimum&&/^(craft|profession)\b/i.test(c.craftingSkill??'')};
    if(p.kind==='caster-level'){let actual=p.arcane?(c.arcaneCasterLevel??0):Math.max(c.casterLevel??0,c.arcaneCasterLevel??0);if(p.masterCraftsman&&[...active.values()].some(f=>f.featId==='master-craftsman'))actual=Math.max(actual,c.craftingRanks??0);return {...p,actual,met:actual>=p.minimum};}

    if (p.kind === 'ability') {
      const actual = c.abilities[p.ability];
      let effective = actual;
      const exceptions = [];
      for (const e of pkg.prerequisiteExceptions) {
        if ((c.classes[e.classId] ?? 0) >= e.classLevel && def.combat &&
            def.prerequisites.some(r => r.kind === 'feat' && r.featId === e.requiresFeatInPrerequisites) && p.ability === e.ability) {
          effective = Math.max(effective ?? 0, e.minimumEffectiveScore);
          exceptions.push(e.id);
        }
      }
      return { ...p, met: waived.has(p.ability) || (effective != null && effective >= p.minimum),
        actual: actual ?? null, effective: effective ?? null, waived: waived.has(p.ability), exceptions };
    }
    if(p.kind==='class-feature'){if(p.feature==='sneak-attack')return {...p,met:baseSneakAttackDice(c)>0};const features={'rage':['barbarian',1],'bardic-performance':['bard',1],'ki-pool':['monk',4],'lay-on-hands':['paladin',2],'mercy':['paladin',3],'wild-shape':['druid',4]};if(features[p.feature]){const [classId,minimum]=features[p.feature];return {...p,met:(c.classes[classId]??0)>=minimum};}const cleric=(c.classes.cleric??0)>=1,paladin=(c.classes.paladin??0)>=4,energy=c.ruleState?.choices?.['cleric-channel-energy'];return {...p,met:p.feature==='channel-energy'?cleric||paladin:p.feature==='channel-positive-energy'?paladin||cleric&&energy==='positive':cleric&&energy==='negative'};}
    if(p.kind==='sheet-choice')return {...p,actual:c.ruleState?.choices?.[p.choiceId]??null,met:c.ruleState?.choices?.[p.choiceId]===p.option};
    if(p.kind==='character-level'){const actual=Object.values(c.classes).reduce((a,b)=>a+b,0);return {...p,actual,met:actual>=p.minimum};}
    if(p.kind==='skill-ranks')return {...p,actual:c.skillRanks[p.skill]??0,met:(c.skillRanks[p.skill]??0)>=p.minimum};
    if(p.kind==='feat-count'){const actual=new Set([...active.values()].filter(f=>p.featIds.includes(f.featId)).map(f=>f.featId)).size;return {...p,actual,met:actual>=p.minimum};}
    if (p.kind === 'bab') return { ...p, actual: c.bab, met: c.bab >= p.minimum };
    if (p.kind === 'class-level') return { ...p, actual: c.classes[p.classId] ?? 0, met: (c.classes[p.classId] ?? 0) >= p.minimum };
    if(p.kind==='weapon-proficiency'&&p.fromFeat)return {...p,met:[...active.values()].some(f=>f.featId===p.fromFeat&&f.weaponId&&(c.proficientWeapons.includes(f.weaponId)||[...active.values()].some(proficiency=>['martial-weapon-proficiency','exotic-weapon-proficiency'].includes(proficiency.featId)&&proficiency.weaponId===f.weaponId)))};
    if (p.kind === 'weapon-proficiency') return { ...p, weaponId: selection ?? null, met: !!selection && (c.proficientWeapons.includes(selection)||[...active.values()].some(f=>['martial-weapon-proficiency','exotic-weapon-proficiency'].includes(f.featId)&&f.weaponId===selection)) };
    return { ...p, met: [...active.values()].some(f => f.featId === p.featId && (!p.sameWeapon || !!selection && f.weaponId === selection)) };
  });
}

export function evaluateClassGrants(pkg, input, context = {}) {
  validatePackage(pkg);
  const c = normalizeCharacter(input);
  if (context.shieldArmorCheckPenalty != null && (!Number.isFinite(context.shieldArmorCheckPenalty) || context.shieldArmorCheckPenalty > 0))
    throw new Error('Shield armor check penalty must be zero or negative');
  const definitions = new Map(pkg.feats.map(f => [f.id, f]));
  const candidates = new Map();
  const warnings = [];
  function add(featId, weaponId, source, count=1) {
    const def = definitions.get(featId);
    if (!def) { warnings.push({ code: 'unsupported-feat', featId, message: 'No automated prerequisite/effect definition in this module.' }); return; }
    if (def.parameter === 'weaponId') {
      if (weaponId != null && (typeof weaponId !== 'string' || !weaponId)) throw new Error('Invalid weapon selection');
    } else if (weaponId != null) throw new Error(`Unexpected weapon selection for ${featId}`);
    if(!integer(count,1)||count>100)throw new Error('Invalid feat purchase count');
    if(count>1&&def.repeatability?.mode!=='stack')throw new Error('This feat cannot stack purchases; use separate choices where permitted');
    const key = keyOf(featId, weaponId);
    if (!candidates.has(key)) candidates.set(key, { featId, weaponId: weaponId ?? null, count:1, sources: [] });
    candidates.get(key).count=def.repeatability?.mode==='stack'&&source.creatorSlot&&candidates.get(key).sources.some(s=>s.creatorSlot)?candidates.get(key).count+count:Math.max(candidates.get(key).count,count);
    candidates.get(key).sources.push(source);
  }
  for (const [index, feat] of c.feats.entries()) {
    if (!feat || typeof feat.featId !== 'string') throw new Error('Invalid selected feat');
    const def=definitions.get(feat.featId);
    if(c.builder&&feat.creatorSlot){const slot=featSlots(c).find(s=>s.id===feat.creatorSlot);if(!slot||!slotAllows(slot,def))continue;if(feat.featId==='skill-focus'&&slot.skills&&!slot.skills.includes(c.ruleState?.choices?.['skill-focus-skill']))continue;}
    if(feat.creatorSlot?.startsWith('ranger-bonus-')&&c.equipment?.armorId&&pkg.equipment?.items.find(x=>x.id===c.equipment.armorId)?.category==='heavy')continue;
    add(feat.featId, feat.weaponId, { id: `selection:${index}`, kind: 'selected',creatorSlot:feat.creatorSlot,slotWaiver:def&&featSlotWaives(c,feat,def) },feat.count??1);
  }
  for (const grant of pkg.grants) {
    if ((c.classes[grant.classId] ?? 0) < grant.classLevel) continue;
    const weaponId = grant.selectionFrom ? c.deity?.favoredWeaponId : undefined;
    add(grant.featId, weaponId, { id: grant.id, kind: 'class-grant', classId: grant.classId,
      classLevel: grant.classLevel, waivePrerequisites: grant.waivePrerequisites ?? [] });
  }
  // Start empty and resolve dependencies to a fixed point: invalid or circular selections cannot qualify each other.
  const active = new Map();
  let changed;
  do {
    changed = false;
    for (const [key, f] of candidates) {
      if (active.has(key)) continue;
      const def = definitions.get(f.featId);
      if (def.parameter === 'weaponId' && !f.weaponId) continue;
      if (checkPrerequisites(def, f.weaponId, f.sources, c, active, pkg).every(p => p.met)) {
        active.set(key, f); changed = true;
      }
    }
  } while (changed);
  const feats = [...candidates].map(([key, f]) => {
    const def = definitions.get(f.featId);
    if (f.sources.length > 1) warnings.push({ code: 'duplicate-feat', featId: f.featId, weaponId: f.weaponId,
      message: 'Benefits apply once; all acquisition sources retained. No replacement feat has been granted.' });
    return { ...f, name: def.name, active: active.has(key),
      status: def.parameter && !f.weaponId ? 'needs-weapon-selection' : active.has(key) ? 'active' : 'unmet-prerequisites',
      prerequisites: checkPrerequisites(def, f.weaponId, f.sources, c, active, pkg),
      automationStatus: def.automationStatus };
  });
  const eligibility = pkg.feats.map(def => ({ featId: def.id,
    requiresSelection: !!def.parameter,
    prerequisites: checkPrerequisites(def, context.selectionWeaponId, [], c, active, pkg) }));
  const effects = [];
  const hasFinesse = [...active.values()].some(f => f.featId === 'weapon-finesse');
  if (context.useWeaponFinesse && (!hasFinesse || !context.weapon?.finesseEligible ||
      context.attackType !== 'melee' || c.abilities.str == null || c.abilities.dex == null))
    warnings.push({ code: 'finesse-unavailable', message: 'Finesse needs the active feat, an eligible melee weapon, and Strength and Dexterity scores.' });
  if (context.combatExpertiseActive && ![...active.values()].some(f => f.featId === 'combat-expertise'))
    warnings.push({ code: 'expertise-unavailable', message: 'Combat Expertise is not an active feat.' });
  for (const f of feats.filter(f => f.active)) {
    for (const e of definitions.get(f.featId).effects) {
      const attribution = { featId: f.featId, weaponId: f.weaponId, sources: f.sources.map(s => s.id) };
      if (e.activation === 'toggle' && !context.featToggles?.[f.featId]) continue;
      if (e.kind === 'manual') { effects.push({ ...attribution, kind: 'manual', description: e.description }); continue; }
      let applies = false;
      switch (e.condition) {
        case 'always': applies = true; break;
        case 'melee-only': applies = context.attackType === 'melee'; break;
        case 'ranged-only': applies = context.attackType === 'ranged'; break;
        case 'selected-weapon': applies = context.weapon?.id === f.weaponId; break;
        case 'expertise-active': applies = !!context.combatExpertiseActive; break;
        case 'expertise-active-and-dodge-allowed': applies = !!context.combatExpertiseActive && !context.deniedDexToAC; break;
        case 'finesse-selected-and-eligible': applies = !!context.useWeaponFinesse && !!context.weapon?.finesseEligible &&
          context.attackType === 'melee' && c.abilities.str != null && c.abilities.dex != null; break;
      }
      if (!applies) continue;
      if (e.kind === 'ability-substitution') {
        effects.push({ ...attribution, kind: e.kind, target: e.target, from: e.from, to: e.to,
          originalModifier: modifier(c.abilities[e.from]), replacementModifier: modifier(c.abilities[e.to]) });
        continue;
      }
      let value = e.value;
      if (typeof value !== 'number') switch (value.op) {
        case 'shield-armor-check-penalty': value = context.shieldArmorCheckPenalty ?? 0; break;
        case 'expertise-scaling': value = value.sign * (1 + Math.floor(c.bab / 4)); break;
        case 'rank-threshold': value = (c.skillRanks[value.skill] ?? 0) >= value.threshold ? value.atOrAbove : value.below; break;
        case 'scale': {
          const level = value.source === 'bab' ? c.bab : value.source === 'class-level' ? c.classes[value.classId] ?? 0 : Object.values(c.classes).reduce((a, b) => a + b, 0);
          value = value.base + Math.floor(level / value.step) * value.perStep; break;
        }
      }
      effects.push({ ...attribution, kind: 'modifier', target: e.target, bonusType: e.bonusType, value,
        ...(e.circumstanceSource ? { circumstanceSource: e.circumstanceSource } : {}) });
    }
  }
  return { profileId: pkg.id, feats, eligibility, effects, warnings };
}
