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

function normalizeName(str) {
	if (!str) return "";
	return str
		.split("|")[0]
		.replace(/[-_]+/g, " ")
		.trim()
		.split(/\s+/)
		.map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "")
		.join(" ");
}

/**
 * Parse character JSON exported from character-creators/lotr-rpg or 5etools roster
 */
export function parseCharacterJson(jsonObj) {
	if (!jsonObj || typeof jsonObj !== "object") throw new Error("Invalid JSON data");
	
	// Support direct character or wrapped format ({character: ...})
	let target = jsonObj;
	if (jsonObj.character && typeof jsonObj.character === "object") target = jsonObj.character;

	const name = target.identity?.name || target.name || "Unnamed Adventurer";

	// Calling / Class
	let calling = "Hero";
	if (target.class?.name) calling = target.class.name;
	else if (target.class?.uid) calling = normalizeName(target.class.uid);
	else if (target.calling?.name) calling = target.calling.name;
	else if (target.calling?.id) calling = normalizeName(target.calling.id);
	else if (target.classId) calling = normalizeName(target.classId);

	// Culture / Race / Subrace
	let culture = "Free Folk";
	if (target.culture?.subraceUid && target.culture?.raceUid) {
		const r = normalizeName(target.culture.raceUid);
		const sr = normalizeName(target.culture.subraceUid);
		culture = `${r} (${sr})`;
	} else if (target.culture?.name) {
		culture = target.culture.name;
	} else if (target.culture?.raceUid) {
		culture = normalizeName(target.culture.raceUid);
	} else if (target.race?.name) {
		culture = target.race.name;
	} else if (target.raceUid) {
		culture = normalizeName(target.raceUid);
	}

	const level = Number(target.level) || Number(target.class?.levels) || 1;

	// Abilities
	const abilities = target.abilities?.base || target.abilities || {};
	const str = Number(target.abilities?.str ?? abilities.str ?? 10);
	const dex = Number(target.abilities?.dex ?? abilities.dex ?? 10);
	const con = Number(target.abilities?.con ?? abilities.con ?? 10);
	const int = Number(target.abilities?.int ?? abilities.int ?? 10);
	const wis = Number(target.abilities?.wis ?? abilities.wis ?? 10);
	const cha = Number(target.abilities?.cha ?? abilities.cha ?? 10);

	// Calculate mods
	const dexMod = Math.floor((dex - 10) / 2);
	const conMod = Math.floor((con - 10) / 2);
	const wisMod = Math.floor((wis - 10) / 2);
	const pb = Math.floor((level - 1) / 4) + 2;

	// HP & AC
	let maxHp = 10 + (conMod * level);
	if (target.class?.hpMaxOverride != null) maxHp = Number(target.class.hpMaxOverride);
	else if (target.class?.hpMax != null) maxHp = Number(target.class.hpMax);
	else if (target.health?.maxHp != null) maxHp = Number(target.health.maxHp);
	else if (target.hpMax != null) maxHp = Number(target.hpMax);

	const hp = target.class?.hpCurrent ?? target.health?.currentHp ?? target.hpCurrent ?? maxHp;
	const tempHp = target.combat?.tempHp ?? target.health?.tempHp ?? 0;

	let ac = 10 + dexMod;
	if (target.combat?.acOverride != null) ac = Number(target.combat.acOverride);
	else if (target.health?.ac != null) ac = Number(target.health.ac);
	else if (target.ac != null) ac = Number(target.ac);

	// Hope & Shadow (LOTR specific: Max Hope = 10 + WIS mod)
	const maxHope = target.hope?.max ?? target.health?.maxHope ?? (10 + wisMod);
	const currentHope = target.hope?.current ?? target.health?.currentHope ?? maxHope;
	const shadow = target.shadow?.score ?? target.health?.shadow ?? 0;
	const permShadow = (Array.isArray(target.shadow?.scars) ? target.shadow.scars.length : null) ?? target.health?.permShadow ?? 0;

	// Skills & Passive Perception
	const perceptionSkill = target.proficiencies?.skills?.perception;
	const isPerceptionExpert = perceptionSkill === "expert" || perceptionSkill === "expertise" || perceptionSkill === 2;
	const isPerceptionProf = isPerceptionExpert || !!perceptionSkill;
	const passivePerception = 10 + wisMod + (isPerceptionExpert ? 2 * pb : (isPerceptionProf ? pb : 0));

	const id = target._id || ("pc_" + Date.now() + "_" + Math.floor(Math.random() * 1000));

	return {
		id,
		name,
		calling,
		culture,
		level,
		ac,
		hp,
		maxHp,
		tempHp,
		currentHope,
		maxHope,
		shadow,
		permShadow,
		passivePerception,
		travelRole: target.travelRole || "None",
		raw: target
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
