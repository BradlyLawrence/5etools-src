/**
 * Multi-character Roster Manager for 5etools Character Creators.
 * Stores multiple characters in localStorage and manages active character selection.
 */

import {storageGet, storageSet} from "./file-io.js";

/**
 * Generate a unique character ID.
 * @returns {string}
 */
export function generateCharacterId () {
	return `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @typedef {object} RosterEntry
 * @property {string} id
 * @property {string} name
 * @property {number} level
 * @property {string} className
 * @property {string} cultureOrSpecies
 * @property {string} [portrait]
 * @property {number} updatedAt
 * @property {object} character
 * @property {"sheet"|"wizard"} [mode]
 */

/**
 * @typedef {object} RosterState
 * @property {string|null} activeId
 * @property {Record<string, RosterEntry>} characters
 */

/**
 * Get the full roster state for a given storage namespace.
 * @param {string} rosterKey
 * @returns {RosterState}
 */
export function getRoster (rosterKey) {
	const data = storageGet(rosterKey);
	if (!data || typeof data !== "object") {
		return {activeId: null, characters: {}};
	}
	return {
		activeId: data.activeId || null,
		characters: data.characters && typeof data.characters === "object" ? data.characters : {},
	};
}

/**
 * Save the entire roster state.
 * @param {string} rosterKey
 * @param {RosterState} roster
 */
export function saveRoster (rosterKey, roster) {
	storageSet(rosterKey, roster);
}

/**
 * List all saved character summaries sorted by most recently updated.
 * @param {string} rosterKey
 * @returns {RosterEntry[]}
 */
export function listCharacters (rosterKey) {
	const roster = getRoster(rosterKey);
	const list = Object.values(roster.characters);
	return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Get active character entry, or null if none.
 * @param {string} rosterKey
 * @returns {RosterEntry|null}
 */
export function getActiveCharacter (rosterKey) {
	const roster = getRoster(rosterKey);
	if (!roster.activeId) {
		const list = Object.values(roster.characters);
		if (list.length > 0) {
			roster.activeId = list[0].id;
			saveRoster(rosterKey, roster);
			return list[0];
		}
		return null;
	}
	return roster.characters[roster.activeId] || null;
}

/**
 * Set active character ID in the roster.
 * @param {string} rosterKey
 * @param {string} id
 */
export function setActiveCharacter (rosterKey, id) {
	const roster = getRoster(rosterKey);
	if (roster.characters[id]) {
		roster.activeId = id;
		saveRoster(rosterKey, roster);
	}
}

/**
 * Save or update a character in the roster.
 * @param {string} rosterKey
 * @param {object} character
 * @param {object} [opts]
 * @param {"sheet"|"wizard"} [opts.mode="sheet"]
 * @param {string} [opts.cultureOrSpecies]
 * @param {string} [opts.className]
 * @returns {RosterEntry}
 */
export function upsertCharacter (rosterKey, character, {mode = "sheet", cultureOrSpecies = "", className = ""} = {}) {
	const roster = getRoster(rosterKey);

	// Ensure character has a stable ID
	if (!character._id) {
		character._id = generateCharacterId();
	}
	const id = character._id;
	const name = character.identity?.name?.trim() || "Unnamed Hero";
	const level = character.level || character.class?.levels || 1;
	const portrait = character.identity?.portrait || "";

	const entry = {
		id,
		name,
		level,
		className: className || character.class?.name || character.className || "Adventurer",
		cultureOrSpecies: cultureOrSpecies || character.culture?.name || character.species?.name || "Middle-earth",
		portrait,
		updatedAt: Date.now(),
		character,
		mode,
	};

	roster.characters[id] = entry;
	roster.activeId = id;
	saveRoster(rosterKey, roster);
	return entry;
}

/**
 * Delete a character from the roster.
 * @param {string} rosterKey
 * @param {string} id
 * @returns {string|null} The next active character ID or null.
 */
export function deleteCharacter (rosterKey, id) {
	const roster = getRoster(rosterKey);
	delete roster.characters[id];
	if (roster.activeId === id) {
		const remaining = Object.keys(roster.characters);
		roster.activeId = remaining.length > 0 ? remaining[0] : null;
	}
	saveRoster(rosterKey, roster);
	return roster.activeId;
}

/**
 * Clone an existing character in the roster.
 * @param {string} rosterKey
 * @param {string} id
 * @returns {RosterEntry|null}
 */
export function duplicateCharacter (rosterKey, id) {
	const roster = getRoster(rosterKey);
	const source = roster.characters[id];
	if (!source) return null;

	const clonedChar = JSON.parse(JSON.stringify(source.character));
	clonedChar._id = generateCharacterId();
	if (clonedChar.identity) {
		clonedChar.identity.name = `${source.name || "Hero"} (Copy)`;
	}

	return upsertCharacter(rosterKey, clonedChar, {
		mode: source.mode || "sheet",
		className: source.className,
		cultureOrSpecies: source.cultureOrSpecies,
	});
}

/**
 * Migrate legacy single-character localStorage state to the new roster format.
 * @param {string} legacyKey e.g. "character-creators/lotr-rpg/state"
 * @param {string} rosterKey e.g. "character-creators/lotr-rpg/roster"
 * @param {() => object} createEmptyFn
 */
export function migrateLegacyRoster (legacyKey, rosterKey, createEmptyFn) {
	const existingRoster = storageGet(rosterKey);
	if (existingRoster && existingRoster.characters && Object.keys(existingRoster.characters).length > 0) {
		return; // Already migrated or has roster data
	}

	const legacySaved = storageGet(legacyKey);
	if (legacySaved?.character) {
		const char = legacySaved.character;
		if (!char._id) char._id = generateCharacterId();
		upsertCharacter(rosterKey, char, {mode: legacySaved.mode || "sheet"});
	} else {
		// Initialize empty character if roster is brand new
		const emptyChar = createEmptyFn();
		emptyChar._id = generateCharacterId();
		upsertCharacter(rosterKey, emptyChar, {mode: "wizard"});
	}
}
