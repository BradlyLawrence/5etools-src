/**
 * dmtools/tlotrr/js/char-importer.js
 * Manages player character import from LOTR Character Creator JSON, state edits, and party stats.
 */

import { escapeHtml } from "./data.js";

let partyState = [];

/**
 * Get current active party
 */
export function getParty() {
	return partyState;
}

/**
 * Set active party
 */
export function setParty(party) {
	partyState = party || [];
	savePartyToStorage();
}

/**
 * Save to localStorage
 */
function savePartyToStorage() {
	try {
		localStorage.setItem("dmtools/tlotrr/party", JSON.stringify(partyState));
	} catch (e) {
		console.error("Failed to save party to storage:", e);
	}
}

/**
 * Load party from localStorage
 */
export function loadPartyFromStorage() {
	try {
		const raw = localStorage.getItem("dmtools/tlotrr/party");
		if (raw) {
			partyState = JSON.parse(raw);
		}
	} catch (e) {
		console.error("Failed to load party from storage:", e);
	}
	return partyState;
}

/**
 * Parse character JSON exported from character-creators/lotr-rpg
 */
export function parseCharacterJson(jsonObj) {
	if (!jsonObj) throw new Error("Invalid JSON data");
	
	// Validate schema type if available
	if (jsonObj.fileType && jsonObj.fileType !== "5etools-char-lotr") {
		console.warn("File type does not explicitly match 5etools-char-lotr, attempting best-effort parse.");
	}

	const name = jsonObj.identity?.name || "Unnamed Adventurer";
	const calling = jsonObj.calling?.name || jsonObj.calling?.id || "Hero";
	const culture = jsonObj.culture?.name || jsonObj.culture?.raceUid || "Free Folk";
	const level = jsonObj.level || 1;

	// Stats
	const str = jsonObj.abilities?.str || 10;
	const dex = jsonObj.abilities?.dex || 10;
	const con = jsonObj.abilities?.con || 10;
	const int = jsonObj.abilities?.int || 10;
	const wis = jsonObj.abilities?.wis || 10;
	const cha = jsonObj.abilities?.cha || 10;

	// Calculate mods
	const dexMod = Math.floor((dex - 10) / 2);
	const wisMod = Math.floor((wis - 10) / 2);

	// HP & Hope
	const maxHp = jsonObj.health?.maxHp || (10 + Math.floor((con - 10) / 2) * level);
	const hp = jsonObj.health?.currentHp !== undefined ? jsonObj.health.currentHp : maxHp;
	const ac = jsonObj.health?.ac || (10 + dexMod);

	// Hope & Shadow (LOTR specific)
	const maxHope = jsonObj.health?.maxHope || (8 + wisMod);
	const currentHope = jsonObj.health?.currentHope !== undefined ? jsonObj.health.currentHope : maxHope;
	const shadow = jsonObj.health?.shadow || 0;
	const permShadow = jsonObj.health?.permShadow || 0;

	const passivePerception = 10 + wisMod;

	const id = "pc_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

	return {
		id,
		name,
		calling,
		culture,
		level,
		ac,
		hp,
		maxHp,
		tempHp: 0,
		currentHope,
		maxHope,
		shadow,
		permShadow,
		passivePerception,
		travelRole: "None", // Guide, Scout, Hunter, Look-out, None
		raw: jsonObj
	};
}

/**
 * Add imported or created PC to active party
 */
export function addCharacterToParty(pc) {
	partyState.push(pc);
	savePartyToStorage();
	return partyState;
}

/**
 * Remove PC by ID
 */
export function removeCharacterFromParty(id) {
	partyState = partyState.filter(c => c.id !== id);
	savePartyToStorage();
	return partyState;
}

/**
 * Update single resource for PC
 */
export function updatePcResource(id, key, delta) {
	const pc = partyState.find(c => c.id === id);
	if (!pc) return;

	if (key === "hp") {
		pc.hp = Math.max(0, Math.min(pc.maxHp, pc.hp + delta));
	} else if (key === "hope") {
		pc.currentHope = Math.max(0, Math.min(pc.maxHope, pc.currentHope + delta));
	} else if (key === "shadow") {
		pc.shadow = Math.max(0, pc.shadow + delta);
	} else if (key === "permShadow") {
		pc.permShadow = Math.max(0, pc.permShadow + delta);
	} else if (key === "travelRole") {
		pc.travelRole = delta;
	}
	savePartyToStorage();
	return pc;
}

/**
 * Render Party Grid HTML
 */
export function renderPartyGridContainer(containerEl, onUpdateCb) {
	if (!containerEl) return;
	
	if (partyState.length === 0) {
		containerEl.innerHTML = `
			<div style="text-align:center; padding: 2rem; color: var(--text-muted);">
				<p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No Adventurers in the Fellowship yet.</p>
				<p style="font-size: 0.85rem;">Import a character JSON file exported from the <strong>Character Creator</strong> or add one manually!</p>
			</div>
		`;
		return;
	}

	containerEl.innerHTML = partyState.map(pc => `
		<div class="pc-card" id="card_${pc.id}">
			<div class="pc-header">
				<div>
					<div class="pc-name">${escapeHtml(pc.name)}</div>
					<div class="pc-meta">${escapeHtml(pc.culture)} · Level ${pc.level} ${escapeHtml(pc.calling)}</div>
				</div>
				<button class="btn-lm danger btn-sm" onclick="window.removePc('${pc.id}')">✕</button>
			</div>

			<div class="pc-stats-row">
				<div class="pc-stat-item">
					<div class="lbl">AC</div>
					<div class="val">${pc.ac}</div>
				</div>
				<div class="pc-stat-item">
					<div class="lbl">HP</div>
					<div class="val" style="color: ${pc.hp < pc.maxHp * 0.3 ? 'var(--text-danger)' : 'var(--text-heading)'}">${pc.hp}/${pc.maxHp}</div>
				</div>
				<div class="pc-stat-item">
					<div class="lbl">Perc.</div>
					<div class="val">${pc.passivePerception}</div>
				</div>
				<div class="pc-stat-item">
					<div class="lbl">Role</div>
					<div>
						<select class="role-select" onchange="window.updatePcRole('${pc.id}', this.value)">
							<option value="None" ${pc.travelRole === 'None' ? 'selected' : ''}>None</option>
							<option value="Guide" ${pc.travelRole === 'Guide' ? 'selected' : ''}>Guide</option>
							<option value="Scout" ${pc.travelRole === 'Scout' ? 'selected' : ''}>Scout</option>
							<option value="Hunter" ${pc.travelRole === 'Hunter' ? 'selected' : ''}>Hunter</option>
							<option value="Look-out" ${pc.travelRole === 'Look-out' ? 'selected' : ''}>Look-out</option>
						</select>
					</div>
				</div>
			</div>

			<div class="pc-resources">
				<div class="resource-box">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:var(--text-muted)">HEALTH</div>
					<div class="resource-controls">
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'hp', -1)">-</button>
						<span style="font-weight:bold; font-size:0.9rem">${pc.hp}</span>
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'hp', 1)">+</button>
					</div>
				</div>

				<div class="resource-box hope-box">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:#74c0fc">HOPE</div>
					<div class="resource-controls">
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'hope', -1)">-</button>
						<span style="font-weight:bold; font-size:0.9rem; color:#74c0fc">${pc.currentHope}/${pc.maxHope}</span>
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'hope', 1)">+</button>
					</div>
				</div>

				<div class="resource-box shadow-box">
					<div style="font-size:0.7rem; font-family:var(--font-title); color:var(--text-danger)">SHADOW</div>
					<div class="resource-controls">
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'shadow', -1)">-</button>
						<span style="font-weight:bold; font-size:0.9rem; color:var(--text-danger)">${pc.shadow}</span>
						<button class="btn-ctrl" onclick="window.modPcResource('${pc.id}', 'shadow', 1)">+</button>
					</div>
				</div>
			</div>
		</div>
	`).join("");
}
