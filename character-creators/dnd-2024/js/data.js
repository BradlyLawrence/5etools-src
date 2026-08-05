/** Load and filter 5etools JSON for 2024 (edition "one" / XPHB) & optional source books. */

// js/data.js → repo root data/
const DATA_ROOT = new URL("../../../data/", import.meta.url);

export function toUid (name, source) {
	return `${String(name).toLowerCase()}|${String(source).toLowerCase()}`;
}

export function parseUid (uid) {
	const [name, source] = String(uid).split("|");
	return {name, source};
}

function is2024Entity (ent) {
	if (!ent) return false;
	if (ent.edition === "one") return true;
	if (ent.srd52 || ent.basicRules2024) return true;
	const src = String(ent.source || "").toUpperCase();
	return src === "XPHB" || src === "XDMG" || src === "XMM";
}

function isEntityAllowed (ent, sourceSet) {
	if (!ent) return false;
	if (!sourceSet || sourceSet.size === 0) return is2024Entity(ent);
	const src = String(ent.source || "").toUpperCase();
	if (sourceSet.has(src)) return true;
	if (ent.edition === "one" && (sourceSet.has("XPHB") || sourceSet.has("XDMG") || sourceSet.has("XMM"))) return true;
	if (ent.srd52 || ent.basicRules2024) return true;
	return false;
}

async function fetchJson (relPath) {
	const url = new URL(relPath, DATA_ROOT);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to load ${relPath}: ${res.status}`);
	return res.json();
}

/**
 * Strip simple 5etools tags for readable plain text.
 * @param {unknown} entries
 * @returns {string}
 */
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
		if (entries.type === "table") return "[table]";
		if (entries.type === "options") return entriesToText(entries.entries);
		if (entries.type === "refOptionalfeature") return entries.optionalfeature || "";
		if (entries.type === "refClassFeature") return entries.classFeature || "";
		if (entries.type === "refSubclassFeature") return entries.subclassFeature || "";
		if (entries.type === "entries" || entries.type === "section") {
			const name = entries.name ? `${entries.name}\n` : "";
			return name + entriesToText(entries.entries);
		}
		return "";
	}
	return "";
}

function cleanTags (s) {
	return String(s)
		.replace(/\{@\w+\s+([^|}]+)(?:\|[^}]*)?\}/g, "$1")
		.replace(/\{@\w+\}/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** Map 5etools equipmentType codes → item type abbreviations + labels. */
export const EQUIPMENT_TYPE_META = {
	setGaming: {type: "GS", label: "Gaming Set"},
	instrumentMusical: {type: "INS", label: "Musical Instrument"},
	toolArtisan: {type: "AT", label: "Artisan's Tools"},
	tool: {type: "T", label: "Tool"},
	weaponSimple: {type: "simple", label: "Simple Weapon", kind: "weaponCategory"},
	weaponMartial: {type: "martial", label: "Martial Weapon", kind: "weaponCategory"},
	weaponSimpleMelee: {type: "simpleM", label: "Simple Melee Weapon", kind: "weaponCategory"},
	weaponSimpleRanged: {type: "simpleR", label: "Simple Ranged Weapon", kind: "weaponCategory"},
	weaponMartialMelee: {type: "martialM", label: "Martial Melee Weapon", kind: "weaponCategory"},
	weaponMartialRanged: {type: "martialR", label: "Martial Ranged Weapon", kind: "weaponCategory"},
	armorLight: {type: "LA", label: "Light Armor"},
	armorMedium: {type: "MA", label: "Medium Armor"},
	armorHeavy: {type: "HA", label: "Heavy Armor"},
	shield: {type: "S", label: "Shield"},
	focusArcane: {type: "SCF", label: "Arcane Focus", focus: "arcane"},
	focusDruidic: {type: "SCF", label: "Druidic Focus", focus: "druid"},
	focusHoly: {type: "SCF", label: "Holy Symbol", focus: "holy"},
};

export class DataStore {
	constructor () {
		this.ready = false;
		this.enabledSources = new Set(["XPHB", "XDMG", "XMM"]);
		this.species = [];
		this.backgrounds = [];
		this.feats = [];
		this.classes = [];
		this.subclasses = [];
		this.classFeatures = new Map(); // uid lower -> feature
		this.subclassFeatures = new Map();
		this.spells = [];
		this.spellByUid = new Map();
		this.items = [];
		this.itemByUid = new Map();
		this.skills = SKILLS_FALLBACK;
		this._raw = {};
		this._classFiles = new Map(); // class key -> raw file
	}

	async load (sources) {
		if (sources?.length) {
			this.enabledSources = new Set(sources.map(s => s.toUpperCase()));
		}

		const [racesRaw, backgroundsRaw, featsRaw, classIndex, spellsRaw, spellSources, itemsBase, itemsFull] = await Promise.all([
			fetchJson("races.json"),
			fetchJson("backgrounds.json"),
			fetchJson("feats.json"),
			fetchJson("class/index.json"),
			fetchJson("spells/spells-xphb.json"),
			fetchJson("spells/sources.json"),
			fetchJson("items-base.json"),
			fetchJson("items.json"),
		]);

		this._raw = {racesRaw, backgroundsRaw, featsRaw, classIndex, spellsRaw, spellSources, itemsBase, itemsFull};

		const classEntries = Object.entries(classIndex);
		const classJsons = await Promise.all(
			classEntries.map(async ([key, file]) => {
				const data = await fetchJson(`class/${file}`);
				return {key, data};
			}),
		);
		this._raw.classJsons = classJsons;

		this.applySourceFilter();
		this.ready = true;
	}

	filterBySources (sources) {
		if (!sources) return;
		this.enabledSources = new Set(sources.map(s => s.toUpperCase()));
		this.applySourceFilter();
	}

	applySourceFilter () {
		const srcSet = this.enabledSources;
		const {racesRaw, backgroundsRaw, featsRaw, spellsRaw, spellSources, itemsBase, itemsFull, classJsons} = this._raw;

		if (!racesRaw) return;

		this.species = (racesRaw.race || [])
			.filter(r => isEntityAllowed(r, srcSet))
			.sort((a, b) => a.name.localeCompare(b.name));

		this.backgrounds = (backgroundsRaw.background || [])
			.filter(b => isEntityAllowed(b, srcSet))
			.sort((a, b) => a.name.localeCompare(b.name));

		this.feats = (featsRaw.feat || [])
			.filter(f => isEntityAllowed(f, srcSet))
			.sort((a, b) => a.name.localeCompare(b.name));

		const classes = [];
		const subclasses = [];
		this.classFeatures.clear();
		this.subclassFeatures.clear();

		for (const {key, data} of classJsons || []) {
			this._classFiles.set(key, data);
			for (const cls of data.class || []) {
				if (isEntityAllowed(cls, srcSet)) classes.push(cls);
			}
			for (const sc of data.subclass || []) {
				const isAllowed = isEntityAllowed(sc, srcSet);
				const forXphbClass = String(sc.classSource).toUpperCase() === "XPHB" || srcSet.has(String(sc.classSource).toUpperCase());
				if (isAllowed && forXphbClass) subclasses.push(sc);
			}
			for (const cf of data.classFeature || []) {
				const uid = toUidFeature(cf);
				this.classFeatures.set(uid, cf);
				const alt = `${cf.name}|${cf.className}|${cf.classSource}|${cf.level}`.toLowerCase();
				this.classFeatures.set(alt, cf);
				const alt2 = `${cf.name}|${cf.className}|${cf.classSource}|${cf.level}|${cf.source}`.toLowerCase();
				this.classFeatures.set(alt2, cf);
			}
			for (const sf of data.subclassFeature || []) {
				const keys = [
					`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|${sf.subclassSource || ""}|${sf.level}`,
					`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|${sf.source || sf.subclassSource || ""}|${sf.level}`,
					`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}||${sf.level}`,
					`${sf.name}|${sf.className}|${sf.classSource}|${sf.subclassShortName}|xphb|${sf.level}`,
				];
				for (const k of keys) this.subclassFeatures.set(k.toLowerCase(), sf);
			}
		}

		this.classes = classes.sort((a, b) => a.name.localeCompare(b.name));
		this.subclasses = subclasses.sort((a, b) => a.name.localeCompare(b.name));

		// Spells
		const xphbLists = spellSources?.XPHB || {};
		this.spells = (spellsRaw?.spell || [])
			.filter(sp => isEntityAllowed(sp, srcSet))
			.map(sp => {
				const list = xphbLists[sp.name];
				const fromClassList = list?.class || [];
				return {...sp, fromClassList};
			});

		this.spellByUid.clear();
		for (const sp of this.spells) {
			this.spellByUid.set(toUid(sp.name, sp.source), sp);
		}

		// Items
		const itemList = [
			...(itemsBase?.baseitem || []),
			...(itemsFull?.item || []),
			...(itemsFull?.itemGroup || []),
		].filter(it => isEntityAllowed(it, srcSet));

		this.items = itemList;
		this.itemByUid.clear();
		for (const it of itemList) {
			if (!it?.name || !it?.source) continue;
			const uid = toUid(it.name, it.source);
			if (!this.itemByUid.has(uid)) this.itemByUid.set(uid, it);
			const bare = String(it.name).toLowerCase();
			if (!this.itemByUid.has(bare)) this.itemByUid.set(bare, it);
		}
	}

	getClass (uid) {
		if (!uid) return null;
		const {name, source} = parseUid(uid);
		return this.classes.find(c =>
			c.name.toLowerCase() === name && c.source.toLowerCase() === source,
		) || this.classes.find(c => c.name.toLowerCase() === name);
	}

	getSpecies (uid) {
		if (!uid) return null;
		const {name, source} = parseUid(uid);
		return this.species.find(r =>
			r.name.toLowerCase() === name && r.source.toLowerCase() === source,
		) || this.species.find(r => r.name.toLowerCase() === name);
	}

	getBackground (uid) {
		if (!uid) return null;
		const {name, source} = parseUid(uid);
		return this.backgrounds.find(b =>
			b.name.toLowerCase() === name && b.source.toLowerCase() === source,
		) || this.backgrounds.find(b => b.name.toLowerCase() === name);
	}

	getFeat (uid) {
		if (!uid) return null;
		const {name, source} = parseUid(uid);
		return this.feats.find(f =>
			f.name.toLowerCase() === name && f.source.toLowerCase() === source,
		) || this.feats.find(f => f.name.toLowerCase() === name);
	}

	subclassesForClass (classEntity) {
		if (!classEntity) return [];
		const classNameLower = classEntity.name.toLowerCase();
		return this.subclasses.filter(sc =>
			String(sc.className || "").toLowerCase() === classNameLower,
		);
	}

	spellsForClass (className, {cantripsOnly = false, maxLevel = 9} = {}) {
		const nameLower = String(className || "").toLowerCase();
		return this.spells.filter(sp => {
			if (cantripsOnly && sp.level !== 0) return false;
			if (sp.level > maxLevel) return false;
			const inList = sp.fromClassList?.some(c => c.toLowerCase() === nameLower);
			const inClasses = sp.classes?.fromClassList?.some(c => c.name?.toLowerCase() === nameLower);
			return inList || inClasses;
		});
	}

	itemsForEquipmentType (equipmentType) {
		const meta = EQUIPMENT_TYPE_META[equipmentType];
		if (!meta) return [];

		return this.items.filter(it => {
			if (meta.kind === "weaponCategory") {
				if (meta.type === "simple") return it.weaponCategory?.toLowerCase() === "simple";
				if (meta.type === "martial") return it.weaponCategory?.toLowerCase() === "martial";
				if (meta.type === "simpleM") return it.weaponCategory?.toLowerCase() === "simple" && String(it.type).startsWith("M");
				if (meta.type === "simpleR") return it.weaponCategory?.toLowerCase() === "simple" && String(it.type).startsWith("R");
				if (meta.type === "martialM") return it.weaponCategory?.toLowerCase() === "martial" && String(it.type).startsWith("M");
				if (meta.type === "martialR") return it.weaponCategory?.toLowerCase() === "martial" && String(it.type).startsWith("R");
			}
			if (meta.focus) {
				const scf = it.scfType || it.type;
				return String(scf || "").toLowerCase().includes(meta.focus);
			}
			const t = String(it.type || "").split("|")[0];
			return t === meta.type;
		});
	}

	resolveClassFeatureRef (refStr) {
		if (!refStr) return null;
		const k = String(refStr).toLowerCase();
		return this.classFeatures.get(k) || null;
	}

	resolveSubclassFeatureRef (refStr) {
		if (!refStr) return null;
		const k = String(refStr).toLowerCase();
		return this.subclassFeatures.get(k) || null;
	}
}

function toUidFeature (cf) {
	return `${cf.name}|${cf.className}|${cf.classSource}|${cf.level}`.toLowerCase();
}

export const SKILLS_FALLBACK = [
	{name: "Acrobatics", ability: "dex"},
	{name: "Animal Handling", ability: "wis"},
	{name: "Arcana", ability: "int"},
	{name: "Athletics", ability: "str"},
	{name: "Deception", ability: "cha"},
	{name: "History", ability: "int"},
	{name: "Insight", ability: "wis"},
	{name: "Intimidation", ability: "cha"},
	{name: "Investigation", ability: "int"},
	{name: "Medicine", ability: "wis"},
	{name: "Nature", ability: "int"},
	{name: "Perception", ability: "wis"},
	{name: "Performance", ability: "cha"},
	{name: "Persuasion", ability: "cha"},
	{name: "Religion", ability: "int"},
	{name: "Sleight of Hand", ability: "dex"},
	{name: "Stealth", ability: "dex"},
	{name: "Survival", ability: "wis"},
];
