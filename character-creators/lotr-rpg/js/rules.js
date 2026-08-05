/** Shared 5e-style rules helpers + LOTR skill list. */

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_FULL = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

/** Standard PHB skills + LOTR custom skills */
export const SKILLS = [
	{id: "acrobatics", ability: "dex", name: "Acrobatics"},
	{id: "animal handling", ability: "wis", name: "Animal Handling"},
	{id: "athletics", ability: "str", name: "Athletics"},
	{id: "deception", ability: "cha", name: "Deception"},
	{id: "explore", ability: "wis", name: "Explore", custom: true},
	{id: "hunting", ability: "wis", name: "Hunting", custom: true},
	{id: "insight", ability: "wis", name: "Insight"},
	{id: "intimidation", ability: "cha", name: "Intimidation"},
	{id: "investigation", ability: "int", name: "Investigation"},
	{id: "medicine", ability: "wis", name: "Medicine"},
	{id: "nature", ability: "int", name: "Nature"},
	{id: "old lore", ability: "int", name: "Old Lore", custom: true},
	{id: "perception", ability: "wis", name: "Perception"},
	{id: "performance", ability: "cha", name: "Performance"},
	{id: "persuasion", ability: "cha", name: "Persuasion"},
	{id: "riddle", ability: "int", name: "Riddle", custom: true},
	{id: "sleight of hand", ability: "dex", name: "Sleight of Hand"},
	{id: "stealth", ability: "dex", name: "Stealth"},
	{id: "travel", ability: "wis", name: "Travel", custom: true},
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_COST = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9};
export const POINT_BUY_BUDGET = 27;

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

export function averageHitDie (faces) {
	return Math.ceil((1 + faces) / 2);
}

/**
 * Feature UIDs may end with level (…|3) or level+source (…|3|TLotRR).
 */
export function featureLevelFromUid (featureRef) {
	const s = typeof featureRef === "string"
		? featureRef
		: featureRef?.classFeature || featureRef?.subclassFeature || "";
	const parts = s.split("|").filter(Boolean);
	for (let i = parts.length - 1; i >= 0; i--) {
		const n = Number(parts[i]);
		if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
	}
	return null;
}

export function featureNameFromUid (featureRef) {
	const s = typeof featureRef === "string"
		? featureRef
		: featureRef?.classFeature || featureRef?.subclassFeature || "";
	return s.split("|")[0] || "";
}

export function normalizeSkillId (s) {
	return String(s || "")
		.toLowerCase()
		.replace(/\|.*$/, "")
		.trim();
}

/**
 * Format 5etools ability bonus blocks for display.
 * e.g. [{cha: 1}] → "+1 CHA"
 * e.g. [{str: 1, cha: 1}] → "+1 STR, +1 CHA"
 * e.g. [{choose: {weighted: {from: [...], weights: [2,1]}}}] → "+2 / +1 to …"
 */
export function formatAbilityBonus (ability) {
	if (!ability) return "";
	const blocks = Array.isArray(ability) ? ability : [ability];
	const parts = [];

	for (const block of blocks) {
		if (!block || typeof block !== "object") continue;

		if (block.choose?.weighted) {
			const from = (block.choose.weighted.from || []).map(a => String(a).toUpperCase());
			const weights = block.choose.weighted.weights || [];
			const w = weights.map(n => `+${n}`).join(" / ");
			parts.push(`${w} among ${from.join(", ")}`);
			continue;
		}

		if (block.choose?.from) {
			const from = (block.choose.from || []).map(a => String(a).toUpperCase());
			const amount = block.choose.amount != null ? Number(block.choose.amount) : 1;
			const count = block.choose.count != null ? Number(block.choose.count) : 1;
			if (count === 1) parts.push(`+${amount} to one of ${from.join(", ")}`);
			else parts.push(`+${amount} to ${count} of ${from.join(", ")}`);
			continue;
		}

		// Fixed scores (and optional choose mixed on same object)
		const fixed = [];
		for (const ab of ABILITIES) {
			if (typeof block[ab] === "number") {
				const n = block[ab];
				fixed.push(`${n >= 0 ? "+" : ""}${n} ${ab.toUpperCase()}`);
			}
		}
		if (fixed.length) parts.push(fixed.join(", "));
	}

	return parts.join(" · ");
}
