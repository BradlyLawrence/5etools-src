/** Load Free League LOTR Roleplaying + local Middle-earth culture homebrew. */

const BREW_URL = new URL(
	"../data/Free%20League%3B%20The%20Lord%20of%20the%20Rings%20Roleplaying.json",
	import.meta.url,
);
const CUSTOM_BREW_URL = new URL(
	"../data/Middle-earth%20Cultures%20(Homebrew).json",
	import.meta.url,
);
// Site item catalog for equipmentType pickers (simple weapons, artisan tools, …)
const SITE_ITEMS_URL = new URL("../../../data/items-base.json", import.meta.url);
const SITE_ITEMS_FULL_URL = new URL("../../../data/items.json", import.meta.url);

const EQUIPMENT_TYPE_LABELS = {
	weaponSimpleMelee: "simple melee weapon",
	weaponSimpleRanged: "simple ranged weapon",
	weaponMartialMelee: "martial melee weapon",
	weaponMartialRanged: "martial ranged weapon",
	weaponSimple: "simple weapon",
	weaponMartial: "martial weapon",
	toolArtisan: "artisan's tools",
	tool: "tool",
	instrumentMusical: "musical instrument",
	setGaming: "gaming set",
	armorLight: "light armor",
	armorMedium: "medium armor",
	armorHeavy: "heavy armor",
	shield: "shield",
};

export const SOURCE = "TLotRR";
export const CUSTOM_SOURCE = "MECultures";

/** Culture → virtue feat categories */
export const RACE_VIRTUE_CATS = {
	"barding": ["VtBar", "VtCom"],
	// Bree-Hobbit uses a *mixed* list (not all Hobbit virtues) — see RACE_VIRTUE_FEATS
	"bree-hobbit": ["VtCom"],
	"dwarf": ["VtDwa", "VtCom"],
	"elf": ["VtElf", "VtCom"],
	"hobbit": ["VtHob", "VtCom"],
	"man of bree": ["VtMBr", "VtCom"],
	"man of gondor": ["VtGon", "VtCom", "VtNRg"],
	"rider of rohan": ["VtRoh", "VtCom", "VtBar"],
	"beorning": ["VtBeo", "VtCom", "VtBar"],
	"ranger of the north": ["VtNRg", "VtCom"],
};

/**
 * Explicit cultural virtue UIDs when the brew lists them by name
 * (Bree-hobbits do not use the full VtHob list).
 */
export const RACE_VIRTUE_FEATS = {
	"bree-hobbit": [
		"bree-pony|tlotrr",
		"desperate courage|tlotrr",
		"small folk|tlotrr",
		"strange as news from bree|tlotrr",
		"the art of smoking|tlotrr",
		"tough as old tree-roots|tlotrr",
	],
};

/** Extra virtue categories unlocked by subculture name (lowercase) */
export const SUBRACE_VIRTUE_CATS = {
	"mirkwood": ["VtMir"],
};

export function toUid (name, source = SOURCE) {
	return `${String(name).toLowerCase()}|${String(source).toLowerCase()}`;
}

export function entityUid (ent) {
	return toUid(ent.name, ent.source || SOURCE);
}

export function subclassUid (sc) {
	return `${sc.shortName || sc.name}|${sc.className}|${sc.classSource || SOURCE}|${sc.source || SOURCE}`.toLowerCase();
}

export function cleanTags (s) {
	return String(s ?? "")
		.replace(/\{@\w+\s+([^|}]+)(?:\|[^}]*)?\}/g, "$1")
		.replace(/\{@\w+\}/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function entriesToText (entries) {
	if (entries == null) return "";
	if (typeof entries === "string") return cleanTags(entries);
	if (typeof entries === "number" || typeof entries === "boolean") return String(entries);
	if (Array.isArray(entries)) return entries.map(entriesToText).filter(Boolean).join("\n");
	if (typeof entries === "object") {
		if (entries.entry) return entriesToText(entries.entry);
		if (entries.entries) {
			const name = entries.name ? `${entries.name}: ` : "";
			return name + entriesToText(entries.entries);
		}
		if (entries.type === "list" && entries.items) {
			return entries.items.map(it => `• ${entriesToText(it)}`).join("\n");
		}
		if (entries.type === "item") {
			return `${entries.name || ""}: ${entriesToText(entries.entry || entries.entries)}`.trim();
		}
		if (entries.type === "quote") return entriesToText(entries.entries);
		if (entries.type === "entries" || entries.type === "section") {
			const name = entries.name ? `${entries.name}\n` : "";
			return name + entriesToText(entries.entries);
		}
		if (entries.type === "statblock") return "";
		return "";
	}
	return "";
}

function titleCase (s) {
	// Avoid capitalising the letter after an apostrophe (Healer's, not Healer'S)
	return String(s)
		.toLowerCase()
		.replace(/(^|[\s\-/])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

export class DataStore {
	constructor () {
		this.ready = false;
		this.raw = null;
		this.races = [];
		this.subraces = [];
		this.backgrounds = [];
		this.classes = [];
		this.subclasses = [];
		this.classFeatures = new Map();
		this.subclassFeatures = new Map();
		this.feats = [];
		this.skills = [];
		this.languages = [];
		this.baseItems = [];
		this.itemByUid = new Map();
	}

	async load () {
		const res = await fetch(`${BREW_URL}?t=${Date.now()}`, {cache: "no-store"});
		if (!res.ok) throw new Error(`Failed to load LOTR brew (${res.status}). Expected file at character-creators/lotr-rpg/data/`);
		const raw = await res.json();
		this.raw = raw;

		// Optional local table cultures (also installed under homebrew/ for the main site)
		let custom = null;
		try {
			const cres = await fetch(`${CUSTOM_BREW_URL}?t=${Date.now()}`, {cache: "no-store"});
			if (cres.ok) custom = await cres.json();
		} catch (e) {
			console.warn("Custom Middle-earth cultures not loaded", e);
		}
		this.customRaw = custom;
		this.siteItems = [];

		const racesRaw = [...(raw.race || []), ...(custom?.race || [])];
		this.races = racesRaw
			.map(r => this._resolveRaceCopy(r, racesRaw))
			.sort((a, b) => a.name.localeCompare(b.name));
		this.subraces = this._normalizeSubraces([
			...(raw.subrace || []),
			...(custom?.subrace || []),
		]).sort((a, b) => a.name.localeCompare(b.name));
		this.backgrounds = (raw.background || []).slice().sort((a, b) => a.name.localeCompare(b.name));
		this.classes = (raw.class || []).slice().sort((a, b) => a.name.localeCompare(b.name));
		this.subclasses = (raw.subclass || []).slice().sort((a, b) => a.name.localeCompare(b.name));
		this.feats = [...(raw.feat || []), ...(custom?.feat || [])]
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name));
		this.skills = raw.skill || [];
		this.languages = raw.language || [];

		// Index TLotRR items first so Middle-earth names win bare-key lookup
		this.baseItems = raw.baseitem || [];
		this.items = [...(raw.baseitem || []), ...(raw.item || [])];
		for (const it of this.items) {
			if (!it?.name) continue;
			const uid = toUid(it.name, it.source || SOURCE);
			this.itemByUid.set(uid, it);
			this.itemByUid.set(String(it.name).toLowerCase(), it);
		}

		// PHB/XPHB base and magic items for equipment pickers
		try {
			const [ires, iFullRes] = await Promise.all([
				fetch(SITE_ITEMS_URL).catch(() => null),
				fetch(SITE_ITEMS_FULL_URL).catch(() => null),
			]);
			this.siteItems = [];

			if (ires?.ok) {
				const itemsJson = await ires.json();
				this.siteItems.push(...(itemsJson.baseitem || []));
			}
			if (iFullRes?.ok) {
				const fullJson = await iFullRes.json();
				this.siteItems.push(...(fullJson.item || []), ...(fullJson.itemGroup || []));
			}

			for (const it of this.siteItems) {
				if (!it?.name || !it?.source) continue;
				const uid = toUid(it.name, it.source);
				if (!this.itemByUid.has(uid)) this.itemByUid.set(uid, it);
				const bare = String(it.name).toLowerCase();
				if (!this.itemByUid.has(bare)) this.itemByUid.set(bare, it);
			}
		} catch (e) {
			console.warn("Site items not loaded for equipment pickers", e);
			this.siteItems = [];
		}

		for (const cf of raw.classFeature || []) {
			const keys = [
				`${cf.name}|${cf.className}|${cf.classSource}|${cf.level}|${cf.source}`,
				`${cf.name}|${cf.className}|${cf.classSource}|${cf.level}`,
			];
			for (const k of keys) this.classFeatures.set(k.toLowerCase(), cf);
		}
		for (const sf of raw.subclassFeature || []) {
			// 5etools subclassFeature UID: name|class|classSource|short|subclassSource|level|source
			const keys = [
				`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|${sf.subclassSource || sf.source || ""}|${sf.level}|${sf.source || ""}`,
				`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|${sf.subclassSource || ""}|${sf.level}`,
				`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|${sf.source || ""}|${sf.level}`,
				`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}||${sf.level}`,
			];
			for (const k of keys) this.subclassFeatures.set(k.toLowerCase(), sf);
		}

		this.ready = true;
		return this;
	}

	_resolveRaceCopy (race, all) {
		if (!race._copy) return race;
		const base = all.find(r => r.name === race._copy.name && r.source === race._copy.source);
		if (!base) return race;

		// Deep-clone base, then overlay the copy entity and apply _mod
		const resolved = structuredClone(base);
		const {_copy, ...overrides} = race;
		Object.assign(resolved, overrides);

		// Mechanical fields: explicit on the copy win; otherwise keep base
		resolved.ability = race.ability ?? base.ability;
		resolved.size = race.size ?? base.size;
		resolved.speed = race.speed ?? base.speed;
		resolved.languageProficiencies = race.languageProficiencies ?? base.languageProficiencies;
		// skillProficiencies on the copy *replace* base when present (Bree-Hobbit: Insight, not Stealth)
		if (race.skillProficiencies) resolved.skillProficiencies = race.skillProficiencies;
		else resolved.skillProficiencies = base.skillProficiencies;

		// Entries: start from base, apply _copy._mod (replaceArr / appendArr / …)
		resolved.entries = structuredClone(base.entries || []);
		if (_copy._mod) this._applyCopyMods(resolved, _copy._mod);

		// If the copy also had top-level entries, they would fully replace — rare
		if (race.entries?.length && !base.entries) resolved.entries = race.entries;

		resolved._copy = _copy;
		resolved._resolvedFrom = entityUid(base);
		// Ensure identity is the copy's
		resolved.name = race.name;
		resolved.source = race.source;
		resolved.page = race.page ?? base.page;
		return resolved;
	}

	/**
	 * Apply 5etools-style `_copy._mod` operations onto a resolved entity (mutates).
	 * Supports the modes used by TLotRR races: replaceArr, appendArr on `entries`.
	 */
	_applyCopyMods (entity, mod) {
		if (!mod || typeof mod !== "object") return;
		for (const [prop, ops] of Object.entries(mod)) {
			const list = Array.isArray(ops) ? ops : [ops];
			for (const op of list) {
				if (!op || typeof op !== "object") continue;
				const mode = op.mode;
				if (mode === "replaceArr") {
					const arr = entity[prop];
					if (!Array.isArray(arr)) continue;
					const idx = arr.findIndex(it =>
						it && typeof it === "object" && it.name === op.replace,
					);
					if (idx >= 0) {
						const items = Array.isArray(op.items) ? op.items : [op.items];
						arr.splice(idx, 1, ...items.filter(Boolean));
					}
				} else if (mode === "appendArr") {
					if (!Array.isArray(entity[prop])) entity[prop] = [];
					const items = Array.isArray(op.items) ? op.items : [op.items];
					entity[prop].push(...items.filter(Boolean));
				} else if (mode === "prependArr") {
					if (!Array.isArray(entity[prop])) entity[prop] = [];
					const items = Array.isArray(op.items) ? op.items : [op.items];
					entity[prop].unshift(...items.filter(Boolean));
				} else if (mode === "removeArr" || mode === "replaceTxt") {
					// not needed for current TLotRR race copies; ignore quietly
				}
			}
		}
	}

	/**
	 * Bree-Hobbit (and similar) have parallel subraces keyed by raceName without ability
	 * blocks; the parent culture (Hobbit) holds the Fallohide/Harfoot/Stoor bonuses.
	 * Copy ability (and other missing mechanical fields) from the matching sibling.
	 */
	_normalizeSubraces (list) {
		const out = list.map(s => ({...s}));
		for (const sub of out) {
			if (sub.ability?.length) continue;
			const donor = out.find(o =>
				o.name === sub.name
				&& o !== sub
				&& o.ability?.length
				&& String(o.source || SOURCE).toUpperCase() === String(sub.source || SOURCE).toUpperCase(),
			);
			if (donor) {
				sub.ability = donor.ability;
				if (!sub.toolProficiencies && donor.toolProficiencies) {
					sub.toolProficiencies = donor.toolProficiencies;
				}
				sub._abilityFrom = `${donor.raceName}|${donor.raceSource || SOURCE}`;
			}
		}
		return out;
	}

	/**
	 * Also attach parent-culture subraces when this race is a _copy (e.g. Bree-Hobbit → Hobbit)
	 * if no dedicated subraces exist under its own name.
	 */
	subracesForRace (race) {
		if (!race) return [];
		const own = this.subraces.filter(s =>
			s.raceName === race.name
			&& String(s.raceSource || SOURCE).toUpperCase() === String(race.source || SOURCE).toUpperCase(),
		);
		if (own.length) return own;

		// Fall back to copied parent culture's kindreds
		const parentName = race._copy?.name || (race._resolvedFrom && race._resolvedFrom.split("|")[0]);
		const parentSource = race._copy?.source || (race._resolvedFrom && race._resolvedFrom.split("|")[1]) || SOURCE;
		if (!parentName) return [];
		return this.subraces.filter(s =>
			s.raceName === parentName
			&& String(s.raceSource || SOURCE).toUpperCase() === String(parentSource).toUpperCase(),
		);
	}

	getRace (uid) {
		return this.races.find(r => entityUid(r) === String(uid).toLowerCase()) || null;
	}

	getBackground (uid) {
		return this.backgrounds.find(b => entityUid(b) === String(uid).toLowerCase()) || null;
	}

	getClass (uid) {
		return this.classes.find(c => entityUid(c) === String(uid).toLowerCase()) || null;
	}

	getSubclass (uid) {
		const lower = String(uid).toLowerCase();
		return this.subclasses.find(sc => subclassUid(sc) === lower || entityUid(sc) === lower) || null;
	}

	getFeat (uid) {
		return this.feats.find(f => entityUid(f) === String(uid).toLowerCase()) || null;
	}

	subclassesForClass (cls) {
		if (!cls) return [];
		return this.subclasses.filter(sc =>
			sc.className === cls.name
			&& String(sc.classSource || SOURCE).toUpperCase() === String(cls.source || SOURCE).toUpperCase(),
		);
	}

	/** Backgrounds allowed for a culture (by prerequisite race, or listed in race entries). */
	backgroundsForRace (race) {
		if (!race) return this.backgrounds;
		const listed = this._backgroundsListedOnRace(race);
		const out = this.backgrounds.filter(bg => {
			if (listed.has(bg.name.toLowerCase())) return true;
			const prereq = bg.prerequisite || [];
			if (!prereq.length) return listed.size === 0; // generic if race lists none
			for (const p of prereq) {
				const races = p.race || [];
				for (const r of races) {
					const n = (r.name || r).toLowerCase();
					if (n === race.name.toLowerCase()) return true;
					// Hobbit prereq matches Bree-Hobbit loosely
					if (race.name === "Bree-Hobbit" && n === "hobbit") return true;
				}
			}
			return false;
		});
		return out.length ? out : this.backgrounds;
	}

	_backgroundsListedOnRace (race) {
		const set = new Set();
		const walk = (e) => {
			if (!e) return;
			if (typeof e === "string") {
				const m = /\{@background\s+([^|}]+)/i.exec(e);
				if (m) set.add(m[1].toLowerCase());
				return;
			}
			if (Array.isArray(e)) return e.forEach(walk);
			if (typeof e === "object") {
				if (e.items) walk(e.items);
				if (e.entries) walk(e.entries);
				if (e.entry) walk(e.entry);
			}
		};
		walk(race.entries);
		return set;
	}

	/**
	 * @param {object} race
	 * @param {{includeCommon?: boolean, subrace?: object|null}} [opts]
	 */
	virtuesForRace (race, {includeCommon = true, subrace = null} = {}) {
		const key = race?.name?.toLowerCase() || "";

		// Explicit named list (Bree-Hobbit cultural virtues are a curated mix)
		const named = RACE_VIRTUE_FEATS[key];
		if (named?.length) {
			const set = new Set(named.map(u => u.toLowerCase()));
			const out = this.feats.filter(f => set.has(entityUid(f)));
			if (includeCommon) {
				for (const f of this.commonVirtues()) {
					if (!out.some(x => entityUid(x) === entityUid(f))) out.push(f);
				}
			}
			// Subculture extras still apply
			const subKey = subrace?.name?.toLowerCase() || "";
			for (const c of (SUBRACE_VIRTUE_CATS[subKey] || [])) {
				for (const f of this.feats.filter(ft => ft.category === c)) {
					if (!out.some(x => entityUid(x) === entityUid(f))) out.push(f);
				}
			}
			return out.sort((a, b) => a.name.localeCompare(b.name));
		}

		let cats = RACE_VIRTUE_CATS[key] ? [...RACE_VIRTUE_CATS[key]] : ["VtCom"];
		// Prefer explicit anyFromCategory on the race (official + our homebrew)
		const any = race?.feats?.[0]?.anyFromCategory?.category;
		if (Array.isArray(any) && any.length) {
			cats = [...any];
			if (includeCommon && !cats.includes("VtCom")) cats.push("VtCom");
		}
		// Subculture extras (e.g. Mirkwood → VtMir)
		const subKey = subrace?.name?.toLowerCase() || "";
		for (const c of (SUBRACE_VIRTUE_CATS[subKey] || [])) {
			if (!cats.includes(c)) cats.push(c);
		}
		// Always include common unless caller opts out
		if (includeCommon && !cats.includes("VtCom")) cats.push("VtCom");
		const catSet = new Set(cats);
		return this.feats.filter(f => catSet.has(f.category));
	}

	commonVirtues () {
		return this.feats.filter(f => f.category === "VtCom");
	}

	crafts () {
		return this.feats.filter(f => f.category === "Craft");
	}

	itemDisplayName (uidOrName) {
		const it = this.itemByUid.get(String(uidOrName).toLowerCase())
			|| this.itemByUid.get(String(uidOrName).split("|")[0].toLowerCase());
		if (it?.name) return it.name;
		return titleCase(String(uidOrName).split("|")[0]);
	}

	resolveClassFeatureRef (ref) {
		if (!ref) return null;
		if (typeof ref === "object" && ref.classFeature) ref = ref.classFeature;
		if (typeof ref !== "string") return null;
		const lower = ref.toLowerCase();
		if (this.classFeatures.has(lower)) return this.classFeatures.get(lower);
		const parts = lower.split("|");
		if (parts.length >= 4) {
			const [name, cls, src, level] = parts;
			for (const k of [
				`${name}|${cls}|${src}|${level}`,
				`${name}|${cls}|${src}|${level}|${src}`,
				`${name}|${cls}|tlotrr|${level}|tlotrr`,
			]) {
				if (this.classFeatures.has(k)) return this.classFeatures.get(k);
			}
		}
		return null;
	}

	resolveSubclassFeatureRef (ref) {
		if (!ref) return null;
		if (typeof ref === "object" && ref.subclassFeature) ref = ref.subclassFeature;
		if (typeof ref !== "string") return null;
		const lower = ref.toLowerCase();
		if (this.subclassFeatures.has(lower)) return this.subclassFeatures.get(lower);
		const parts = lower.split("|");
		// 6-part or 7-part UIDs
		if (parts.length >= 6) {
			const name = parts[0];
			const cls = parts[1];
			const csrc = parts[2];
			const short = parts[3];
			const ssrc = parts[4];
			// level is numeric part near the end
			let level = parts[5];
			let src = parts[6] || "";
			if (!/^\d+$/.test(level) && parts.length >= 7) {
				level = parts[5];
			}
			// find numeric level
			const levelPart = parts.find((p, i) => i >= 5 && /^\d+$/.test(p)) || parts[parts.length - 2];
			for (const k of [
				lower,
				`${name}|${cls}|${csrc}|${short}|${ssrc}|${levelPart}|${src || "tlotrr"}`,
				`${name}|${cls}|${csrc}|${short}|tlotrr|${levelPart}|tlotrr`,
				`${name}|${cls}|${csrc}|${short}|${ssrc}|${levelPart}`,
				`${name}|${cls}|${csrc}|${short}||${levelPart}`,
			]) {
				if (this.subclassFeatures.has(k)) return this.subclassFeatures.get(k);
			}
			// fallback by name + short + level
			for (const sf of this.subclassFeatures.values()) {
				if (
					String(sf.name).toLowerCase() === name
					&& String(sf.subclassShortName || "").toLowerCase() === short
					&& String(sf.level) === String(levelPart)
				) return sf;
			}
		}
		return null;
	}

	formatEquipmentEntry (entry, {chosenUid = null} = {}) {
		if (entry == null) return "";
		if (typeof entry === "string") {
			if (entry.includes("|") || this.itemByUid.has(entry.toLowerCase())) {
				return this.itemDisplayName(entry);
			}
			return cleanTags(entry);
		}
		if (typeof entry === "number") return String(entry);
		if (entry.value != null) {
			const gp = entry.value / 100;
			return `${Number.isInteger(gp) ? gp : gp} GP`;
		}
		if (entry.item) {
			const qty = entry.quantity > 1 ? `${entry.quantity}× ` : "";
			return `${qty}${entry.displayName || this.itemDisplayName(entry.item)}`;
		}
		if (entry.special) return cleanTags(entry.special);
		if (entry.equipmentType) {
			const label = EQUIPMENT_TYPE_LABELS[entry.equipmentType]
				|| titleCase(String(entry.equipmentType).replace(/([A-Z])/g, " $1"));
			if (chosenUid) return this.itemDisplayName(chosenUid);
			return `(choose ${label})`;
		}
		if (Array.isArray(entry)) {
			return entry.map(e => this.formatEquipmentEntry(e, {chosenUid})).join(", ");
		}
		return JSON.stringify(entry);
	}

	equipmentTypeLabel (equipmentType) {
		return EQUIPMENT_TYPE_LABELS[equipmentType]
			|| titleCase(String(equipmentType || "").replace(/([A-Z])/g, " $1"));
	}

	/**
	 * Items matching an equipmentType code for pickers.
	 * Prefers TLotRR items, then XPHB, then PHB.
	 */
	itemsForEquipmentType (equipmentType) {
		const all = [...this.baseItems, ...(this.siteItems || [])];
		const match = (it) => {
			if (!it?.name) return false;
			const t = String(it.type || "");
			const tBase = t.split("|")[0];
			const cat = String(it.weaponCategory || "").toLowerCase();
			const src = String(it.source || "").toUpperCase();
			// Prefer modern + TLotRR sources
			if (!["TLOTRR", "PHB", "XPHB"].includes(src) && src !== SOURCE.toUpperCase()) {
				// still allow TLotRR via SOURCE
				if (src !== "TLOTRR") return false;
			}
			switch (equipmentType) {
				case "weaponSimpleMelee":
					return (tBase === "M") && cat === "simple";
				case "weaponMartialMelee":
					return (tBase === "M") && cat === "martial";
				case "weaponSimpleRanged":
					return (tBase === "R") && cat === "simple";
				case "weaponMartialRanged":
					return (tBase === "R") && cat === "martial";
				case "weaponSimple":
					return cat === "simple" && (tBase === "M" || tBase === "R");
				case "weaponMartial":
					return cat === "martial" && (tBase === "M" || tBase === "R");
				case "toolArtisan":
					return tBase === "AT";
				case "tool":
					return tBase === "T" || tBase === "AT" || tBase === "GS" || tBase === "INS";
				case "instrumentMusical":
					return tBase === "INS";
				case "setGaming":
					return tBase === "GS";
				case "armorLight":
					return tBase === "LA";
				case "armorMedium":
					return tBase === "MA";
				case "armorHeavy":
					return tBase === "HA";
				case "shield":
					return tBase === "S";
				default:
					return false;
			}
		};

		const hits = all.filter(match);
		// Dedupe by name, prefer TLotRR > XPHB > PHB
		const rank = (src) => {
			const s = String(src || "").toUpperCase();
			if (s === "TLOTRR") return 0;
			if (s === "XPHB") return 1;
			if (s === "PHB") return 2;
			return 3;
		};
		const byName = new Map();
		for (const it of hits) {
			const k = it.name.toLowerCase();
			const prev = byName.get(k);
			if (!prev || rank(it.source) < rank(prev.source)) byName.set(k, it);
		}
		return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Class starting equipment: sequential blocks.
	 * - `_` alone = fixed gear (may contain equipmentType picks)
	 * - `a`/`b` = mutually exclusive packages
	 *
	 * @returns {{
	 *   id: string,
	 *   label: string,
	 *   isFixed: boolean,
	 *   options: {id: string, label: string, entries: unknown[]}[],
	 * }[]}
	 */
	classEquipmentChoices (cls) {
		const dd = cls?.startingEquipment?.defaultData;
		if (!Array.isArray(dd)) return [];
		return dd.map((block, i) => {
			const keys = Object.keys(block);
			const isFixed = keys.length === 1 && keys[0] === "_";
			const options = keys.map(key => {
				const entries = block[key] || [];
				const parts = [];
				entries.forEach((e, idx) => {
					if (e && typeof e === "object" && e.equipmentType) {
						const qty = Math.max(1, Number(e.quantity) || 1);
						const baseLabel = this.equipmentTypeLabel(e.equipmentType);
						const itemOpts = this.itemsForEquipmentType(e.equipmentType);
						for (let slot = 0; slot < qty; slot++) {
							parts.push({
								kind: "type",
								index: idx,
								slot,
								pickKey: `${idx}.${slot}`,
								equipmentType: e.equipmentType,
								label: qty > 1 ? `${baseLabel} (${slot + 1} of ${qty})` : baseLabel,
								options: itemOpts,
								raw: e,
							});
						}
						return;
					}
					parts.push({
						kind: "fixed",
						index: idx,
						text: this.formatEquipmentEntry(e),
						raw: e,
					});
				});
				const summary = parts.map(p =>
					p.kind === "type" ? `(choose ${p.label})` : p.text,
				).join(", ");
				return {
					id: key,
					label: key === "_" ? "Included gear" : key.toUpperCase(),
					entries,
					parts,
					summary,
				};
			});
			return {
				id: String(i),
				label: isFixed ? `Starting gear` : `Equipment choice ${i + 1}`,
				isFixed,
				options,
			};
		});
	}

	/**
	 * Resolve chosen packages + type picks into display strings.
	 * @param {object} cls
	 * @param {{packages?: Record<string,string>, typePicks?: Record<string,string>}|Record<string,string>} choices
	 */
	resolveClassEquipment (cls, choices = {}) {
		// Support legacy flat map { "0": "a" } and new { packages, typePicks }
		const packages = choices.packages || choices;
		const typePicks = choices.typePicks || {};
		const blocks = this.classEquipmentChoices(cls);
		const lines = [];
		for (const block of blocks) {
			const optId = packages[block.id]
				|| (block.isFixed ? block.options[0]?.id : block.options[0]?.id)
				|| "_";
			const opt = block.options.find(o => o.id === optId) || block.options[0];
			if (!opt) continue;
			for (const part of opt.parts) {
				if (part.kind === "fixed") {
					if (part.text) lines.push(part.text);
				} else if (part.kind === "type") {
					const pickKey = `${block.id}:${opt.id}:${part.pickKey ?? `${part.index}.${part.slot || 0}`}`;
					const legacyKey = `${block.id}:${opt.id}:${part.index}`;
					const uid = typePicks[pickKey] || typePicks[legacyKey] || typePicks[`${block.id}:${part.index}`];
					if (uid) lines.push(this.itemDisplayName(uid));
					else lines.push(`(choose ${part.label})`);
				}
			}
		}
		return lines.filter(Boolean);
	}
}
