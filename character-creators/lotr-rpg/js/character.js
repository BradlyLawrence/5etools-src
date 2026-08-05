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
} from "./rules.js";
import {
	entityUid,
	subclassUid,
	entriesToText,
	toUid,
	cleanTags,
} from "./data.js";

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
	"champion": "Path of Despair",
	"messenger": "Wandering Madness",
	"scholar": "Lure of Secrets",
	"treasure hunter": "Dragon-sickness",
	"warden": "Fear of the Shadow",
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

export function recomputeAbilityScores (character, data) {
	const base = character.abilities.base || {};
	const final = {};
	for (const ab of ABILITIES) final[ab] = Number(base[ab] ?? 10);

	const race = data.getRace(character.culture.raceUid);
	const sub = character.culture.subraceUid
		? data.subraces.find(s => toUid(s.name, s.source) === String(character.culture.subraceUid).toLowerCase())
		: null;

	const applyBlock = (block) => {
		if (!block) return;
		// fixed scores
		for (const ab of ABILITIES) {
			if (typeof block[ab] === "number") final[ab] += block[ab];
		}
		// simple choose amount (not fully interactive for multi-options beyond culture.abilityChoice)
	};

	if (race?.ability) race.ability.forEach(applyBlock);
	if (sub?.ability) sub.ability.forEach(applyBlock);

	// Manual assignments for weighted choices stored on culture.abilityChoice
	const assigns = character.culture.abilityChoice || {};
	for (const [ab, n] of Object.entries(assigns)) {
		if (ABILITIES.includes(ab)) final[ab] += Number(n || 0);
	}

	// Virtues may grant ASI-like bumps via feat.ability
	const virtueUids = [
		character.culture.startingVirtueUid,
		...(character.virtues || []).map(v => v.uid),
	].filter(Boolean);
	for (const uid of virtueUids) {
		const feat = data.getFeat(uid);
		// ability on virtues often not structured; skip unless simple fixed
		if (!feat?.ability) continue;
		for (const block of feat.ability) {
			for (const ab of ABILITIES) {
				if (typeof block[ab] === "number") final[ab] += block[ab];
			}
		}
	}

	for (const ab of ABILITIES) {
		character.abilities[ab] = Math.min(20, Math.max(1, final[ab]));
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

	const skills = {};
	const mark = (id) => {
		const k = normalizeSkillId(id);
		if (k) skills[k] = "proficient";
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

	if (cls) {
		character.proficiencies.armor = cls.startingProficiencies?.armor || [];
		character.proficiencies.weapons = cls.startingProficiencies?.weapons || [];
	}

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
	const levels = [];
	for (const ref of cls.classFeatures || []) {
		const name = featureNameFromUid(ref).toLowerCase();
		const lvl = featureLevelFromUid(ref);
		if (!lvl) continue;
		if (name.includes("virtue") || name.includes("craft or virtue") || name === "crafts") {
			levels.push(lvl);
		}
	}
	return [...new Set(levels)].sort((a, b) => a - b);
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
		out.push({
			level: lvl,
			name: ent?.name || name,
			source: "class",
			text: ent ? entriesToText(ent.entries) : "",
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
	"Fair-spoken": "You speak with eloquence, charm, and polite grace. In Councils and social encounters, invoking Fair-spoken can grant Advantage on Persuasion, Traditions, and social interaction checks.",
	"Merry": "You carry a light heart, ready with a laugh or song to brighten dark places. Invoking Merry helps lift companions' spirits during arduous journeys and fellowship phases.",
	"Eager": "You approach challenges with enthusiasm and keen energy, ready to take initiative and leap into action.",
	"Faithful": "You are steadfast in your allegiances and promises, earning deep trust and loyalty from companions.",
	"Secretive": "You keep your counsel, speak cautiously, and move without attracting unwanted attention.",
	"Wilful": "You possess a stubborn resolve that resists intimidation, fear, and corruption.",
	"Lordly": "You carry yourself with nobility and authority, commanding respect in halls and on the battlefield.",
	"Patient": "You endure delay and frustration with calm composure, waiting for the ideal moment to strike.",
	"Proud": "You hold high standards for your heritage and deeds, taking pride in your folk and honor.",
	"True-hearted": "Your motives are pure and noble, untainted by deceit or malice.",
	"Inquisitive": "You are naturally curious, asking probing questions and uncovering hidden details.",
	"Fierce": "Your demeanor in battle and conflict is intimidating and unyielding.",
	"Generous": "You share your food, shelter, and treasure freely with companions and strangers in need.",
	"Tall": "Your striking physical height and posture lend you natural presence and authority.",
	"Steadfast": "Unwavering under stress or danger, standing your ground when others falter.",
	"Cunning": "Quick-witted and sharp, adept at turning tricky situations to your advantage.",
	"Absent-minded": "Deeply absorbed in lore or observation, often uncovering subtle truths while appearing distracted.",
	"Cautious": "Methodical and careful, weighing risks before acting to avoid traps and ambushes.",
	"Bold": "Daring and courageous, willing to take heroic risks when others hesitate.",
};

export const SHADOW_FLAW_DESCRIPTIONS = {
	"Resentful": "You hold grudges and feel envy toward those who possess wealth, status, or praise that you feel you deserve.",
	"Arrogant": "You believe your judgment and wisdom superior to others, dismissing advice or warnings from allies.",
	"Overconfident": "You underestimate dangers and enemies, recklessly taking risks that put yourself and your companions in peril.",
	"Tyrannical": "You demand total obedience and compliance, using fear and coercion to bend others to your will.",
	"Grasping": "You are driven by a desperate desire to acquire and hoard treasure, knowledge, or power.",
	"Thievish": "You take what is not yours when temptation arises, justifying your actions through greed or necessity.",
	"Traitorous": "Your loyalty turns fragile under pressure; you consider betraying companions to save yourself.",
	"Cruel": "You take pleasure or satisfaction in inflicting pain or emotional suffering on enemies or subordinates.",
	"Scornful": "You mock the weakness or idealism of others, viewing sympathy as a fatal flaw.",
	"Cowardly": "Fear dominates your choices when danger looms, tempting you to flee or abandon companions.",
	"Spiteful": "You seek revenge for minor slights, prioritizing vengeance over mission goals.",
	"Deceitful": "Lies and manipulation become your default tools for dealing with companions and strangers alike.",
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
		const prof = !!mode;
		const bonus = mods[sk.ability] + (prof ? pb : 0);
		return {...sk, proficient: prof, bonus};
	});

	const speed = character.combat.speedOverride
		?? (typeof race?.speed === "number" ? race.speed : race?.speed?.walk)
		?? 30;

	let ac = character.combat.acOverride != null
		? Number(character.combat.acOverride)
		: 10 + mods.dex;
	// Unarmoured defence (Messenger/Scholar)
	const name = cls?.name;
	if (name === "Messenger" || name === "Scholar") {
		ac = Math.max(ac, 10 + mods.dex + mods.wis);
	}
	if (character.combat.shield) ac += 2;

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
			const flawDesc = SHADOW_FLAW_DESCRIPTIONS[s.name] || "When a hero's Shadow score reaches their Hope, or when they succumb to despair, they gain this progressive Shadow Flaw.";
			return {
				level: s.stage,
				name: `Shadow Flaw (Stage ${s.stage}): ${s.name}`,
				source: "shadow-flaw",
				text: `Calling Shadow Path (${shadowPath}) — Stage ${s.stage} Flaw.\n\n${flawDesc}`,
			};
		});

	const distinctiveList = (derivedFeatures || "")
		.split(",")
		.map(s => s.trim())
		.filter(Boolean);

	const bgDistinctiveFeaturesList = distinctiveList.map(tName => {
		const desc = DISTINCTIVE_FEATURE_DESCRIPTIONS[tName] || `Distinctive Feature trait of your background (${bg?.name || "Background"}). Invoking this trait during roleplaying or Councils can grant Advantage or Inspiration.`;
		return {
			level: 1,
			name: `Distinctive Feature: ${tName}`,
			source: "background",
			text: desc,
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
		speed,
		ac,
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
