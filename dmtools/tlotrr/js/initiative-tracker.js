/**
 * dmtools/tlotrr/js/initiative-tracker.js
 * Initiative, turn cycling, HP tracking, Hate points, and condition manager for LOTR RPG.
 */

import { getParty } from "./char-importer.js";
import { escapeHtml } from "./data.js";

let combatants = [];
let roundNum = 1;
let currentTurnIdx = 0;

export function addCombatantsToTracker(newCombatants) {
	combatants = [...combatants, ...newCombatants];
	sortCombatants();
	renderInitiativeTracker();
}

export function loadPartyIntoCombat() {
	const party = getParty();
	const pcCombatants = party.map(pc => ({
		id: "pc_comb_" + pc.id,
		name: pc.name,
		isPc: true,
		ac: pc.ac,
		hp: pc.hp,
		maxHp: pc.maxHp,
		tempHp: pc.tempHp || 0,
		init: Math.floor(Math.random() * 20) + 1,
		conditions: []
	}));

	// Remove old PCs from combatants to prevent dupes
	combatants = combatants.filter(c => !c.isPc);
	combatants = [...combatants, ...pcCombatants];
	sortCombatants();
	renderInitiativeTracker();
}

export function rollAllInitiative() {
	combatants.forEach(c => {
		c.init = Math.floor(Math.random() * 20) + 1;
	});
	sortCombatants();
	currentTurnIdx = 0;
	renderInitiativeTracker();
}

function sortCombatants() {
	combatants.sort((a, b) => b.init - a.init);
}

export function nextTurn() {
	if (combatants.length === 0) return;
	currentTurnIdx++;
	if (currentTurnIdx >= combatants.length) {
		currentTurnIdx = 0;
		roundNum++;
	}
	renderInitiativeTracker();
}

export function prevTurn() {
	if (combatants.length === 0) return;
	currentTurnIdx--;
	if (currentTurnIdx < 0) {
		currentTurnIdx = Math.max(0, combatants.length - 1);
		if (roundNum > 1) roundNum--;
	}
	renderInitiativeTracker();
}

export function resetCombat() {
	combatants = [];
	roundNum = 1;
	currentTurnIdx = 0;
	renderInitiativeTracker();
}

window.modCombatHp = function(id, delta) {
	const c = combatants.find(x => x.id === id);
	if (!c) return;
	c.hp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
	renderInitiativeTracker();
};

window.modCombatHate = function(id, delta) {
	const c = combatants.find(x => x.id === id);
	if (!c || c.hate === undefined) return;
	c.hate = Math.max(0, c.hate + delta);
	renderInitiativeTracker();
};

window.toggleCondition = function(id, cond) {
	const c = combatants.find(x => x.id === id);
	if (!c) return;
	if (c.conditions.includes(cond)) {
		c.conditions = c.conditions.filter(x => x !== cond);
	} else {
		c.conditions.push(cond);
	}
	renderInitiativeTracker();
};

window.removeCombatant = function(id) {
	combatants = combatants.filter(c => c.id !== id);
	if (currentTurnIdx >= combatants.length) {
		currentTurnIdx = Math.max(0, combatants.length - 1);
	}
	renderInitiativeTracker();
};

export function renderInitiativeTracker() {
	const headerEl = document.getElementById("combatHeader");
	const containerEl = document.getElementById("combatTableContainer");
	if (!containerEl) return;

	if (headerEl) {
		headerEl.innerHTML = `
			<div style="display:flex; justify-content:space-between; align-items:center;">
				<div style="font-family:var(--font-title); font-size:1.1rem; color:var(--text-gold);">
					Round <strong>${roundNum}</strong> · Combatants: <strong>${combatants.length}</strong>
				</div>
				<div style="display:flex; gap:0.5rem;">
					<button class="btn-lm btn-sm" onclick="window.loadPartyIntoCombat()">🛡️ Add Active Party</button>
					<button class="btn-lm btn-sm" onclick="window.rollAllInitiative()">🎲 Roll All Init</button>
					<button class="btn-lm danger btn-sm" onclick="window.resetCombat()">Clear</button>
				</div>
			</div>
		`;
	}

	if (combatants.length === 0) {
		containerEl.innerHTML = `
			<div style="text-align:center; padding:2rem; color:var(--text-muted);">
				No active combatants. Add the party or build an encounter to begin initiative!
			</div>
		`;
		return;
	}

	containerEl.innerHTML = `
		<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
			<button class="btn-lm" onclick="window.prevTurn()">← Prev Turn</button>
			<div style="font-family:var(--font-title); font-size:1rem; color:var(--text-gold);">
				Current Turn: <strong>${escapeHtml(combatants[currentTurnIdx]?.name || "None")}</strong>
			</div>
			<button class="btn-lm primary" onclick="window.nextTurn()">Next Turn →</button>
		</div>

		<table class="combat-table">
			<thead>
				<tr>
					<th style="width:60px">Init</th>
					<th>Name</th>
					<th style="width:70px">AC</th>
					<th style="width:140px">HP</th>
					<th style="width:100px">Hate/Shadow</th>
					<th>Conditions</th>
					<th style="width:40px"></th>
				</tr>
			</thead>
			<tbody>
				${combatants.map((c, idx) => {
					const isActive = (idx === currentTurnIdx);
					const rowClass = `combat-row ${isActive ? 'active-turn' : ''} ${c.isPc ? 'is-pc' : 'is-enemy'}`;
					const hpColor = c.hp === 0 ? 'var(--text-danger)' : (c.hp < c.maxHp * 0.3 ? '#ff922b' : 'var(--text-heading)');

					return `
						<tr class="${rowClass}">
							<td>
								<input type="number" value="${c.init}" class="form-control" style="width:50px; padding:0.2rem; text-align:center" onchange="window.updateCombatInit('${c.id}', this.value)" />
							</td>
							<td>
								<strong style="color:${c.isPc ? 'var(--text-gold)' : 'var(--text-heading)'}">${escapeHtml(c.name)}</strong>
								<span class="badge ${c.isPc ? 'badge-blue' : 'badge-danger'}" style="margin-left:0.4rem">${c.isPc ? 'PC' : 'Enemy'}</span>
							</td>
							<td style="font-weight:bold">${c.ac}</td>
							<td>
								<div class="resource-controls" style="justify-content:flex-start">
									<button class="btn-ctrl" onclick="window.modCombatHp('${c.id}', -1)">-</button>
									<span style="font-weight:bold; color:${hpColor}; min-width:45px; text-align:center">${c.hp}/${c.maxHp}</span>
									<button class="btn-ctrl" onclick="window.modCombatHp('${c.id}', 1)">+</button>
								</div>
							</td>
							<td>
								${c.isPc ? '-' : `
									<div class="resource-controls" style="justify-content:flex-start">
										<button class="btn-ctrl" onclick="window.modCombatHate('${c.id}', -1)">-</button>
										<span style="font-weight:bold; color:var(--text-danger); min-width:25px; text-align:center">${c.hate || 0}</span>
										<button class="btn-ctrl" onclick="window.modCombatHate('${c.id}', 1)">+</button>
									</div>
								`}
							</td>
							<td>
								<div style="display:flex; gap:0.25rem; flex-wrap:wrap">
									${['Weary', 'Miserable', 'Frightened', 'Poisoned', 'Prone'].map(cond => {
										const active = c.conditions.includes(cond);
										return `<button class="badge ${active ? 'badge-danger' : 'badge-gold'}" style="cursor:pointer; opacity:${active ? 1 : 0.4}" onclick="window.toggleCondition('${c.id}', '${cond}')">${cond}</button>`;
									}).join("")}
								</div>
							</td>
							<td>
								<button class="btn-lm danger btn-sm" onclick="window.removeCombatant('${c.id}')">✕</button>
							</td>
						</tr>
					`;
				}).join("")}
			</tbody>
		</table>
	`;
}

window.updateCombatInit = function(id, val) {
	const c = combatants.find(x => x.id === id);
	if (!c) return;
	c.init = parseInt(val, 10) || 0;
	sortCombatants();
	renderInitiativeTracker();
};

window.loadPartyIntoCombat = loadPartyIntoCombat;
window.rollAllInitiative = rollAllInitiative;
window.resetCombat = resetCombat;
window.prevTurn = prevTurn;
window.nextTurn = nextTurn;
