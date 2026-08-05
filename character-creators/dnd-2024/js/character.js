import {
	ABILITIES,
	ABILITY_FULL,
	SKILLS,
	abilityMod,
	formatMod,
	proficiencyBonus,
	averageHitDie,
	spellSlotsFor,
	spellSlotsFromClassTable,
	maxSlotLevelFromSlots,
	maxCastableSpellLevel,
	pactMagic,
	featureLevelFromUid,
	featureNameFromUid,
	isAsiFeatureName,
	XP_BY_LEVEL,
} from "./rules-2024.js";
import {
	toUid,
	entityUid,
	subclassUid,
	entriesToText,
	listEquipmentPackages,
	formatEquipmentEntry,
	resolvePackageItems,
} from "./data.js";

export {ABILITIES, ABILITY_FULL, SKILLS, formatMod, abilityMod};

export const STORAGE_KEY = "character-creators/dnd-2024/state";
export const FILE_TYPE = "5etools-char-2024";
export const SCHEMA_VERSION = 1;

/**
 * @param {import('./data.js').DataStore} data
 */
export function createEmptyCharacter () {
	const now = new Date().toISOString();
	return {
		fileType: FILE_TYPE,
		schemaVersion: SCHEMA_VERSION,
		meta: {
			createdAt: now,
			updatedAt: now,
			app: "character-creators/dnd-2024",
		},
		identity: {
			name: "",
			playerName: "",
			alignment: "",
			appearance: "",
			notes: "",
		},
		level: 1,
		xp: 0,
		abilities: {
			str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8,
			method: "standardArray",
			base: {str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8},
		},
		species: {uid: null, size: "M", choices: {}},
		background: {
			uid: null,
			abilityChoice: {mode: "2+1", assignments: {}},
			originFeatUid: null,
			equipmentPackage: "A",
			/** Map of package line index → chosen item uid for equipmentType rows */
			equipmentChoices: {},
		},
		class: {
			uid: null,
			levels: 1,
			subclassUid: null,
			hitDice: [],
			hpMax: 0,
			hpCurrent: 0,
			hpMethod: "average",
			skillChoices: [],
			featureChoices: {},
			equipmentPackage: "A",
			equipmentChoices: {},
		},
		feats: [],
		proficiencies: {
			skills: {},
			tools: {},
			languages: {},
			armor: [],
			weapons: [],
			saves: [],
		},
		spells: {
			ability: null,
			cantrips: [],
			prepared: [],
			known: [],
			slotsUsed: {},
		},
		equipment: [],
		combat: {
			armorUid: null,
			shield: false,
			acOverride: null,
			initiativeOverride: null,
			speedOverride: null,
		},
		levelHistory: [],
	};
}

export function touch (character) {
	character.meta = character.meta || {};
	character.meta.updatedAt = new Date().toISOString();
	return character;
}

export function cloneCharacter (character) {
	return JSON.parse(JSON.stringify(character));
}

/** Apply background ability bonuses onto base → final scores. */
export function recomputeAbilityScores (character) {
	const base = character.abilities.base || {};
	const final = {};
	for (const ab of ABILITIES) final[ab] = Number(base[ab] ?? 10);

	const assigns = character.background?.abilityChoice?.assignments || {};
	for (const [ab, bonus] of Object.entries(assigns)) {
		if (ABILITIES.includes(ab)) final[ab] = (final[ab] || 10) + Number(bonus || 0);
	}

	// Feat ASI choices stored on feats[].choices.ability
	for (const f of character.feats || []) {
		const abChoices = f.choices?.ability || {};
		for (const [ab, bonus] of Object.entries(abChoices)) {
			if (ABILITIES.includes(ab)) final[ab] = (final[ab] || 10) + Number(bonus || 0);
		}
	}

	for (const ab of ABILITIES) {
		character.abilities[ab] = Math.min(30, Math.max(1, final[ab]));
	}
	return character;
}

/**
 * Rebuild derived proficiencies, equipment (from packages if empty), HP baseline.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 */
export function recomputeCharacter (character, data) {
	recomputeAbilityScores(character);
	character.level = character.class?.levels || character.level || 1;
	character.class.levels = character.level;

	const cls = data.getClass(character.class.uid);
	const species = data.getSpecies(character.species.uid);
	const bg = data.getBackground(character.background.uid);

	// Saves from class
	const saves = {};
	for (const ab of (cls?.proficiency || [])) saves[ab] = true;
	character.proficiencies.saves = Object.keys(saves);

	// Skills: background fixed + class choices
	const skills = {};
	const markSkill = (id, mode = "proficient") => {
		const key = String(id).toLowerCase();
		if (!key) return;
		skills[key] = mode;
	};

	if (bg?.skillProficiencies) {
		for (const block of bg.skillProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (k === "choose") continue;
				if (v) markSkill(k);
			}
		}
	}
	for (const sk of character.class.skillChoices || []) markSkill(sk);

	// Origin + other feats may grant skills (best-effort)
	const featUids = [
		character.background.originFeatUid,
		...(character.feats || []).map(f => f.uid),
	].filter(Boolean);
	for (const uid of featUids) {
		const feat = data.getFeat(uid);
		if (!feat?.skillProficiencies) continue;
		for (const block of feat.skillProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (k === "choose") continue;
				if (v === true) markSkill(k);
				if (v === "expertise") markSkill(k, "expertise");
			}
		}
	}
	character.proficiencies.skills = skills;

	// Tools / languages from background
	const tools = {};
	if (bg?.toolProficiencies) {
		for (const block of bg.toolProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (k === "choose") continue;
				if (v) tools[k] = true;
			}
		}
	}
	character.proficiencies.tools = tools;

	if (cls) {
		character.proficiencies.armor = cls.startingProficiencies?.armor || [];
		character.proficiencies.weapons = cls.startingProficiencies?.weapons || [];
	}

	// Spell ability
	if (cls?.spellcastingAbility) {
		character.spells.ability = cls.spellcastingAbility;
	}

	// Equipment from packages if not manually set yet
	if (!character.equipment?.length) {
		character.equipment = collectStartingEquipment(character, data);
	}

	// HP
	if (!character.class.hpMax) {
		character.class.hpMax = computeHpMax(character, data);
		character.class.hpCurrent = character.class.hpMax;
	}

	// XP floor for level
	const xpFloor = XP_BY_LEVEL[character.level] ?? 0;
	if ((character.xp || 0) < xpFloor) character.xp = xpFloor;

	// Species size
	if (species?.size?.length && !character.species.size) {
		character.species.size = species.size[0];
	}

	touch(character);
	return character;
}

function collectStartingEquipment (character, data) {
	const lines = [];
	const bg = data.getBackground(character.background.uid);
	const cls = data.getClass(character.class.uid);

	if (bg?.startingEquipment) {
		const packs = listEquipmentPackages(bg.startingEquipment, data);
		const pack = packs.find(p => p.id === (character.background.equipmentPackage || "A")) || packs[0];
		if (pack) {
			lines.push(...resolvePackageItems(pack, character.background.equipmentChoices || {}, data));
		}
	}
	if (cls?.startingEquipment) {
		const packs = listEquipmentPackages(cls.startingEquipment, data);
		const pack = packs.find(p => p.id === (character.class.equipmentPackage || "A")) || packs[0];
		if (pack) {
			lines.push(...resolvePackageItems(pack, character.class.equipmentChoices || {}, data));
		}
	}
	return lines.filter(Boolean);
}

/** True if any equipmentType rows still lack a player choice. */
export function missingEquipmentChoices (character, data) {
	const missing = [];
	const bg = data.getBackground(character.background.uid);
	if (bg?.startingEquipment) {
		const packs = listEquipmentPackages(bg.startingEquipment, data);
		const pack = packs.find(p => p.id === (character.background.equipmentPackage || "A")) || packs[0];
		for (const ch of pack?.choices || []) {
			if (!character.background.equipmentChoices?.[String(ch.index)]) {
				missing.push(`Background: ${ch.label}`);
			}
		}
	}
	const cls = data.getClass(character.class.uid);
	if (cls?.startingEquipment) {
		const packs = listEquipmentPackages(cls.startingEquipment, data);
		const pack = packs.find(p => p.id === (character.class.equipmentPackage || "A")) || packs[0];
		for (const ch of pack?.choices || []) {
			if (!character.class.equipmentChoices?.[String(ch.index)]) {
				missing.push(`Class: ${ch.label}`);
			}
		}
	}
	return missing;
}

export function computeHpMax (character, data) {
	const cls = data.getClass(character.class.uid);
	if (!cls?.hd) return 1;
	const faces = cls.hd.faces || 8;
	const conMod = abilityMod(character.abilities.con);
	const level = character.level || 1;

	// Use hitDice array if present, else average
	if (character.class.hitDice?.length) {
		let total = 0;
		for (let i = 0; i < level; i++) {
			const roll = character.class.hitDice[i];
			const base = i === 0 ? (roll ?? faces) : (roll ?? averageHitDie(faces));
			total += base + conMod;
		}
		return Math.max(1, total);
	}

	let total = faces + conMod; // level 1 max
	for (let i = 2; i <= level; i++) {
		total += averageHitDie(faces) + conMod;
	}
	return Math.max(1, total);
}

/**
 * Full derived view for UI / PDF.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 */
export function derive (character, data) {
	recomputeAbilityScores(character);
	const level = character.level || 1;
	const pb = proficiencyBonus(level);
	const cls = data.getClass(character.class.uid);
	const species = data.getSpecies(character.species.uid);
	const bg = data.getBackground(character.background.uid);
	const subclass = character.class.subclassUid ? data.getSubclass(character.class.subclassUid) : null;

	const mods = {};
	for (const ab of ABILITIES) mods[ab] = abilityMod(character.abilities[ab]);

	const saves = {};
	for (const ab of ABILITIES) {
		const prof = (character.proficiencies.saves || []).includes(ab);
		saves[ab] = {
			proficient: prof,
			value: mods[ab] + (prof ? pb : 0),
		};
	}

	const skillRows = SKILLS.map(sk => {
		const mode = character.proficiencies.skills?.[sk.id];
		const prof = mode === "proficient" || mode === true || mode === "expertise";
		const expertise = mode === "expertise";
		const bonus = mods[sk.ability] + (prof ? pb : 0) + (expertise ? pb : 0);
		return {...sk, proficient: !!prof, expertise, bonus};
	});

	const features = listFeaturesUpToLevel(character, data, level);
	const speed = character.combat.speedOverride
		?? (typeof species?.speed === "number" ? species.speed : species?.speed?.walk)
		?? 30;

	const ac = computeAc(character, data, mods);
	const initiative = character.combat.initiativeOverride ?? mods.dex;

	const spellAbility = character.spells.ability || cls?.spellcastingAbility || null;
	const spellMod = spellAbility ? mods[spellAbility] : 0;
	const spellSaveDc = spellAbility ? 8 + pb + spellMod : null;
	const spellAttack = spellAbility ? pb + spellMod : null;

	const progression = cls?.casterProgression || null;
	const tableSlots = progression !== "pact" ? spellSlotsFromClassTable(cls, level) : null;
	const slots = progression === "pact"
		? null
		: (tableSlots || spellSlotsFor(progression, level));
	const pact = progression === "pact" ? pactMagic(level) : null;
	const maxSpellLevel = maxCastableSpellLevel(cls, level);

	const cantripCount = cls?.cantripProgression?.[level - 1] ?? 0;
	const preparedCount = cls?.preparedSpellsProgression?.[level - 1]
		?? (cls?.preparedSpellsProgression ? null : null);

	// Known progression (bards etc.)
	const knownCount = cls?.spellsKnownProgression?.[level - 1] ?? null;

	const attacks = computeEquippedAttacks(character, data, mods, pb);
	const weightInfo = computeInventoryWeight(character, data);

	const bgTraitFeature = bg ? [{
		level: 1,
		name: `Background (${bg.name})`,
		source: "background",
		text: bg.entries?.length ? entriesToText(bg.entries) : "Background traits and proficiencies.",
	}] : [];

	return {
		level,
		pb,
		mods,
		saves,
		skills: skillRows,
		className: cls?.name || "—",
		classSource: cls?.source || "",
		subclassName: subclass?.name || null,
		speciesName: species?.name || "—",
		backgroundName: bg?.name || "—",
		hitDie: cls?.hd ? `d${cls.hd.faces}` : "—",
		hitDiceFaces: cls?.hd?.faces || 8,
		hitDiceTotal: level,
		hitDiceSpent: Math.max(0, Math.min(level, Number(character.combat?.hitDiceSpent) || 0)),
		tempHp: Math.max(0, Number(character.combat?.tempHp) || 0),
		hpMax: character.class.hpMaxOverride != null ? Number(character.class.hpMaxOverride) : (character.class.hpMax || computeHpMax(character, data)),
		hpCurrent: character.class.hpCurrent ?? (character.class.hpMaxOverride != null ? Number(character.class.hpMaxOverride) : (character.class.hpMax || computeHpMax(character, data))),
		speed,
		ac,
		initiative,
		passivePerception: 10 + (skillRows.find(s => s.id === "perception")?.bonus ?? mods.wis),
		features: [
			...features,
			...bgTraitFeature,
			...(character.customFeatures || []).map(f => ({
				name: f.name,
				text: f.text || "",
				level: f.level || 1,
				source: f.source || "custom",
				isCustom: true,
				id: f.id,
			})),
		],
		spellAbility,
		spellMod,
		spellSaveDc,
		spellAttack,
		slots,
		pact,
		maxSpellLevel,
		cantripCount,
		preparedCount: preparedCount ?? null,
		knownCount,
		attacks,
		weightInfo,
		proficiencyArmor: character.proficiencies.armor || [],
		proficiencyWeapons: character.proficiencies.weapons || [],
		tools: Object.keys(character.proficiencies.tools || {}),
	};
}

function computeAc (character, data, mods) {
	if (character.combat.acOverride != null) return Number(character.combat.acOverride);
	const cls = data.getClass(character.class.uid);
	let base = 10 + mods.dex;
	let hasEquippedArmor = false;

	// Check equipped items in inventory for armor/shield
	const eqLines = character.equipment || [];
	for (const line of eqLines) {
		const isEquipped = /\[E\]\s*$/i.test(line);
		if (!isEquipped) continue;
		const name = line.replace(/\s*\[E\]\s*$/i, "").replace(/^\d+[×x]\s*/i, "").trim().toLowerCase();
		const itemData = data.itemByUid.get(name) || data.items?.find(it => it.name?.toLowerCase() === name);
		if (!itemData) continue;

		const type = String(itemData.type || "").split("|")[0];
		if (type === "LA" && itemData.ac) {
			base = itemData.ac + mods.dex;
			hasEquippedArmor = true;
		} else if (type === "MA" && itemData.ac) {
			base = itemData.ac + Math.min(2, mods.dex);
			hasEquippedArmor = true;
		} else if (type === "HA" && itemData.ac) {
			base = itemData.ac;
			hasEquippedArmor = true;
		} else if (type === "S") {
			base += 2;
		}
	}

	if (!hasEquippedArmor) {
		// Unarmored defense shortcuts
		const name = cls?.name;
		if (name === "Barbarian") base = 10 + mods.dex + mods.con;
		if (name === "Monk") base = 10 + mods.dex + mods.wis;
	}

	if (character.combat.shield && !hasEquippedArmor) base += 2;
	return base;
}

function computeEquippedAttacks (character, data, mods, pb) {
	const attacks = [];
	const eqLines = character.equipment || [];
	const seenNames = new Set();

	const WEAPON_KEYWORDS = [
		"dagger", "sword", "bow", "axe", "spear", "crossbow", "mace", "staff",
		"quarterstaff", "hammer", "halberd", "glaive", "rapier", "scimitar",
		"club", "javelin", "handaxe", "trident", "whip", "sickle", "dart", "sling",
		"shortsword", "longsword", "greatsword", "shortbow", "longbow", "greataxe", "battleaxe",
	];

	for (const line of eqLines) {
		const isEquippedTag = /\[E\]\s*$/i.test(line);
		const cleanName = line.replace(/\s*\[E\]\s*$/i, "").replace(/^\d+[×x]\s*/i, "").replace(/\s*\([^)]*\)/g, "").trim();
		if (!cleanName || seenNames.has(cleanName.toLowerCase())) continue;

		const k = cleanName.toLowerCase();
		const item = data.itemByUid?.get(k) || data.items?.find(it => it.name?.toLowerCase() === k);

		const isKnownWeapon = item ? (item.weaponCategory || ["M", "R"].includes(String(item.type || "").split("|")[0])) : WEAPON_KEYWORDS.some(kw => k.includes(kw));

		if (isKnownWeapon || isEquippedTag) {
			seenNames.add(k);
			const isFinesse = item?.property?.some(p => p.toLowerCase() === "f") || k.includes("dagger") || k.includes("rapier") || k.includes("scimitar") || k.includes("shortsword");
			const isRanged = item?.weaponCategory?.toLowerCase() === "ranged" || String(item?.type).startsWith("R") || k.includes("bow") || k.includes("crossbow") || k.includes("dart") || k.includes("sling");

			let statMod = mods.str;
			if (isFinesse) statMod = Math.max(mods.str, mods.dex);
			else if (isRanged) statMod = mods.dex;

			const toHit = pb + statMod;
			const dmgDice = item?.dmg1 || (k.includes("greatsword") || k.includes("maul") ? "2d6" : k.includes("greataxe") ? "1d12" : k.includes("longsword") || k.includes("battleaxe") || k.includes("rapier") ? "1d8" : k.includes("shortsword") || k.includes("mace") ? "1d6" : "1d4");
			const dmgType = item?.dmgType ? ` ${item.dmgType}` : "";
			const dmgModStr = statMod >= 0 ? `+${statMod}` : `${statMod}`;
			const damage = `${dmgDice}${dmgModStr}${dmgType}`;

			let range = "Melee (5 ft.)";
			if (item?.property?.some(p => String(p).toLowerCase() === "r") || k.includes("glaive") || k.includes("halberd") || k.includes("pike") || k.includes("whip") || k.includes("lance")) {
				range = "Reach (10 ft.)";
			}
			if (isRanged) {
				const rawRange = item?.range || (k.includes("longbow") ? "150/600" : k.includes("heavy crossbow") ? "100/400" : k.includes("hand crossbow") ? "30/120" : k.includes("dart") || k.includes("sling") ? "30/120" : "80/320");
				range = `${rawRange} ft.`;
			}

			attacks.push({
				name: cleanName,
				toHit,
				damage,
				isRanged,
				range,
				isEquipped: isEquippedTag,
			});
		}
	}

	// Always append Unarmed Strike
	attacks.push({
		name: "Unarmed Strike",
		toHit: pb + mods.str,
		damage: `1${mods.str >= 0 ? `+${mods.str}` : mods.str} bludgeoning`,
		isRanged: false,
		range: "Melee (5 ft.)",
		isEquipped: true,
	});

	return attacks;
}

function computeInventoryWeight (character, data) {
	let total = 0;
	const eqLines = character.equipment || [];

	for (const line of eqLines) {
		const matchQty = line.replace(/\s*\[E\]\s*$/i, "").match(/^(\d+)[×x]\s*(.+)$/i);
		const qty = matchQty ? parseInt(matchQty[1], 10) : 1;
		const name = (matchQty ? matchQty[2] : line.replace(/\s*\[E\]\s*$/i, "")).trim().toLowerCase();

		const item = data.itemByUid.get(name) || data.items?.find(it => it.name?.toLowerCase() === name);
		const unitWeight = item?.weight || 0;
		total += unitWeight * qty;
	}

	const capacity = (character.abilities.str || 10) * 15;
	const isEncumbered = total > (character.abilities.str || 10) * 5;
	const isOverburdened = total > capacity;

	return {
		totalWeight: Math.round(total * 10) / 10,
		capacity,
		isEncumbered,
		isOverburdened,
	};
}

export function listFeaturesUpToLevel (character, data, level) {
	const cls = data.getClass(character.class.uid);
	if (!cls) return [];
	const out = [];
	const seen = new Set();

	const subclass = character.class.subclassUid ? data.getSubclass(character.class.subclassUid) : null;

	for (const ref of cls.classFeatures || []) {
		const lvl = featureLevelFromUid(ref);
		if (lvl == null || lvl > level) continue;
		const name = featureNameFromUid(ref);
		const isSubclassHook = !!(
			(typeof ref === "object" && ref.gainSubclassFeature)
			|| /^subclass feature$/i.test(name)
			|| / subclass$/i.test(name)
		);
		if (isSubclassHook) {
			// Only show a prompt when subclass not yet chosen; real subclass features listed below
			if (!subclass && (typeof ref === "object" ? ref.gainSubclassFeature : true)) {
				const unlock = subclassUnlockLevel(cls);
				if (lvl === unlock) {
					out.push({
						level: lvl,
						name: cls.subclassTitle || name || "Subclass",
						source: "class",
						text: "Choose a subclass to gain its features.",
						isSubclassHook: true,
					});
				}
			}
			continue;
		}
		const ent = data.resolveClassFeatureRef(ref, cls);
		const key = `${lvl}:${name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({
			level: lvl,
			name: ent?.name || name,
			source: "class",
			text: ent ? entriesToText(ent.entries) : "",
			isAsi: isAsiFeatureName(name),
		});
	}

	if (subclass) {
		for (const ref of subclass.subclassFeatures || []) {
			const lvl = featureLevelFromUid(ref);
			if (lvl == null || lvl > level) continue;
			const ent = data.resolveSubclassFeatureRef(ref);
			const fname = ent?.name || featureNameFromUid(ref);
			const key = `sc:${lvl}:${fname}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push({
				level: lvl,
				name: fname,
				source: "subclass",
				text: ent ? entriesToText(ent.entries) : "",
				subclassName: subclass.name,
			});
		}
	}

	// Origin feat + gained feats as features
	if (character.background.originFeatUid) {
		const feat = data.getFeat(character.background.originFeatUid);
		if (feat) {
			out.push({
				level: 1,
				name: feat.name,
				source: "origin-feat",
				text: entriesToText(feat.entries),
			});
		}
	}
	for (const f of character.feats || []) {
		const feat = data.getFeat(f.uid);
		if (!feat) continue;
		out.push({
			level: f.levelGained || 1,
			name: feat.name,
			source: "feat",
			text: entriesToText(feat.entries),
		});
	}

	out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
	return out;
}

/** Levels at which the class grants ASI / feat (by scanning feature names). */
export function asiLevelsForClass (cls) {
	if (!cls) return [];
	const levels = [];
	for (const ref of cls.classFeatures || []) {
		const name = featureNameFromUid(ref);
		const lvl = featureLevelFromUid(ref);
		if (lvl && isAsiFeatureName(name) && !/epic boon/i.test(name)) levels.push(lvl);
	}
	// Epic boon at 19 often separate
	return [...new Set(levels)].sort((a, b) => a - b);
}

export function subclassUnlockLevel (cls) {
	if (!cls) return 3;
	for (const ref of cls.classFeatures || []) {
		if (typeof ref === "object" && ref.gainSubclassFeature) {
			return featureLevelFromUid(ref) || 3;
		}
		const name = featureNameFromUid(ref);
		if (/subclass/i.test(name)) return featureLevelFromUid(ref) || 3;
	}
	return 3;
}

export function needsFeatAtLevel (cls, level) {
	return asiLevelsForClass(cls).includes(level);
}

export function isEpicBoonLevel (cls, level) {
	if (!cls) return false;
	for (const ref of cls.classFeatures || []) {
		const name = featureNameFromUid(ref);
		const lvl = featureLevelFromUid(ref);
		if (lvl === level && /epic boon/i.test(name)) return true;
	}
	return false;
}

/** Fighting style feat progression at level (2024 featProgression). */
export function fightingStylesGainedAt (cls, level) {
	const fp = cls?.featProgression || [];
	let n = 0;
	for (const block of fp) {
		if (!block.category?.some(c => String(c).startsWith("FS"))) continue;
		n += block.progression?.[String(level)] || block.progression?.[level] || 0;
	}
	return n;
}

export function cantripSlotsAt (cls, level) {
	return cls?.cantripProgression?.[level - 1] ?? 0;
}

export function preparedSlotsAt (cls, level) {
	return cls?.preparedSpellsProgression?.[level - 1] ?? 0;
}

export function knownSlotsAt (cls, level) {
	return cls?.spellsKnownProgression?.[level - 1] ?? 0;
}

export function exportPayload (character) {
	const copy = cloneCharacter(character);
	touch(copy);
	copy.fileType = FILE_TYPE;
	copy.schemaVersion = SCHEMA_VERSION;
	return copy;
}

export function importPayload (json) {
	if (!json || typeof json !== "object") throw new Error("Invalid character file.");
	const base = createEmptyCharacter();
	const merged = deepMerge(base, json);
	merged.fileType = FILE_TYPE;
	merged.schemaVersion = SCHEMA_VERSION;
	return merged;
}

function deepMerge (base, overlay) {
	if (Array.isArray(overlay)) return overlay.slice();
	if (overlay && typeof overlay === "object") {
		const out = {...base};
		for (const [k, v] of Object.entries(overlay)) {
			if (k === "fileType" || k === "schemaVersion") {
				out[k] = v;
				continue;
			}
			if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") {
				out[k] = deepMerge(base[k], v);
			} else {
				out[k] = v;
			}
		}
		return out;
	}
	return overlay;
}

export function suggestFilename (character, data) {
	const d = derive(character, data);
	const name = (character.identity.name || "character").replace(/[^\w\- ]+/g, "").trim() || "character";
	return `${name}-L${d.level}-${d.className}`.replace(/\s+/g, "_");
}

export function classSkillOptions (cls) {
	const skills = cls?.startingProficiencies?.skills || [];
	const opts = [];
	let chooseCount = 0;
	for (const block of skills) {
		if (block.choose) {
			chooseCount = block.choose.count || 0;
			for (const s of block.choose.from || []) opts.push(String(s).toLowerCase());
		} else {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) opts.push(String(k).toLowerCase());
			}
		}
	}
	return {options: [...new Set(opts)], chooseCount};
}

export function backgroundAbilityModes (bg) {
	if (!bg?.ability?.length) return [];
	return bg.ability.map((block, index) => {
		if (block.choose?.weighted) {
			const weights = block.choose.weighted.weights || [];
			const from = (block.choose.weighted.from || []).map(a => a.toLowerCase());
			const mode = weights.join("+") === "2+1" || (weights[0] === 2 && weights[1] === 1)
				? "2+1"
				: weights.every(w => w === 1)
					? "1+1+1"
					: weights.join("+");
			return {index, mode, from, weights};
		}
		// fixed
		const fixed = {};
		for (const ab of ABILITIES) if (block[ab]) fixed[ab] = block[ab];
		return {index, mode: "fixed", fixed, from: Object.keys(fixed), weights: Object.values(fixed)};
	});
}

export {
	entityUid,
	subclassUid,
	toUid,
	entriesToText,
	listEquipmentPackages,
	formatEquipmentEntry,
	resolvePackageItems,
};
