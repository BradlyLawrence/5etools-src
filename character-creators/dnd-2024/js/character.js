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

	const acInfo = computeAc(character, data, mods);
	const classResources = computeClassResources2024(character, data, mods, pb);

	let baseSpeed = character.combat.speedOverride
		?? (typeof species?.speed === "number" ? species.speed : species?.speed?.walk)
		?? 30;
	if (acInfo.strPenalty) {
		baseSpeed = Math.max(5, baseSpeed - 10);
	}

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
		speed: baseSpeed,
		ac: acInfo.ac,
		acInfo,
		stealthDisadvantage: acInfo.stealthDisadvantage,
		classResources,
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

export function computeAc (character, data, mods) {
	if (character.combat.acOverride != null) {
		return {
			ac: Number(character.combat.acOverride),
			armorName: "Manual Override",
			shieldName: null,
			hasArmor: false,
			hasShield: false,
			isUnarmoredDef: false,
			stealthDisadvantage: false,
			strPenalty: false,
			acBreakdown: `Manual Override (${character.combat.acOverride})`,
		};
	}

	const cls = data.getClass(character.class.uid);
	const species = data.getSpecies(character.species.uid);
	const strScore = character.abilities.str || 10;
	const isDwarf = species?.name?.toLowerCase().includes("dwarf");

	let baseAc = 10;
	let dexBonus = mods.dex;
	let armorName = null;
	let shieldName = null;
	let hasArmor = false;
	let hasShield = false;
	let isUnarmoredDef = false;
	let stealthDisadvantage = false;
	let strPenalty = false;
	let shieldBonus = 0;

	// Check equipped items in inventory
	const eqLines = character.equipment || [];
	for (const line of eqLines) {
		const isEquipped = /\[E\]\s*$/i.test(line);
		if (!isEquipped) continue;
		const name = line.replace(/\s*\[E\]\s*$/i, "").replace(/^\d+[×x]\s*/i, "").trim().toLowerCase();
		const itemData = data.itemByUid.get(name) || data.itemByUid.get(name.split("|")[0]) || data.items?.find(it => it.name?.toLowerCase() === name);
		if (!itemData) continue;

		const type = String(itemData.type || "").split("|")[0];
		if ((type === "LA" || type === "MA" || type === "HA" || itemData.armor) && itemData.ac && !hasArmor) {
			hasArmor = true;
			armorName = itemData.name;
			baseAc = Number(itemData.ac);
			if (itemData.stealth) stealthDisadvantage = true;

			if (type === "LA") {
				const maxDex = itemData.dexterityMax != null ? Number(itemData.dexterityMax) : Infinity;
				dexBonus = Math.min(maxDex, mods.dex);
			} else if (type === "MA") {
				const maxDex = itemData.dexterityMax != null ? Number(itemData.dexterityMax) : 2;
				dexBonus = Math.min(maxDex, mods.dex);
			} else if (type === "HA") {
				dexBonus = 0;
				const strReq = itemData.strength ? Number(itemData.strength) : 0;
				if (strReq > 0 && strScore < strReq && !isDwarf) {
					strPenalty = true;
				}
			}
		} else if (type === "S" || itemData.shield || name.includes("shield")) {
			if (!hasShield) {
				hasShield = true;
				shieldName = itemData.name;
				shieldBonus = itemData.ac ? Number(itemData.ac) : 2;
			}
		}
	}

	if (!hasArmor) {
		const name = cls?.name;
		if (name === "Barbarian") {
			isUnarmoredDef = true;
			baseAc = 10;
			dexBonus = mods.dex + mods.con;
			armorName = "Barbarian Unarmored Defense (10 + DEX + CON)";
		} else if (name === "Monk") {
			isUnarmoredDef = true;
			baseAc = 10;
			dexBonus = mods.dex + mods.wis;
			armorName = "Monk Unarmored Defense (10 + DEX + WIS)";
			if (hasShield) {
				shieldBonus = 0;
				hasShield = false;
			}
		} else if (name === "Sorcerer" && character.class.subclassName?.toLowerCase().includes("draconic")) {
			isUnarmoredDef = true;
			baseAc = 13;
			dexBonus = mods.dex;
			armorName = "Draconic Resilience (13 + DEX)";
		} else {
			armorName = "Unarmored (10 + DEX)";
		}
	}

	if (character.combat.shield && !hasShield) {
		hasShield = true;
		shieldName = "Shield";
		shieldBonus = 2;
	}

	const totalAc = baseAc + dexBonus + shieldBonus;
	const parts = [`Base ${baseAc}`];
	if (dexBonus !== 0) parts.push(`DEX/Ability ${dexBonus >= 0 ? `+${dexBonus}` : dexBonus}`);
	if (shieldBonus > 0) parts.push(`Shield +${shieldBonus}`);
	const acBreakdown = `${armorName ? `${armorName}: ` : ""}${parts.join(" + ")} = ${totalAc} AC`;

	return {
		ac: totalAc,
		baseAc,
		dexBonus,
		shieldBonus,
		armorName,
		shieldName,
		hasArmor,
		hasShield,
		isUnarmoredDef,
		stealthDisadvantage,
		strPenalty,
		acBreakdown,
	};
}

export function computeClassResources2024 (character, data, mods, pb) {
	const cls = data.getClass(character.class.uid);
	const level = character.level || 1;
	const className = cls?.name || "";
	const savedRes = character.classResources || {};
	const resources = [];

	if (className === "Barbarian") {
		const maxRage = level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6;
		resources.push({
			id: "rage",
			name: "Rage Uses",
			current: Math.max(0, Math.min(maxRage, Number(savedRes.rage ?? maxRage))),
			max: maxRage,
			recovery: "Long Rest",
			resetOn: "long",
		});
	} else if (className === "Bard") {
		const maxInsp = Math.max(1, mods.cha || 1);
		const die = level < 5 ? "d6" : level < 10 ? "d8" : level < 15 ? "d10" : "d12";
		resources.push({
			id: "bardicInspiration",
			name: `Bardic Inspiration (${die})`,
			current: Math.max(0, Math.min(maxInsp, Number(savedRes.bardicInspiration ?? maxInsp))),
			max: maxInsp,
			recovery: level >= 5 ? "Short / Long Rest" : "Long Rest",
			resetOn: level >= 5 ? "short" : "long",
			die,
		});
	} else if (className === "Cleric" && level >= 2) {
		const maxCd = level < 6 ? 2 : level < 18 ? 3 : 4;
		resources.push({
			id: "channelDivinity",
			name: "Channel Divinity",
			current: Math.max(0, Math.min(maxCd, Number(savedRes.channelDivinity ?? maxCd))),
			max: maxCd,
			recovery: "Short / Long Rest",
			resetOn: "short",
		});
	} else if (className === "Druid" && level >= 2) {
		const maxWs = level < 6 ? 2 : level < 17 ? 3 : 4;
		resources.push({
			id: "wildShape",
			name: "Wild Shape",
			current: Math.max(0, Math.min(maxWs, Number(savedRes.wildShape ?? maxWs))),
			max: maxWs,
			recovery: "Short / Long Rest",
			resetOn: "short",
		});
	} else if (className === "Fighter") {
		const maxSw = level < 4 ? 2 : level < 10 ? 3 : 4;
		resources.push({
			id: "secondWind",
			name: "Second Wind",
			current: Math.max(0, Math.min(maxSw, Number(savedRes.secondWind ?? maxSw))),
			max: maxSw,
			recovery: "Short / Long Rest",
			resetOn: "short",
		});
		if (level >= 2) {
			const maxAs = level >= 17 ? 2 : 1;
			resources.push({
				id: "actionSurge",
				name: "Action Surge",
				current: Math.max(0, Math.min(maxAs, Number(savedRes.actionSurge ?? maxAs))),
				max: maxAs,
				recovery: "Short / Long Rest",
				resetOn: "short",
			});
		}
		if (level >= 9) {
			const maxIndom = level < 13 ? 1 : level < 17 ? 2 : 3;
			resources.push({
				id: "indomitable",
				name: "Indomitable",
				current: Math.max(0, Math.min(maxIndom, Number(savedRes.indomitable ?? maxIndom))),
				max: maxIndom,
				recovery: "Long Rest",
				resetOn: "long",
			});
		}
	} else if (className === "Monk" && level >= 2) {
		const maxKi = level;
		resources.push({
			id: "focusPoints",
			name: "Focus / Ki Points",
			current: Math.max(0, Math.min(maxKi, Number(savedRes.focusPoints ?? maxKi))),
			max: maxKi,
			recovery: "Short / Long Rest",
			resetOn: "short",
		});
	} else if (className === "Paladin") {
		const maxLoh = 5 * level;
		resources.push({
			id: "layOnHands",
			name: "Lay on Hands Pool",
			current: Math.max(0, Math.min(maxLoh, Number(savedRes.layOnHands ?? maxLoh))),
			max: maxLoh,
			recovery: "Long Rest",
			resetOn: "long",
		});
		if (level >= 3) {
			const maxCd = level < 11 ? 2 : 3;
			resources.push({
				id: "channelDivinity",
				name: "Channel Divinity",
				current: Math.max(0, Math.min(maxCd, Number(savedRes.channelDivinity ?? maxCd))),
				max: maxCd,
				recovery: "Short / Long Rest",
				resetOn: "short",
			});
		}
	} else if (className === "Ranger") {
		const maxFav = Math.max(2, pb);
		resources.push({
			id: "favoredEnemy",
			name: "Favored Enemy (Hunter's Mark)",
			current: Math.max(0, Math.min(maxFav, Number(savedRes.favoredEnemy ?? maxFav))),
			max: maxFav,
			recovery: "Long Rest",
			resetOn: "long",
		});
	} else if (className === "Sorcerer") {
		if (level >= 2) {
			const maxSp = level;
			resources.push({
				id: "sorceryPoints",
				name: "Sorcery Points",
				current: Math.max(0, Math.min(maxSp, Number(savedRes.sorceryPoints ?? maxSp))),
				max: maxSp,
				recovery: "Long Rest",
				resetOn: "long",
			});
		}
		resources.push({
			id: "innateSorcery",
			name: "Innate Sorcery",
			current: Math.max(0, Math.min(2, Number(savedRes.innateSorcery ?? 2))),
			max: 2,
			recovery: "Long Rest",
			resetOn: "long",
		});
	} else if (className === "Wizard") {
		resources.push({
			id: "arcaneRecovery",
			name: "Arcane Recovery",
			current: Math.max(0, Math.min(1, Number(savedRes.arcaneRecovery ?? 1))),
			max: 1,
			recovery: "Long Rest",
			resetOn: "long",
		});
	}

	return resources;
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
