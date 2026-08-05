/** Pure 2024 rules helpers (no DOM). */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_FULL = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

export const SKILLS = [
	{id: "acrobatics", ability: "dex", name: "Acrobatics"},
	{id: "animal handling", ability: "wis", name: "Animal Handling"},
	{id: "arcana", ability: "int", name: "Arcana"},
	{id: "athletics", ability: "str", name: "Athletics"},
	{id: "deception", ability: "cha", name: "Deception"},
	{id: "history", ability: "int", name: "History"},
	{id: "insight", ability: "wis", name: "Insight"},
	{id: "intimidation", ability: "cha", name: "Intimidation"},
	{id: "investigation", ability: "int", name: "Investigation"},
	{id: "medicine", ability: "wis", name: "Medicine"},
	{id: "nature", ability: "int", name: "Nature"},
	{id: "perception", ability: "wis", name: "Perception"},
	{id: "performance", ability: "cha", name: "Performance"},
	{id: "persuasion", ability: "cha", name: "Persuasion"},
	{id: "religion", ability: "int", name: "Religion"},
	{id: "sleight of hand", ability: "dex", name: "Sleight of Hand"},
	{id: "stealth", ability: "dex", name: "Stealth"},
	{id: "survival", ability: "wis", name: "Survival"},
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/** Point-buy cost for scores 8–15 (PHB 2024 uses same table as 2014). */
export const POINT_BUY_COST = {
	8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
export const POINT_BUY_BUDGET = 27;

/** Cumulative XP thresholds to reach each level (index = level). Level 1 = 0. */
export const XP_BY_LEVEL = [
	null, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
	85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export function abilityMod (score) {
	return Math.floor((Number(score) - 10) / 2);
}

export function formatMod (mod) {
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus (level) {
	const lvl = Math.min(20, Math.max(1, Number(level) || 1));
	return Math.ceil(lvl / 4) + 1;
}

export function pointBuyCostForScores (scores) {
	let total = 0;
	for (const ab of ABILITIES) {
		const s = scores[ab];
		if (s == null || POINT_BUY_COST[s] == null) return Infinity;
		total += POINT_BUY_COST[s];
	}
	return total;
}

export function pointBuyRemaining (scores) {
	return POINT_BUY_BUDGET - pointBuyCostForScores(scores);
}

/** Average HP for a hit die of `faces` sides (ceil of mean). */
export function averageHitDie (faces) {
	return Math.ceil((1 + faces) / 2);
}

/**
 * Spell slots by caster progression and character level.
 * 5etools uses: "full" | "1/2" | "1/3" | "pact" | "artificer"
 * (2024 Paladin/Ranger use "artificer" — half-caster slots from level 1.)
 * @param {string|null|undefined} progression
 * @param {number} level
 * @returns {number[]} slots for spell levels 1–9
 */
export function spellSlotsFor (progression, level) {
	const lvl = Math.min(20, Math.max(0, Number(level) || 0));
	if (!progression || !lvl) return zeros(9);

	const prog = String(progression).toLowerCase();
	if (prog === "pact") return zeros(9);

	// Prefer explicit 2024 half/artificer table (matches PHB'24 Paladin/Ranger/Artificer)
	if (prog === "artificer" || prog === "1/2" || prog === "half") {
		return padSlots(halfCasterSlots(lvl, {fromLevelOne: prog === "artificer"}));
	}

	const full = [
		[2],
		[3],
		[4, 2],
		[4, 3],
		[4, 3, 2],
		[4, 3, 3],
		[4, 3, 3, 1],
		[4, 3, 3, 2],
		[4, 3, 3, 3, 1],
		[4, 3, 3, 3, 2],
		[4, 3, 3, 3, 2, 1],
		[4, 3, 3, 3, 2, 1],
		[4, 3, 3, 3, 2, 1, 1],
		[4, 3, 3, 3, 2, 1, 1],
		[4, 3, 3, 3, 2, 1, 1, 1],
		[4, 3, 3, 3, 2, 1, 1, 1],
		[4, 3, 3, 3, 2, 1, 1, 1, 1],
		[4, 3, 3, 3, 3, 1, 1, 1, 1],
		[4, 3, 3, 3, 3, 2, 1, 1, 1],
		[4, 3, 3, 3, 3, 2, 2, 1, 1],
	];

	let casterLevel = 0;
	if (prog === "full") casterLevel = lvl;
	else if (prog === "1/3" || prog === "third") casterLevel = Math.ceil(lvl / 3);
	else return zeros(9);

	if (casterLevel <= 0) return zeros(9);
	const row = full[Math.min(20, casterLevel) - 1] || [];
	return padSlots(row);
}

/**
 * Half-caster / artificer-style slots by character level.
 * Classic half (2014 Paladin/Ranger): no slots at level 1.
 * Artificer / 2024 Paladin/Ranger: slots from level 1.
 */
function halfCasterSlots (level, {fromLevelOne = false} = {}) {
	// Index 0 = character level 1
	const artificer = [
		[2], // 1
		[2], // 2
		[3], // 3
		[3], // 4
		[4, 2], // 5
		[4, 2], // 6
		[4, 3], // 7
		[4, 3], // 8
		[4, 3, 2], // 9
		[4, 3, 2], // 10
		[4, 3, 3], // 11
		[4, 3, 3], // 12
		[4, 3, 3, 1], // 13
		[4, 3, 3, 1], // 14
		[4, 3, 3, 2], // 15
		[4, 3, 3, 2], // 16
		[4, 3, 3, 3, 1], // 17
		[4, 3, 3, 3, 1], // 18
		[4, 3, 3, 3, 2], // 19
		[4, 3, 3, 3, 2], // 20
	];
	// Classic half: delay one level (level 1 empty)
	if (!fromLevelOne) {
		if (level <= 1) return [];
		return artificer[level - 2] || [];
	}
	return artificer[level - 1] || [];
}

/**
 * Highest spell level with at least one slot (0 if none).
 * @param {number[]} slots
 */
export function maxSlotLevelFromSlots (slots) {
	if (!slots?.length) return 0;
	let max = 0;
	for (let i = 0; i < slots.length; i++) {
		if (slots[i] > 0) max = i + 1;
	}
	return max;
}

/**
 * Read spell slots from classTableGroups.rowsSpellProgression when present.
 * @param {object} cls
 * @param {number} level
 * @returns {number[]|null}
 */
export function spellSlotsFromClassTable (cls, level) {
	const lvl = Math.min(20, Math.max(1, Number(level) || 1));
	const group = (cls?.classTableGroups || []).find(g => Array.isArray(g.rowsSpellProgression));
	if (!group) return null;
	const row = group.rowsSpellProgression[lvl - 1];
	if (!row) return null;
	return padSlots(row);
}

/**
 * Max spell level a class can cast at a given character level.
 */
export function maxCastableSpellLevel (cls, level) {
	const tableSlots = spellSlotsFromClassTable(cls, level);
	if (tableSlots) return maxSlotLevelFromSlots(tableSlots);

	const prog = cls?.casterProgression;
	if (!prog) {
		// Prepared progression without caster field — assume at least L1 if they prepare spells
		if (cls?.preparedSpellsProgression?.[Math.max(0, level - 1)] > 0) return 1;
		return cls?.cantripProgression ? 0 : 0;
	}
	const slots = spellSlotsFor(prog, level);
	const max = maxSlotLevelFromSlots(slots);
	if (max > 0) return max;
	// 2024 half casters prepare at 1 even if table lookup fails
	if (cls?.preparedSpellsProgression?.[Math.max(0, level - 1)] > 0) return 1;
	return 0;
}

/** Warlock pact magic slots: [slotLevel, slotCount] */
export function pactMagic (level) {
	const lvl = Math.min(20, Math.max(0, Number(level) || 0));
	if (lvl <= 0) return {slotLevel: 0, slots: 0};
	if (lvl === 1) return {slotLevel: 1, slots: 1};
	if (lvl === 2) return {slotLevel: 1, slots: 2};
	if (lvl <= 4) return {slotLevel: 2, slots: 2};
	if (lvl <= 6) return {slotLevel: 3, slots: 2};
	if (lvl <= 8) return {slotLevel: 4, slots: 2};
	if (lvl <= 10) return {slotLevel: 5, slots: 2};
	if (lvl <= 16) return {slotLevel: 5, slots: 3};
	return {slotLevel: 5, slots: 4};
}

function zeros (n) {
	return Array.from({length: n}, () => 0);
}

function padSlots (row) {
	const out = zeros(9);
	for (let i = 0; i < row.length; i++) out[i] = row[i];
	return out;
}

export function isAsiFeatureName (name) {
	if (!name) return false;
	const n = String(name).toLowerCase();
	return n.includes("ability score improvement") || n === "epic boon" || n.includes("feat");
}

export function featureLevelFromUid (featureRef) {
	// "Name|Class|Source|Level" or object with classFeature
	const s = typeof featureRef === "string"
		? featureRef
		: featureRef?.classFeature || featureRef?.subclassFeature || "";
	const parts = s.split("|");
	const level = Number(parts[parts.length - 1]);
	return Number.isFinite(level) ? level : null;
}

export function featureNameFromUid (featureRef) {
	const s = typeof featureRef === "string"
		? featureRef
		: featureRef?.classFeature || featureRef?.subclassFeature || "";
	return s.split("|")[0] || "";
}
