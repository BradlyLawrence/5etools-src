import {
	ABILITIES,
	ABILITY_FULL,
	SKILLS,
	abilityMod,
	formatMod,
	proficiencyBonus,
	averageHitDie,
	featureLevelFromUid,
	featureNameFromUid,
	normalizeSkillId,
} from "./rules.js?v=3.4";
import {
	entityUid,
	subclassUid,
	entriesToText,
	toUid,
	cleanTags,
} from "./data.js?v=3.4";

export {
	ABILITIES,
	ABILITY_FULL,
	SKILLS,
	abilityMod,
	formatMod,
	entityUid,
	subclassUid,
	entriesToText,
	toUid,
};

export const STORAGE_KEY = "character-creators/lotr-rpg/state";
export const FILE_TYPE = "5etools-char-lotr";
export const SCHEMA_VERSION = 1;

export const CALLING_SHADOW_PATHS = {
	"captain": "Lure of Power",
	"champion": "Curse of Vengeance",
	"messenger": "Wandering Madness",
	"scholar": "Lure of Secrets",
	"treasure hunter": "Dragon-sickness",
	"warden": "Path of Despair",
};

export const SHADOW_PATH_STAGES = {
	"Lure of Power": ["Resentful", "Arrogant", "Overconfident", "Tyrannical"],
	"Curse of Vengeance": ["Spiteful", "Brutal", "Cruel", "Murderous"],
	"Dragon-sickness": ["Grasping", "Mistrustful", "Deceitful", "Thieving"],
	"Lure of Secrets": ["Haughty", "Scornful", "Scheming", "Traitorous"],
	"Path of Despair": ["Troubled", "Wavering", "Guilt-ridden", "Fearful"],
	"Wandering Madness": ["Idle", "Forgetful", "Uncaring", "Cowardly"],
	"Fear of the Shadow": ["Troubled", "Wavering", "Guilt-ridden", "Fearful"],
};

export const FIGHTING_STYLES = {
	"Archery": {
		name: "Archery",
		desc: "You gain a +2 bonus to attack rolls you make with ranged weapons.",
	},
	"Defense": {
		name: "Defense",
		desc: "While you are wearing armor, you gain a +1 bonus to AC.",
	},
	"Dueling": {
		name: "Dueling",
		desc: "When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.",
	},
	"Great Weapon Fighting": {
		name: "Great Weapon Fighting",
		desc: "When you roll damage for an attack you make with a melee weapon that you are wielding with two hands, you can treat any roll of 4 or less on a damage die as a 5. The weapon must have the two-handed or versatile property for you to gain this benefit.",
	},
	"Protection": {
		name: "Protection",
		desc: "When a creature you can see hits you or a target other than you that is within 5 feet of you with a melee attack, you can use your reaction to add your proficiency bonus to the target's AC for that attack, potentially causing the attack to miss. You must be wielding a shield or a finesse weapon.",
	},
	"Two-Weapon Fighting": {
		name: "Two-Weapon Fighting",
		desc: "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.",
	},
};

export const CLASS_FIGHTING_STYLES = {
	"champion": ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"],
	"captain": ["Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"],
	"warden": ["Archery", "Defense", "Dueling", "Protection", "Two-Weapon Fighting"],
	"herald": ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"],
	"messenger": ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"],
};

export function fightingStyleUnlockLevel (cls) {
	if (!cls) return null;
	const name = (cls.name || "").toLowerCase();
	if (name === "champion") return 1;
	if (name === "captain") return 2;
	if (name === "warden") return 2;
	return null;
}

export function createEmptyCharacter () {
	const now = new Date().toISOString();
	return {
		fileType: FILE_TYPE,
		schemaVersion: SCHEMA_VERSION,
		meta: {
			createdAt: now,
			updatedAt: now,
			app: "character-creators/lotr-rpg",
			system: "The Lord of the Rings Roleplaying (Free League / 5e)",
		},
		identity: {
			name: "",
			playerName: "",
			patron: "",
			fellowship: 0,
			flaw: "",
			distinctiveFeatures: "",
			age: "",
			height: "",
			weight: "",
			eyes: "",
			skin: "",
			hair: "",
			heirName: "",
			investment: "",
			alignment: "",
			notes: "",
		},
		level: 1,
		abilities: {
			str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8,
			method: "standardArray",
			base: {str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8},
		},
		culture: {
			raceUid: null,
			subraceUid: null,
			size: "M",
			/** starting cultural/common virtue */
			startingVirtueUid: null,
			abilityChoice: {}, // for weighted race ASIs e.g. Ranger
		},
		background: {
			uid: null,
		},
		class: {
			uid: null,
			levels: 1,
			subclassUid: null,
			skillChoices: [],
			equipmentChoices: {packages: {}, typePicks: {}},
			hitDice: [],
			hpMax: 0,
			hpCurrent: 0,
		},
		hope: {
			current: null,
			max: null,
		},
		shadow: {
			score: 0,
			path: "",
			scars: [],
			isMiserable: false,
			isMelancholy: false,
			notes: "",
		},
		currency: {
			silver: 0,
			copper: 0,
			gold: 0,
		},
		virtues: [], // {uid, levelGained}
		crafts: [], // {uid, levelGained}
		proficiencies: {
			skills: {},
			tools: {},
			saves: [],
			armor: [],
			weapons: [],
		},
		equipment: [],
		combat: {
			acOverride: null,
			shield: false,
			speedOverride: null,
		},
		levelHistory: [],
	};
}

export function touch (c) {
	c.meta = c.meta || {};
	c.meta.updatedAt = new Date().toISOString();
	return c;
}

export function cloneCharacter (c) {
	return JSON.parse(JSON.stringify(c));
}

export function getAbilityBonuses (character, data) {
	const bonuses = {str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0};
	if (!character || !data) return bonuses;

	const race = data.getRace(character.culture?.raceUid);
	const sub = character.culture?.subraceUid
		? data.subraces.find(s => toUid(s.name, s.source) === String(character.culture.subraceUid).toLowerCase())
		: null;

	const applyBlock = (block) => {
		if (!block) return;
		for (const ab of ABILITIES) {
			if (typeof block[ab] === "number") bonuses[ab] += block[ab];
		}
	};

	if (sub?.overwrite?.ability) {
		if (sub.ability) sub.ability.forEach(applyBlock);
	} else {
		if (race?.ability) race.ability.forEach(applyBlock);
		if (sub?.ability) sub.ability.forEach(applyBlock);
	}

	const assigns = character.culture?.abilityChoice || {};
	for (const [ab, n] of Object.entries(assigns)) {
		if (ABILITIES.includes(ab)) bonuses[ab] += Number(n || 0);
	}

	const virtueUids = [
		character.culture?.startingVirtueUid,
		...(character.virtues || []).map(v => v.uid),
	].filter(Boolean);
	for (const uid of virtueUids) {
		const feat = data.getFeat(uid);
		if (!feat?.ability) continue;
		for (const block of feat.ability) {
			for (const ab of ABILITIES) {
				if (typeof block[ab] === "number") bonuses[ab] += block[ab];
			}
		}
	}

	return bonuses;
}

export function recomputeAbilityScores (character, data) {
	character.abilities = character.abilities || {};
	character.abilities.base = character.abilities.base || {};

	const bonuses = getAbilityBonuses(character, data);

	for (const ab of ABILITIES) {
		if (character.abilities.base[ab] != null) {
			character.abilities[ab] = Math.min(30, Math.max(1, Number(character.abilities.base[ab]) + (bonuses[ab] || 0)));
		} else if (character.abilities[ab] != null) {
			const finalVal = Number(character.abilities[ab]) || 10;
			character.abilities.base[ab] = Math.max(1, finalVal - (bonuses[ab] || 0));
			character.abilities[ab] = finalVal;
		} else {
			character.abilities.base[ab] = 10;
			character.abilities[ab] = 10 + (bonuses[ab] || 0);
		}
	}
	return character;
}

export function recomputeCharacter (character, data) {
	recomputeAbilityScores(character, data);
	character.level = character.class?.levels || character.level || 1;
	character.class.levels = character.level;

	const cls = data.getClass(character.class.uid);
	const race = data.getRace(character.culture.raceUid);
	const bg = data.getBackground(character.background.uid);

	const saves = {};
	for (const ab of (cls?.proficiency || [])) saves[ab] = true;
	character.proficiencies.saves = Object.keys(saves);

	const skills = {...(character.proficiencies.skills || {})};
	const mark = (id) => {
		const k = normalizeSkillId(id);
		if (k) {
			if (skills[k] !== "expert" && skills[k] !== "expertise") {
				skills[k] = "proficient";
			}
		}
	};
	if (race?.skillProficiencies) {
		for (const block of race.skillProficiencies) {
			for (const [k, v] of Object.entries(block)) if (v === true) mark(k);
		}
	}
	if (bg?.skillProficiencies) {
		for (const block of bg.skillProficiencies) {
			for (const [k, v] of Object.entries(block)) if (v === true) mark(k);
		}
	}
	for (const sk of character.class.skillChoices || []) mark(sk);
	character.proficiencies.skills = skills;

	const tools = {...(character.proficiencies.tools || {})};
	if (race?.toolProficiencies) {
		for (const block of race.toolProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) tools[k.split("|")[0]] = true;
			}
		}
	}
	if (bg?.toolProficiencies) {
		for (const block of bg.toolProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) tools[k.split("|")[0]] = true;
			}
		}
	}
	for (const t of (character.class?.toolChoices || [])) {
		tools[t.split("|")[0]] = true;
	}
	character.proficiencies.tools = tools;

	const wpSet = new Set(cls?.startingProficiencies?.weapons || []);
	if (race?.weaponProficiencies) {
		for (const block of race.weaponProficiencies) {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) wpSet.add(k.split("|")[0]);
			}
		}
	}
	character.proficiencies.weapons = [...wpSet];
	character.proficiencies.armor = cls?.startingProficiencies?.armor || [];

	if (race?.size?.length && !character.culture.size) {
		character.culture.size = race.size[0];
	}

	if (!character.equipment?.length) {
		character.equipment = collectEquipment(character, data);
	}

	if (!character.class.hpMax) {
		character.class.hpMax = computeHpMax(character, data);
		character.class.hpCurrent = character.class.hpMax;
	}

	// Dwarf racial HP
	// Endurance of the Dwarves handled in computeHpMax

	touch(character);
	return character;
}

function collectEquipment (character, data) {
	const cls = data.getClass(character.class.uid);
	if (!cls) return [];
	const raw = character.class.equipmentChoices || {};
	// Migrate legacy flat map { "0": "a" } → { packages, typePicks }
	const choices = raw.packages || raw.typePicks
		? raw
		: {packages: raw, typePicks: {}};
	return data.resolveClassEquipment(cls, choices);
}

/** Missing equipmentType dropdowns for the currently selected packages. */
export function missingEquipmentTypePicks (character, data) {
	const cls = data.getClass(character.class.uid);
	if (!cls) return [];
	const raw = character.class.equipmentChoices || {};
	const packages = raw.packages || (raw.typePicks ? {} : raw);
	const typePicks = raw.typePicks || {};
	const missing = [];
	for (const block of data.classEquipmentChoices(cls)) {
		const optId = packages[block.id] || block.options[0]?.id;
		const opt = block.options.find(o => o.id === optId) || block.options[0];
		if (!opt) continue;
		for (const part of opt.parts) {
			if (part.kind !== "type") continue;
			const key = `${block.id}:${opt.id}:${part.pickKey ?? `${part.index}.${part.slot || 0}`}`;
			const legacy = `${block.id}:${opt.id}:${part.index}`;
			if (!typePicks[key] && !typePicks[legacy] && !typePicks[`${block.id}:${part.index}`]) {
				missing.push(part.label);
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
	const race = data.getRace(character.culture.raceUid);
	const dwarfBonus = race?.name === "Dwarf" ? level : 0; // +1 per level

	if (character.class.hitDice?.length) {
		let total = 0;
		for (let i = 0; i < level; i++) {
			const roll = character.class.hitDice[i];
			const base = i === 0 ? (roll ?? faces) : (roll ?? averageHitDie(faces));
			total += base + conMod;
		}
		return Math.max(1, total + dwarfBonus);
	}

	let total = faces + conMod;
	for (let i = 2; i <= level; i++) total += averageHitDie(faces) + conMod;
	return Math.max(1, total + dwarfBonus);
}

export function subclassUnlockLevel (cls) {
	if (!cls) return 3;
	for (const ref of cls.classFeatures || []) {
		if (typeof ref === "object" && ref.gainSubclassFeature) {
			return featureLevelFromUid(ref) || 3;
		}
	}
	return 3;
}

/** Levels where Craft or Virtue / Virtue features appear */
export function virtueLevelsForClass (cls) {
	if (!cls) return [];
	const levels = new Set();
	if (Array.isArray(cls.featProgression)) {
		for (const fp of cls.featProgression) {
			if (fp.progression) {
				for (const lvlStr of Object.keys(fp.progression)) {
					const lvl = parseInt(lvlStr, 10);
					if (lvl > 1) levels.add(lvl);
				}
			}
		}
	}
	for (const ref of cls.classFeatures || []) {
		const name = featureNameFromUid(ref).toLowerCase();
		const lvl = featureLevelFromUid(ref);
		if (!lvl || lvl <= 1) continue;
		if (name.includes("virtue") || name.includes("craft or virtue") || name === "crafts") {
			levels.add(lvl);
		}
	}
	return [...levels].sort((a, b) => a - b);
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
		const isHook = typeof ref === "object" && ref.gainSubclassFeature;
		if (isHook) {
			if (!subclass) {
				out.push({
					level: lvl,
					name: cls.subclassTitle || name,
					source: "class",
					text: `Choose a ${cls.subclassTitle || "subclass"}.`,
					isSubclassHook: true,
				});
			}
			continue;
		}
		const ent = data.resolveClassFeatureRef(ref);
		const key = `${lvl}:${name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		let featName = ent?.name || name;
		let featText = ent ? entriesToText(ent.entries) : "";
		if (name.toLowerCase().includes("fighting style")) {
			if (character.class?.fightingStyle) {
				featName = `Fighting Style: ${character.class.fightingStyle}`;
				const styleInfo = FIGHTING_STYLES[character.class.fightingStyle];
				if (styleInfo) featText = `${styleInfo.desc}\n\n${featText}`.trim();
			}
		}
		out.push({
			level: lvl,
			name: featName,
			source: "class",
			text: featText,
		});
	}

	if (subclass) {
		for (const ref of subclass.subclassFeatures || []) {
			const lvl = featureLevelFromUid(ref);
			if (lvl == null || lvl > level) continue;
			const ent = data.resolveSubclassFeatureRef(ref);
			out.push({
				level: lvl,
				name: ent?.name || featureNameFromUid(ref),
				source: "subclass",
				text: ent ? entriesToText(ent.entries) : "",
			});
		}
	}

	if (character.culture.startingVirtueUid) {
		const feat = data.getFeat(character.culture.startingVirtueUid);
		if (feat) {
			out.push({
				level: 1,
				name: feat.name,
				source: "virtue",
				text: entriesToText(feat.entries),
			});
		}
	}
	for (const v of character.virtues || []) {
		const feat = data.getFeat(v.uid);
		if (feat) {
			out.push({
				level: v.levelGained || 1,
				name: feat.name,
				source: "virtue",
				text: entriesToText(feat.entries),
			});
		}
	}
	for (const c of character.crafts || []) {
		const feat = data.getFeat(c.uid);
		if (feat) {
			out.push({
				level: c.levelGained || 1,
				name: feat.name,
				source: "craft",
				text: entriesToText(feat.entries),
			});
		}
	}

	out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
	return out;
}

export const DISTINCTIVE_FEATURE_DESCRIPTIONS = {
	"Bold": "Daring and courageous in the face of peril, you are quick to step forward for dangerous tasks and refuse to be cowed by threats.",
	"Cunning": "Clever, resourceful, and shrewd, you quickly assess complications, notice angles others miss, and turn difficult situations to your advantage.",
	"Eager": "Enthusiastic, energetic, and swift to act, you throw yourself into tasks with great zeal and rarely hesitate when a decision is needed.",
	"Fair-spoken": "Polite, articulate, and charming in speech, you know the right courtesies and words to put others at ease and earn trust in Councils and social encounters.",
	"Faithful": "Loyal, trustworthy, and steadfast to your oaths, companions, and loved ones, you never break a promise or abandon an ally in need.",
	"Fierce": "Intense, formidable, and uncompromising in conflict, your sharp gaze and grim resolve can intimidate foes and inspire allies in battle.",
	"Generous": "Open-handed, hospitable, and charitable, you share your food, shelter, and wealth freely without demanding recompense.",
	"Honourable": "Guided by a strict code of integrity, nobility, and justice, you treat allies and defeated enemies with fairness and respect.",
	"Honorable": "Guided by a strict code of integrity, nobility, and justice, you treat allies and defeated enemies with fairness and respect.",
	"Inquisitive": "Curious, observant, and keen-eyed, you notice subtle details, investigate anomalies, and seek to uncover forgotten lore or hidden truths.",
	"Lordly": "Imposing, regal, and authoritative, your noble bearing and commanding presence earn deference and respect in royal courts, halls, and among soldiers.",
	"Merry": "Joyful, high-spirited, and light-hearted, you lift the gloom from heavy hearts with cheerful songs, jokes, and enduring optimism even in dark places.",
	"Patient": "Calm, enduring, and deliberate, you can wait out hardships, track long journeys without complaint, and bide your time for the opportune moment.",
	"Proud": "Dignified and mindful of your folk's heritage and glory, you hold yourself to high standards and fiercely defend your reputation and lineage.",
	"Rustic": "Down-to-earth, unassuming, and in tune with common folk and simple crafts, your plain honesty makes you approachable and grounded.",
	"Secretive": "Guarded, quiet, and discreet, you keep your own counsel, reveal nothing unnecessary, and move without drawing undue notice.",
	"Stern": "Resolute, unyielding, and serious of mind, you do not tolerate foolishness, see through falsehoods, and face grim realities without flinching.",
	"Subtle": "Quiet, nuanced, and unobtrusive, you achieve your aims through finesse, careful timing, and unspoken understandings rather than blunt force.",
	"Tall": "Your striking physical height and broad posture lend you natural presence, imposing stature, and reach.",
	"True-hearted": "Sincere, genuine, and incorruptible of spirit, your intentions are pure, untainted by hidden malice or selfish ambition.",
	"Wary": "Alert, cautious, and vigilant against deceit or sudden ambushes, you rarely let your guard down in unfamiliar territory or among strangers.",
	"Wilful": "Determined, resolute, and stubbornly unbending, your strong willpower helps you resist charm, coercion, despair, and corruption.",
	"Steadfast": "Unwavering under stress or danger, standing your ground when others falter.",
	"Absent-minded": "Deeply absorbed in lore or observation, often uncovering subtle truths while appearing distracted.",
	"Cautious": "Methodical and careful, weighing risks before acting to avoid traps and ambushes.",
};

export const SHADOW_FLAW_DESCRIPTIONS = {
	// Curse of Vengeance (Champion)
	"Spiteful": "You often repay real or imagined wrongs with vicious rudeness. Depending on the provocation, you may simply be very impolite, or downright insulting.",
	"Brutal": "You react violently to provocations and show little restraint under most circumstances.",
	"Cruel": "You don't care if your actions cause pain and suffering to others, and are needlessly savage with your enemies.",
	"Murderous": "You become murderous when you start to consider killing as a perfectly natural way to achieve a goal or simply to make things go your way.",

	// Dragon-sickness (Treasure Hunter)
	"Grasping": "If you become grasping, you seek to accumulate gold and precious items above all else, just for the sake of possessing them.",
	"Mistrustful": "When your prized possessions start to weigh you down and become a treasure to be guarded, even the good advice of friends appears to mask dubious intentions.",
	"Deceitful": "You feel no shame in misleading others with lies and stratagems, as long as your machinations further your ends and corrupted needs.",
	"Thieving": "You have discovered that anything you desire can be yours—you just have to take it. You have earned the right to take all you want when you sacrificed the love of your peers and your own self-respect.",
	"Thievish": "You have discovered that anything you desire can be yours—you just have to take it. You have earned the right to take all you want when you sacrificed the love of your peers and your own self-respect.",

	// Lure of Power (Captain)
	"Resentful": "You risk becoming bitter and angry with the people you ought to lead. You often feel that you risk your life for individuals that fail to see the wisdom of your words.",
	"Arrogant": "You don't miss an opportunity to underline your own importance, often belittling your peers and companions.",
	"Overconfident": "Overconfidence denotes overweening pride, a sentiment that blinds you to your own limits and weaknesses. You endeavour to do anything you set your mind upon, regardless of the consequences that might befall others.",
	"Tyrannical": "You escalate your actions and desires to the level of a just cause. Your disregard for the lives of others is so profound that you go to any lengths to achieve your ends, regardless of the cost or methods employed to accomplish them. Any dissenting opinion is considered as utter betrayal.",

	// Lure of Secrets (Scholar)
	"Haughty": "You don't easily recognise the wisdom found in the words and actions of others, and tend to turn aside all advice and offers of help.",
	"Scornful": "You treat the propositions of others with disdain, making use of every opportunity to mock them for their presumed inadequacy.",
	"Scheming": "You keep your thoughts and intentions to yourself at all times, never giving advice and heeding only your own judgement. You might sometimes agree with the propositions of others, but only to be free to follow your own choices later.",
	"Traitorous": "When you become traitorous you cannot be trusted to keep your word. You are ready to betray your own friends and allies, if it would turn to your advantage.",

	// Path of Despair / Fear of the Shadow (Warden)
	"Troubled": "You feel a sense of disquiet that makes it hard for you to read a situation clearly and offer counsel to others.",
	"Wavering": "Caution can be the enemy of action, and when you become wavering you cannot set your mind upon a choice quickly and effectively. You vacillate between the various options you see before you.",
	"Guilt-ridden": "The curse of those who defend others is to feel remorse when their actions go amiss, pushing you to refuse any daring course of action.",
	"Guilt-Ridden": "The curse of those who defend others is to feel remorse when their actions go amiss, pushing you to refuse any daring course of action.",
	"Fearful": "When you become fearful you are so beset by worries and concerns that you cannot force yourself to risk doing anything that will potentially endanger yourself and those you care for.",

	// Wandering Madness (Messenger)
	"Idle": "It takes a lot to stir idle adventurers into action. You are easily distracted, and must be cajoled to fully participate in endeavours.",
	"Forgetful": "Being forgetful indicates that you are often daydreaming and absent-minded, and find it difficult to remember even important things.",
	"Uncaring": "When you become uncaring you lose touch with the world outside of yourself. You cannot bring yourself to feel compassion, and quickly lose interest in matters that do not concern you directly.",
	"Cowardly": "You care only for your own safety under any circumstances, and will go to any lengths to save yourself when a threat arises.",
};

export function derive (character, data) {
	recomputeAbilityScores(character, data);
	const level = character.level || 1;
	const pb = proficiencyBonus(level);
	const cls = data.getClass(character.class.uid);
	const race = data.getRace(character.culture.raceUid);
	const bg = data.getBackground(character.background.uid);
	const virtue = character.culture.startingVirtueUid ? data.getFeat(character.culture.startingVirtueUid) : null;
	const subclass = character.class.subclassUid ? data.getSubclass(character.class.subclassUid) : null;
	const subrace = character.culture.subraceUid
		? data.subraces.find(s => toUid(s.name, s.source) === String(character.culture.subraceUid).toLowerCase())
		: null;

	const mods = {};
	for (const ab of ABILITIES) mods[ab] = abilityMod(character.abilities[ab]);

	const saves = {};
	for (const ab of ABILITIES) {
		const prof = (character.proficiencies.saves || []).includes(ab);
		saves[ab] = {proficient: prof, value: mods[ab] + (prof ? pb : 0)};
	}

	const skillRows = SKILLS.map(sk => {
		const mode = character.proficiencies.skills?.[sk.id];
		const isExpert = mode === "expert" || mode === "expertise" || mode === 2;
		const isProf = isExpert || !!mode;
		const multiplier = isExpert ? 2 : (isProf ? 1 : 0);
		const bonus = mods[sk.ability] + (multiplier * pb);
		return {
			...sk,
			proficient: isProf,
			isExpert,
			profMode: isExpert ? "expert" : (isProf ? "proficient" : "none"),
			bonus,
		};
	});

	const acInfo = computeAc(character, data, mods);
	const classResources = computeCallingResources(character, data, mods, pb);

	let baseSpeed = character.combat.speedOverride
		?? (typeof race?.speed === "number" ? race.speed : race?.speed?.walk)
		?? 30;
	if (acInfo.strPenalty) {
		baseSpeed = Math.max(5, baseSpeed - 10);
	}

	const attacks = computeEquippedAttacks(character, data, mods, pb);
	const weightInfo = computeInventoryWeight(character, data);

	const hopeMax = 10 + mods.wis;
	const hopeCurrent = character.hope?.current ?? hopeMax;

	const shadowPath = character.shadow?.path || CALLING_SHADOW_PATHS[cls?.name?.toLowerCase()] || "Lure of Power";
	const stageNames = SHADOW_PATH_STAGES[shadowPath] || SHADOW_PATH_STAGES["Lure of Power"];
	const shadowStage = Math.max(0, Math.min(4, Number(character.shadow?.stage) || (character.shadow?.flaws?.length || 0)));
	const shadowPathStages = stageNames.map((name, i) => ({
		stage: i + 1,
		name,
		active: i < shadowStage || (character.shadow?.flaws || []).includes(name),
	}));

	const activeFlaws = shadowPathStages.filter(s => s.active).map(s => s.name);
	const derivedFlaw = character.identity?.flaw || activeFlaws.join(", ");
	const bgDistinctive = backgroundDistinctiveFeatures(bg);
	const derivedFeatures = character.identity?.distinctiveFeatures || bgDistinctive;
	const activeShadowFlaws = shadowPathStages
		.filter(s => s.active)
		.map(s => {
			const flawDesc = SHADOW_FLAW_DESCRIPTIONS[s.name]
				|| SHADOW_FLAW_DESCRIPTIONS[s.name?.trim()]
				|| "When a hero's Shadow score reaches their Hope, or when they succumb to despair, they gain this progressive Shadow Flaw.";
			return {
				level: s.stage,
				name: `Shadow Flaw (Stage ${s.stage}): ${s.name}`,
				source: "shadow-flaw",
				text: `Calling Shadow Path (${shadowPath}) — Stage ${s.stage} Flaw: ${s.name}\n\n${flawDesc}\n\nEffect: If you make an ability check that can plausibly be affected by this flaw, the check has disadvantage.`,
			};
		});

	const distinctiveList = (derivedFeatures || "")
		.split(",")
		.map(s => s.trim())
		.filter(Boolean);

	const bgDistinctiveFeaturesList = distinctiveList.map(tName => {
		const desc = DISTINCTIVE_FEATURE_DESCRIPTIONS[tName]
			|| DISTINCTIVE_FEATURE_DESCRIPTIONS[tName.trim()]
			|| `Distinctive Feature trait of your background (${bg?.name || "Background"}). Invoking this trait during roleplaying or Councils can grant Advantage or Inspiration.`;
		return {
			level: 1,
			name: `Distinctive Feature: ${tName}`,
			source: "background",
			text: `Background (${bg?.name || "Background"}) — Distinctive Feature: ${tName}\n\n${desc}\n\nUsage: In Councils, social encounters, or relevant ability checks, invoking this distinctive feature can grant Advantage on your check or Inspiration when roleplayed faithfully.`,
		};
	});

	const bgTraitFeature = bg ? [{
		level: 1,
		name: `Background (${bg.name})`,
		source: "background",
		text: `Distinctive Features: ${derivedFeatures || "None"}${bg?.entries?.length ? `\n\n${entriesToText(bg.entries)}` : ""}`,
	}] : [];

	return {
		level,
		culture: race,
		subculture: subrace,
		class: cls,
		subclass,
		background: bg,
		startingVirtue: virtue,
		skills: skillRows,
		abilities: character.abilities,
		abilityBonuses: getAbilityBonuses(character, data),
		mods,
		saves,
		pb,
		className: cls?.name || "—",
		subclassName: subclass?.name || null,
		subclassTitle: cls?.subclassTitle || "Subclass",
		cultureName: race?.name || "—",
		subraceName: subrace?.name || null,
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
		initiative: mods.dex,
		passivePerception: 10 + (skillRows.find(s => s.id === "perception")?.bonus ?? mods.wis),
		features: [
			...listFeaturesUpToLevel(character, data, level),
			...bgDistinctiveFeaturesList,
			...bgTraitFeature,
			...activeShadowFlaws,
			...(character.customFeatures || []).map(f => ({
				name: f.name,
				text: f.text || "",
				level: f.level || 1,
				source: f.source || "custom",
				isCustom: true,
				id: f.id,
			})),
		],
		shadow: character.shadow?.score || 0,
		shadowScars: character.shadow?.scars || [],
		shadowPath,
		shadowStage,
		shadowPathStages,
		isMiserable: !!character.shadow?.isMiserable,
		isMelancholy: !!character.shadow?.isMelancholy,
		hopeCurrent,
		hopeMax,
		patron: character.identity?.patron || "",
		fellowship: character.identity?.fellowship || 0,
		flaw: derivedFlaw,
		distinctiveFeatures: derivedFeatures,
		age: character.identity?.age || "",
		height: character.identity?.height || "",
		weight: character.identity?.weight || "",
		eyes: character.identity?.eyes || "",
		skin: character.identity?.skin || "",
		hair: character.identity?.hair || "",
		heirName: character.identity?.heirName || "",
		investment: character.identity?.investment || "",
		currency: character.currency || {silver: 0, copper: 0, gold: 0},
		proficiencyArmor: character.proficiencies.armor || [],
		proficiencyWeapons: character.proficiencies.weapons || [],
		tools: Object.keys(character.proficiencies.tools || {}),
		attacks,
		weightInfo,
	};
}

export function backgroundDistinctiveFeatures (bg) {
	if (!bg?.entries) return "";
	for (const list of bg.entries) {
		if (list?.type === "list" && Array.isArray(list.items)) {
			for (const item of list.items) {
				if (item?.name === "Distinctive Features" && Array.isArray(item.entries)) {
					return item.entries.map(e => typeof e === "string" ? cleanTags(e) : "").filter(Boolean).join(", ");
				}
			}
		}
	}
	return "";
}

function computeInventoryWeight (character, data) {
	let total = 0;
	const eqLines = character.equipment || [];

	for (const line of eqLines) {
		const matchQty = line.replace(/\s*\[E\]\s*$/i, "").match(/^(\d+)[×x]\s*(.+)$/i);
		const qty = matchQty ? parseInt(matchQty[1], 10) : 1;
		const name = (matchQty ? matchQty[2] : line.replace(/\s*\[E\]\s*$/i, "")).trim().toLowerCase();

		const item = data.itemByUid?.get(name) || data.baseItems?.find(it => it.name?.toLowerCase() === name);
		const unitWeight = item?.weight || 0;
		total += unitWeight * qty;
	}

	const capacity = (character.abilities.str || 10) * 15;
	return {
		totalWeight: Math.round(total * 10) / 10,
		capacity,
		isEncumbered: total > (character.abilities.str || 10) * 5,
		isOverburdened: total > capacity,
	};
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
		"bow of the mark", "noble sword", "war-horn",
	];

	for (const line of eqLines) {
		const isEquippedTag = /\[E\]\s*$/i.test(line);
		const cleanName = line.replace(/\s*\[E\]\s*$/i, "").replace(/^\d+[×x]\s*/i, "").replace(/\s*\([^)]*\)/g, "").trim();
		if (!cleanName || seenNames.has(cleanName.toLowerCase())) continue;

		const k = cleanName.toLowerCase();
		const item = data.itemByUid?.get(k) || data.baseItems?.find(it => it.name?.toLowerCase() === k);

		const isKnownWeapon = item ? (item.weaponCategory || ["M", "R"].includes(String(item.type || "").split("|")[0])) : WEAPON_KEYWORDS.some(kw => k.includes(kw));

		if (isKnownWeapon || isEquippedTag) {
			seenNames.add(k);
			const isFinesse = item?.property?.some(p => p.toLowerCase() === "f") || k.includes("dagger") || k.includes("rapier") || k.includes("scimitar") || k.includes("shortsword");
			const isRanged = item?.weaponCategory?.toLowerCase() === "ranged" || String(item?.type).startsWith("R") || k.includes("bow") || k.includes("crossbow") || k.includes("dart") || k.includes("sling");

			let statMod = mods.str;
			if (isFinesse) statMod = Math.max(mods.str, mods.dex);
			else if (isRanged) statMod = mods.dex;

			let toHit = pb + statMod;
			if (isRanged && character.class?.fightingStyle === "Archery") {
				toHit += 2;
			}
			const dmgDice = item?.dmg1 || (k.includes("greatsword") || k.includes("maul") ? "2d6" : k.includes("greataxe") ? "1d12" : k.includes("longsword") || k.includes("battleaxe") || k.includes("rapier") ? "1d8" : k.includes("shortsword") || k.includes("mace") ? "1d6" : "1d4");
			const dmgType = item?.dmgType ? ` ${item.dmgType}` : "";
			let dmgModStr = statMod >= 0 ? `+${statMod}` : `${statMod}`;
			if (!isRanged && character.class?.fightingStyle === "Dueling") {
				dmgModStr += " (+2 Dueling)";
			}
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

export function classSkillOptions (cls) {
	const skills = cls?.startingProficiencies?.skills || [];
	const opts = [];
	let chooseCount = 0;
	for (const block of skills) {
		if (block.choose) {
			chooseCount = block.choose.count || 0;
			for (const s of block.choose.from || []) opts.push(normalizeSkillId(s));
		} else {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) opts.push(normalizeSkillId(k));
			}
		}
	}
	return {options: [...new Set(opts)], chooseCount};
}

export function classToolOptions (cls) {
	const toolProfs = cls?.startingProficiencies?.toolProficiencies || [];
	const opts = [];
	let chooseCount = 0;
	for (const block of toolProfs) {
		if (block.choose) {
			chooseCount = block.choose.count || 0;
			for (const t of block.choose.from || []) opts.push(t.split("|")[0]);
		} else if (block.any) {
			chooseCount = Number(block.any) || 1;
			opts.push(
				"any artisan's tools",
				"calligrapher's supplies",
				"cartographer's tools",
				"cobbler's tools",
				"cook's utensils",
				"glassblower's tools",
				"herbalism kit",
				"leatherworker's tools",
				"mason's tools",
				"musical instrument",
				"navigator's tools",
				"painter's supplies",
				"potter's tools",
				"smith's tools",
				"thieves' tools",
				"tinker's tools",
				"weaver's tools",
				"woodcarver's tools",
				"pipe",
			);
		} else {
			for (const [k, v] of Object.entries(block)) {
				if (v === true) opts.push(k.split("|")[0]);
			}
		}
	}
	return {options: [...new Set(opts)], chooseCount};
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
	// Handle roster exports or wrapped characters
	let target = json;
	if (json.character && typeof json.character === "object") target = json.character;
	else if (Array.isArray(json.characters) && json.characters.length) target = json.characters[0]?.character || json.characters[0];
	else if (Array.isArray(json.roster) && json.roster.length) target = json.roster[0]?.character || json.roster[0];

	const base = createEmptyCharacter();
	const merged = deepMerge(base, target);
	merged.fileType = FILE_TYPE;
	merged.schemaVersion = SCHEMA_VERSION;
	return merged;
}

function deepMerge (base, overlay) {
	if (Array.isArray(overlay)) return overlay.slice();
	if (overlay && typeof overlay === "object") {
		const out = {...base};
		for (const [k, v] of Object.entries(overlay)) {
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
	const name = (character.identity.name || "hero").replace(/[^\w\- ]+/g, "").trim() || "hero";
	return `${name}-L${d.level}-${d.className}`.replace(/\s+/g, "_");
}

export function finalizeLevelOne (character, data) {
	const cls = data.getClass(character.class.uid);
	if (!cls) throw new Error("Class required.");
	const faces = cls.hd?.faces || 8;
	character.level = 1;
	character.class.levels = 1;
	character.class.hitDice = [faces];
	character.equipment = [];
	character.class.hpMax = 0;
	recomputeCharacter(character, data);
	character.class.hpMax = computeHpMax(character, data);
	character.class.hpCurrent = character.class.hpMax;
	character.levelHistory = [{
		toLevel: 1,
		choices: {
			culture: character.culture.raceUid,
			background: character.background.uid,
			class: character.class.uid,
			virtue: character.culture.startingVirtueUid,
		},
	}];
	recomputeCharacter(character, data);
	return character;
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
	const race = data.getRace(character.culture.raceUid);
	const strScore = character.abilities.str || 10;
	const isDwarf = race?.name?.toLowerCase().includes("dwarf");

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
		const cleanName = line.replace(/\s*\[E\]\s*$/i, "").replace(/^\d+[×x]\s*/i, "").trim();
		const nameLower = cleanName.toLowerCase();
		const itemData = data.itemByUid.get(nameLower)
			|| data.itemByUid.get(nameLower.split("|")[0])
			|| data.items?.find(it => it.name?.toLowerCase() === nameLower);

		if (!itemData) continue;

		const type = String(itemData.type || "").split("|")[0];

		// Check Armor (LA, MA, HA)
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
		}

		// Check Shield
		if ((type === "S" || itemData.shield || nameLower.includes("shield")) && !hasShield) {
			hasShield = true;
			shieldName = itemData.name;
			shieldBonus = itemData.ac ? Number(itemData.ac) : 2;
		}
	}

	// Manual toggle for shield in combat stats if toggled directly
	if (character.combat?.shield && !hasShield) {
		hasShield = true;
		shieldName = "Shield";
		shieldBonus = 2;
	}

	// Unarmored Defense (Messenger: 10 + DEX + CHA; Scholar: 10 + DEX + WIS — neither allows a shield)
	if (!hasArmor) {
		const calling = cls?.name;
		if (calling === "Messenger" && !hasShield) {
			isUnarmoredDef = true;
			baseAc = 10;
			dexBonus = mods.dex + mods.cha;
			armorName = "Messenger Unarmoured Defence (10 + DEX + CHA)";
		} else if (calling === "Scholar" && !hasShield) {
			isUnarmoredDef = true;
			baseAc = 10;
			dexBonus = mods.dex + mods.wis;
			armorName = "Scholar Unarmoured Defence (10 + DEX + WIS)";
		} else {
			armorName = "Unarmoured (10 + DEX)";
		}
	}

	let styleBonus = 0;
	if (character.class?.fightingStyle === "Defense" && hasArmor) {
		styleBonus = 1;
	}

	const totalAc = baseAc + dexBonus + shieldBonus + styleBonus;
	const parts = [`Base ${baseAc}`];
	if (dexBonus !== 0) parts.push(`DEX/Ability ${dexBonus >= 0 ? `+${dexBonus}` : dexBonus}`);
	if (shieldBonus > 0) parts.push(`Shield +${shieldBonus}`);
	if (styleBonus > 0) parts.push(`Defense Style +1`);
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

export function computeCallingResources (character, data, mods, pb) {
	const cls = data.getClass(character.class.uid);
	const level = character.level || 1;
	const calling = cls?.name || "";
	const savedRes = character.classResources || {};
	const resources = [];

	if (calling === "Captain") {
		const dieSize = level >= 10 ? "d10" : level >= 5 ? "d8" : "d6";
		const maxDice = Math.max(1, mods.cha || 1);
		const current = savedRes.leadershipDice ?? maxDice;
		resources.push({
			id: "leadershipDice",
			name: `Leadership Dice (${dieSize})`,
			current: Math.max(0, Math.min(maxDice, Number(current))),
			max: maxDice,
			recovery: "Long Rest",
			resetOn: "long",
		});
	} else if (calling === "Champion") {
		const surgeMax = 1;
		resources.push({
			id: "surge",
			name: `Surge of Vigour (1d10+${level} HP)`,
			current: Math.max(0, Math.min(surgeMax, Number(savedRes.surge ?? surgeMax))),
			max: surgeMax,
			recovery: "Short / Long Rest",
			resetOn: "short",
		});
		if (level >= 9) {
			const indomMax = 1;
			resources.push({
				id: "indomitable",
				name: "Indomitable (Reroll Save)",
				current: Math.max(0, Math.min(indomMax, Number(savedRes.indomitable ?? indomMax))),
				max: indomMax,
				recovery: "Long Rest",
				resetOn: "long",
			});
		}
	} else if (calling === "Messenger") {
		const tirelessMax = pb;
		resources.push({
			id: "tirelessSwift",
			name: "Tireless & Swift (Bonus Dash/Disengage)",
			current: Math.max(0, Math.min(tirelessMax, Number(savedRes.tirelessSwift ?? tirelessMax))),
			max: tirelessMax,
			recovery: "Long Rest",
			resetOn: "long",
		});
	} else if (calling === "Scholar") {
		const dieSize = level >= 10 ? "d10" : level >= 5 ? "d8" : "d6";
		const maxLore = Math.max(1, mods.int || 1);
		resources.push({
			id: "rhymesOfLore",
			name: `Rhymes of Lore (${dieSize})`,
			current: Math.max(0, Math.min(maxLore, Number(savedRes.rhymesOfLore ?? maxLore))),
			max: maxLore,
			recovery: level >= 5 ? "Short / Long Rest" : "Long Rest",
			resetOn: level >= 5 ? "short" : "long",
		});
		if (level >= 2) {
			const maxHealPool = 5 * level;
			resources.push({
				id: "handsOfHealer",
				name: `Hands of a Healer Pool (${maxHealPool} HP)`,
				current: Math.max(0, Math.min(maxHealPool, Number(savedRes.handsOfHealer ?? maxHealPool))),
				max: maxHealPool,
				recovery: "Long Rest",
				resetOn: "long",
			});
		}
	}

	return resources;
}
