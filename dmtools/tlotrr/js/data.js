/**
 * dmtools/tlotrr/js/data.js
 * Data loader for LOTR RPG core JSON, 5etools bestiary, and rules tables.
 */

export const LOTR_DATA_PATH = "../../character-creators/lotr-rpg/data/Free League; The Lord of the Rings Roleplaying.json";
export const BESTIARY_MM_PATH = "../../data/bestiary/bestiary-mm.json";

let lotrDataCache = null;
let bestiaryCache = [];

/**
 * Load main LOTR RPG data JSON
 */
export async function loadLotrData() {
	if (lotrDataCache) return lotrDataCache;
	try {
		const res = await fetch(LOTR_DATA_PATH);
		if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
		lotrDataCache = await res.json();
		return lotrDataCache;
	} catch (e) {
		console.error("Failed to load LOTR RPG data JSON:", e);
		return null;
	}
}

/**
 * Get adversaries (monsters) from LOTR data
 */
export async function getLotrAdversaries() {
	const data = await loadLotrData();
	if (!data || !data.monster) return [];
	return data.monster.map(m => ({
		name: m.name,
		source: m.source || "LOTR-RPG",
		cr: m.cr ? (typeof m.cr === "object" ? m.cr.cr || "1" : String(m.cr)) : "1",
		type: m.type ? (typeof m.type === "object" ? m.type.type : String(m.type)) : "adversary",
		hp: m.hp ? m.hp.average || 10 : 10,
		ac: m.ac ? (Array.isArray(m.ac) ? (typeof m.ac[0] === "object" ? m.ac[0].ac : m.ac[0]) : m.ac) : 10,
		hate: m.hate || m.shadowPoints || 0,
		raw: m,
		isLotr: true
	}));
}

/**
 * Load additional 5etools bestiary data
 */
export async function load5eBestiary() {
	if (bestiaryCache.length > 0) return bestiaryCache;
	try {
		const res = await fetch(BESTIARY_MM_PATH);
		if (res.ok) {
			const data = await res.json();
			if (data.monster) {
				const mmMonsters = data.monster.map(m => ({
					name: m.name,
					source: m.source || "MM",
					cr: m.cr ? (typeof m.cr === "object" ? m.cr.cr || "1" : String(m.cr)) : "1",
					type: m.type ? (typeof m.type === "object" ? m.type.type : String(m.type)) : "creature",
					hp: m.hp ? m.hp.average || 10 : 10,
					ac: m.ac ? (Array.isArray(m.ac) ? (typeof m.ac[0] === "object" ? m.ac[0].ac : m.ac[0]) : m.ac) : 10,
					raw: m,
					isLotr: false
				}));
				bestiaryCache = mmMonsters;
			}
		}
	} catch (e) {
		console.warn("Could not load 5e bestiary MM JSON:", e);
	}
	return bestiaryCache;
}

/**
 * Journey Event Tables (from FL 5e Core Rulebook Chapter 5)
 */
export const JOURNEY_EVENTS = [
	{
		roll: 1,
		title: "Terrible Weather",
		targetRole: "Guide",
		skill: "Travel",
		dc: 13,
		desc: "Unforgiving weather hits the company (heavy downpour, gale-force winds, or freezing sleet).",
		success: "The Guide navigates safely through the storm. No extra fatigue.",
		failure: "The company suffers +1 Fatigue step, and travel pace is halved for 2 days."
	},
	{
		roll: 2,
		title: "Desolation & Despair",
		targetRole: "Look-out",
		skill: "Insight",
		dc: 14,
		desc: "The path crosses ruined dwellings or dark landmarks tainted by old sorcery.",
		success: "The Look-out keeps the company's spirits up with vigilant resolve.",
		failure: "Each company member must make a DC 13 Wisdom saving throw or gain 1 Shadow Point (Dread)."
	},
	{
		roll: 3,
		title: "Shortage of Provisions",
		targetRole: "Hunter",
		skill: "Survival",
		dc: 13,
		desc: "Rations spoil or game proves extraordinarily scarce in these barren lands.",
		success: "The Hunter manages to forage fresh game or wild herbs to replenish supplies.",
		failure: "The company runs out of fresh food. Each member suffers +1 Fatigue step."
	},
	{
		roll: 4,
		title: "Sightings & Spies",
		targetRole: "Scout",
		skill: "Stealth",
		dc: 14,
		desc: "Foul crows, Orc scouts, or dark riders hover nearby on distant ridges.",
		success: "The Scout spots the threats early and guides the company unseen around them.",
		failure: "The Enemy's spies spot the party! Eye Awareness increases by +2."
	},
	{
		roll: 5,
		title: "Tricky Obstacle",
		targetRole: "Scout",
		skill: "Athletics",
		dc: 13,
		desc: "A collapsed bridge, flooded ravine, or steep cliff blocks the path.",
		success: "The Scout finds a safe path across the obstruction without delay.",
		failure: "The company loses a full day finding a bypass and suffers +1 Fatigue step."
	},
	{
		roll: 6,
		title: "Chance Meeting (Friendly)",
		targetRole: "Guide",
		skill: "Traditions",
		dc: 12,
		desc: "The company encounters a friendly wanderer, a Ranger, or a Dwarf caravan.",
		success: "Warm greetings and shared news! Each player recovers 1 Hope point and gains local lore.",
		failure: "A cautious exchange of news, but no harm comes to the party."
	},
	{
		roll: 7,
		title: "Ill-bode Sign",
		targetRole: "Look-out",
		skill: "Perception",
		dc: 13,
		desc: "A flock of black birds flies west overhead, or a dark shadow crosses the sun.",
		success: "The Look-out reassures the party; it is merely nature.",
		failure: "Gloom hangs over the company. The next Wisdom saving throw has disadvantage."
	},
	{
		roll: 8,
		title: "Ancient Ruins",
		targetRole: "Scout",
		skill: "History",
		dc: 13,
		desc: "Ancient stones of Arnor or Elven cairns rise from the grass.",
		success: "The party uncovers a hidden cache or restful haven. Recover 1 Hope.",
		failure: "The ruins harbor an eerie presence. Eye Awareness increases by +1."
	},
	{
		roll: 9,
		title: "Foul Stream",
		targetRole: "Hunter",
		skill: "Nature",
		dc: 13,
		desc: "A dark watercourse blocks the way, smelling of malice.",
		success: "The Hunter identifies a clean spring upstream for the party.",
		failure: "Drinking or crossing causes mild sickness. DC 12 Con save or poison for 1 day."
	},
	{
		roll: 10,
		title: "Ambush in the Dark",
		targetRole: "Look-out",
		skill: "Perception",
		dc: 15,
		desc: "Goblins or hungry Wargs lie in wait behind rocks!",
		success: "The Look-out warns the company in time. No surprise round.",
		failure: "The company is caught off guard! Enemies gain a surprise round in combat."
	},
	{
		roll: 11,
		title: "Restful Haven",
		targetRole: "Guide",
		skill: "Travel",
		dc: 10,
		desc: "A sheltered valley with fresh spring water and green grass.",
		success: "A peaceful night! All PCs remove 1 Fatigue step and gain +1 Hope.",
		failure: "A decent rest, but nothing exceptional."
	},
	{
		roll: 12,
		title: "Patron's Favor / Rare Blessing",
		targetRole: "All",
		skill: "Insight",
		dc: 10,
		desc: "A moment of clarity or distant song brings renewed strength to the fellowship.",
		success: "The Fellowship Pool gains +2 points immediately!",
		failure: "The Fellowship Pool gains +1 point."
	}
];

/**
 * Patrons Data
 */
export const PATRONS = [
	{
		id: "balin",
		name: "Balin, Son of Fundin",
		title: "Lord of Erebor / Elder Dwarf",
		location: "Erebor / Travelling West",
		advantage: "Dwarven Resolve",
		desc: "Balin provides guidance on old dwarf-roads, ruins, and deep lore. PCs under his patronage gain advantage on History rolls concerning Khazad-dûm and Durin's Folk.",
		agenda: "Reclaim lost treasures of the Dwarves and monitor dark forces in Moria.",
		fellowshipBonus: 1
	},
	{
		id: "bilbo",
		name: "Bilbo Baggins",
		title: "The Hobbit of Bag End",
		location: "Rivendell / The Shire",
		advantage: "Hobbit Laughter & Riddle-lore",
		desc: "Bilbo's cozy cheer and endless tales bolster spirits. PCs gain advantage on Riddle checks and start each Fellowship Phase with +1 Hope.",
		agenda: "Gather tales for his red book, protect peaceful lands, and keep young folk safe.",
		fellowshipBonus: 2
	},
	{
		id: "cirdan",
		name: "Círdan the Shipwright",
		title: "Lord of the Grey Havens",
		location: "Mithlond (Grey Havens)",
		advantage: "Vision of the West",
		desc: "Círdan bestows ancient foresight. PCs gain advantage on saving throws against Dread and Shadow.",
		agenda: "Guard the Western shores and assist those who stand against the Dark Lord.",
		fellowshipBonus: 1
	},
	{
		id: "gandalf",
		name: "Gandalf the Grey",
		title: "The Grey Pilgrim",
		location: "Wandering Middle-earth",
		advantage: "The Flame of Anor",
		desc: "Gandalf inspires resistance against despair. When a PC fails a saving throw against Shadow, they can use Gandalf's inspiration to re-roll once per session.",
		agenda: "Unite the Free Peoples, investigate growing shadows, and thwart Sauron's council.",
		fellowshipBonus: 2
	},
	{
		id: "gilraen",
		name: "Gilraen the Fair",
		title: "Mother of Aragorn",
		location: "Rivendell / Dúnedain Settlements",
		advantage: "Ranger Vigilance",
		desc: "Gilraen provides secret waystations and Ranger aid across Eriador. PCs gain +2 on Travel checks in Eriador.",
		agenda: "Protect the Dúnedain line and guard the borders of the Shire and Eriador.",
		fellowshipBonus: 1
	},
	{
		id: "tombombadil",
		name: "Tom Bombadil & Lady Goldberry",
		title: "Master of Wood, Water and Hill",
		location: "Withywindle / Old Forest",
		advantage: "Merry Heart",
		desc: "Tom's cheerful song dispels corruption. Resting in Tom's house removes all temporary Shadow Points.",
		agenda: "Care for the ancient lands, trees, and small creatures.",
		fellowshipBonus: 2
	}
];

/**
 * Eriador Map Hex Locations for Journey Engine
 */
export const MAP_NODES = [
	{ id: "shire_michel", name: "Michel Delving (The Shire)", x: 220, y: 310, type: "settlement", difficulty: "border" },
	{ id: "shire_hobbiton", name: "Hobbiton & Bag End", x: 260, y: 290, type: "settlement", difficulty: "border" },
	{ id: "bree", name: "Bree & The Prancing Pony", x: 380, y: 300, type: "settlement", difficulty: "border" },
	{ id: "barrow_downs", name: "Barrow-downs", x: 350, y: 330, type: "ruins", difficulty: "wild" },
	{ id: "weathertop", name: "Weathertop (Amon Sûl)", x: 500, y: 280, type: "ruins", difficulty: "wild" },
	{ id: "trollshaws", name: "The Trollshaws", x: 640, y: 260, type: "wilderness", difficulty: "wild" },
	{ id: "rivendell", name: "Rivendell (The Last Homely House)", x: 740, y: 250, type: "haven", difficulty: "border" },
	{ id: "blue_mountains", name: "Ered Luin (Blue Mountains)", x: 100, y: 200, type: "settlement", difficulty: "border" },
	{ id: "evendim", name: "Lake Evendim (Annumínas)", x: 340, y: 180, type: "ruins", difficulty: "wild" },
	{ id: "fornost", name: "Fornost Erain (Deadman's Dike)", x: 420, y: 200, type: "ruins", difficulty: "dark" },
	{ id: "angmar", name: "Carn Dûm (Angmar)", x: 520, y: 100, type: "fortress", difficulty: "dark" },
	{ id: "ettenmoors", name: "The Ettenmoors", x: 650, y: 170, type: "wilderness", difficulty: "dark" },
	{ id: "tharbad", name: "Tharbad Ruins", x: 480, y: 440, type: "ruins", difficulty: "wild" },
	{ id: "grey_havens", name: "Mithlond (Grey Havens)", x: 120, y: 360, type: "haven", difficulty: "border" }
];

export function escapeHtml(str) {
	if (!str) return "";
	return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

