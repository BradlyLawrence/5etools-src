import {
	averageHitDie,
	abilityMod,
} from "./rules-2024.js";
import {
	asiLevelsForClass,
	subclassUnlockLevel,
	needsFeatAtLevel,
	isEpicBoonLevel,
	fightingStylesGainedAt,
	cantripSlotsAt,
	preparedSlotsAt,
	knownSlotsAt,
	computeHpMax,
	recomputeCharacter,
	touch,
} from "./character.js";

/**
 * Describe what the next level will require/grant.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 */
export function previewLevelUp (character, data) {
	const from = character.level || 1;
	if (from >= 20) return {ok: false, error: "Already level 20."};
	const to = from + 1;
	const cls = data.getClass(character.class.uid);
	if (!cls) return {ok: false, error: "No class selected."};

	const faces = cls.hd?.faces || 8;
	const conMod = abilityMod(character.abilities.con);
	const avgHp = averageHitDie(faces) + conMod;

	const needSubclass = to >= subclassUnlockLevel(cls) && !character.class.subclassUid;
	const needFeat = needsFeatAtLevel(cls, to);
	const needEpicBoon = isEpicBoonLevel(cls, to);
	const fsGain = fightingStylesGainedAt(cls, to);

	const cantripsBefore = cantripSlotsAt(cls, from);
	const cantripsAfter = cantripSlotsAt(cls, to);
	const preparedBefore = preparedSlotsAt(cls, from);
	const preparedAfter = preparedSlotsAt(cls, to);
	const knownBefore = knownSlotsAt(cls, from);
	const knownAfter = knownSlotsAt(cls, to);

	return {
		ok: true,
		from,
		to,
		avgHp,
		faces,
		conMod,
		needSubclass,
		needFeat,
		needEpicBoon,
		fsGain,
		cantrips: {before: cantripsBefore, after: cantripsAfter, gain: Math.max(0, cantripsAfter - cantripsBefore)},
		prepared: {before: preparedBefore, after: preparedAfter, gain: Math.max(0, preparedAfter - preparedBefore)},
		known: {before: knownBefore, after: knownAfter, gain: Math.max(0, knownAfter - knownBefore)},
		subclasses: needSubclass ? data.subclassesForClass(cls) : [],
		featPool: needEpicBoon ? data.epicBoons() : needFeat ? data.generalFeats() : [],
		fightingStyles: fsGain > 0 ? data.fightingStyleFeats() : [],
		className: cls.name,
	};
}

/**
 * Apply level-up choices.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 * @param {{
 *   hpRoll?: number|null,
 *   subclassUid?: string|null,
 *   featUid?: string|null,
 *   featAbility?: Record<string, number>,
 *   fightingStyleUid?: string|null,
 *   cantrips?: string[],
 *   prepared?: string[],
 *   known?: string[],
 * }} choices
 */
export function applyLevelUp (character, data, choices = {}) {
	const preview = previewLevelUp(character, data);
	if (!preview.ok) throw new Error(preview.error);

	const cls = data.getClass(character.class.uid);
	const to = preview.to;

	if (preview.needSubclass) {
		if (!choices.subclassUid) throw new Error("Subclass selection required.");
		character.class.subclassUid = choices.subclassUid;
	}

	if (preview.needFeat || preview.needEpicBoon) {
		if (!choices.featUid) throw new Error("Feat selection required.");
		character.feats = character.feats || [];
		character.feats.push({
			uid: choices.featUid,
			levelGained: to,
			choices: {ability: choices.featAbility || {}},
		});
	}

	if (preview.fsGain > 0 && choices.fightingStyleUid) {
		character.feats = character.feats || [];
		character.feats.push({
			uid: choices.fightingStyleUid,
			levelGained: to,
			choices: {},
		});
	}

	// Spells: replace lists if provided (caller sends full new lists)
	if (choices.cantrips) character.spells.cantrips = choices.cantrips.slice();
	if (choices.prepared) character.spells.prepared = choices.prepared.slice();
	if (choices.known) character.spells.known = choices.known.slice();

	// HP
	const faces = cls.hd?.faces || 8;
	const conMod = abilityMod(character.abilities.con);
	const gained = choices.hpRoll != null && choices.hpRoll > 0
		? Number(choices.hpRoll)
		: averageHitDie(faces);
	character.class.hitDice = character.class.hitDice || [];
	// ensure length matches previous level
	while (character.class.hitDice.length < preview.from) {
		const i = character.class.hitDice.length;
		character.class.hitDice.push(i === 0 ? faces : averageHitDie(faces));
	}
	character.class.hitDice.push(gained);

	character.level = to;
	character.class.levels = to;
	character.class.hpMax = computeHpMax(character, data);
	character.class.hpCurrent = Math.min(
		character.class.hpMax,
		(character.class.hpCurrent || 0) + gained + conMod,
	);

	character.levelHistory = character.levelHistory || [];
	character.levelHistory.push({
		toLevel: to,
		choices: {
			hpRoll: gained,
			subclassUid: choices.subclassUid || null,
			featUid: choices.featUid || null,
			fightingStyleUid: choices.fightingStyleUid || null,
		},
	});

	recomputeCharacter(character, data);
	touch(character);
	return character;
}

/**
 * Finalize level-1 after wizard: set HP, origin feat, history.
 */
export function finalizeLevelOne (character, data) {
	const cls = data.getClass(character.class.uid);
	if (!cls) throw new Error("Class required.");
	const faces = cls.hd?.faces || 8;
	character.level = 1;
	character.class.levels = 1;
	character.class.hitDice = [faces];

	character.levelHistory = [{
		toLevel: 1,
		choices: {
			species: character.species.uid,
			background: character.background.uid,
			class: character.class.uid,
			skills: character.class.skillChoices,
		},
	}];

	// Apply background ability bonuses etc. before HP so CON is correct
	character.class.hpMax = 0;
	recomputeCharacter(character, data);
	character.class.hpMax = computeHpMax(character, data);
	character.class.hpCurrent = character.class.hpMax;
	recomputeCharacter(character, data);

	return character;
}
