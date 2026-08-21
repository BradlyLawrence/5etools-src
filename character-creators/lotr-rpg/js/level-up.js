import {abilityMod, averageHitDie, featureLevelFromUid, featureNameFromUid} from "./rules.js?v=3.4";
import {
	subclassUnlockLevel,
	virtueLevelsForClass,
	computeHpMax,
	recomputeCharacter,
	touch,
	FIGHTING_STYLES,
	CLASS_FIGHTING_STYLES,
} from "./character.js?v=3.4";

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
	const needVirtue = virtueLevelsForClass(cls).includes(to);

	// Detect if this level's feature is "Craft" vs "Craft or Virtue" vs pure "Virtue"
	let virtueMode = null; // "craft" | "virtue" | "craft-or-virtue"
	if (needVirtue) {
		if (cls.name === "Scholar") {
			virtueMode = [3, 5, 7, 9].includes(to) ? "craft" : "virtue";
		} else {
			// Check if this level offers craft or virtue (e.g. Captain 2, 6, 10; Champion 2, 6; Messenger 2, 6, 10; Treasure Hunter 6; Warden 2, 6, 10)
			const hasCraftOption = Array.isArray(cls.featProgression) && cls.featProgression.some(fp =>
				Array.isArray(fp.category) && fp.category.includes("Craft") && fp.progression?.[String(to)] != null
			);
			const hasClassFeatCraft = (cls.classFeatures || []).some(ref => {
				const lvl = featureLevelFromUid(ref);
				const name = featureNameFromUid(ref).toLowerCase();
				return lvl === to && name.includes("craft or virtue");
			});
			virtueMode = (hasCraftOption || hasClassFeatCraft) ? "craft-or-virtue" : "virtue";
		}
	}

	const race = data.getRace(character.culture.raceUid);
	const subrace = character.culture.subraceUid
		? data.subraces.find(s =>
			`${String(s.name).toLowerCase()}|${String(s.source || "TLotRR").toLowerCase()}`
			=== String(character.culture.subraceUid).toLowerCase(),
		)
		: null;

	// Detect if character unlocks a Fighting Style
	let needFightingStyle = false;
	let fightingStyles = [];
	const callingLower = (cls.name || "").toLowerCase();
	if (!character.class.fightingStyle) {
		if (callingLower === "champion" && to >= 1) {
			needFightingStyle = true;
			fightingStyles = (CLASS_FIGHTING_STYLES["champion"] || []).map(k => ({name: k, ...(FIGHTING_STYLES[k] || {})}));
		} else if ((callingLower === "captain" || callingLower === "warden") && to >= 2) {
			needFightingStyle = true;
			fightingStyles = (CLASS_FIGHTING_STYLES[callingLower] || []).map(k => ({name: k, ...(FIGHTING_STYLES[k] || {})}));
		} else if (callingLower === "messenger" && to >= 3) {
			needFightingStyle = true;
			fightingStyles = (CLASS_FIGHTING_STYLES["messenger"] || []).map(k => ({name: k, ...(FIGHTING_STYLES[k] || {})}));
		}
	}

	return {
		ok: true,
		from,
		to,
		avgHp,
		faces,
		conMod,
		needSubclass,
		needVirtue,
		virtueMode,
		needFightingStyle,
		fightingStyles,
		subclasses: needSubclass ? data.subclassesForClass(cls) : [],
		virtues: needVirtue && virtueMode !== "craft" ? data.virtuesForRace(race, {subrace}) : [],
		crafts: needVirtue && (virtueMode === "craft" || virtueMode === "craft-or-virtue") ? data.crafts() : [],
		className: cls.name,
		subclassTitle: cls.subclassTitle || "Subclass",
	};
}

export function applyLevelUp (character, data, choices = {}) {
	const preview = previewLevelUp(character, data);
	if (!preview.ok) throw new Error(preview.error);

	const cls = data.getClass(character.class.uid);
	const to = preview.to;

	if (preview.needSubclass) {
		if (!choices.subclassUid) throw new Error(`${preview.subclassTitle} selection required.`);
		character.class.subclassUid = choices.subclassUid;
	}

	if (preview.needVirtue) {
		if (preview.virtueMode === "craft") {
			if (!choices.craftUid) throw new Error("Choose a craft.");
			character.crafts = character.crafts || [];
			character.crafts.push({uid: choices.craftUid, levelGained: to});
		} else if (preview.virtueMode === "virtue") {
			if (!choices.virtueUid) throw new Error("Choose a virtue.");
			character.virtues = character.virtues || [];
			character.virtues.push({uid: choices.virtueUid, levelGained: to});
		} else if (choices.craftUid) {
			character.crafts = character.crafts || [];
			character.crafts.push({uid: choices.craftUid, levelGained: to});
		} else if (choices.virtueUid) {
			character.virtues = character.virtues || [];
			character.virtues.push({uid: choices.virtueUid, levelGained: to});
		} else {
			throw new Error("Choose a virtue or craft.");
		}
	}

	if (preview.needFightingStyle) {
		if (!choices.fightingStyle) throw new Error("Choose a Fighting Style.");
		character.class.fightingStyle = choices.fightingStyle;
	}

	const faces = cls.hd?.faces || 8;
	const conMod = abilityMod(character.abilities.con);
	const gained = choices.hpRoll != null && choices.hpRoll > 0
		? Number(choices.hpRoll)
		: averageHitDie(faces);

	character.class.hitDice = character.class.hitDice || [];
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
			virtueUid: choices.virtueUid || null,
			craftUid: choices.craftUid || null,
		},
	});

	recomputeCharacter(character, data);
	touch(character);
	return character;
}
