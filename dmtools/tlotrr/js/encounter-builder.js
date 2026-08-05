/**
 * dmtools/tlotrr/js/encounter-builder.js
 * Adversary search, CR/XP calculation, and encounter creation for LOTR RPG.
 */

import { getLotrAdversaries, load5eBestiary, escapeHtml } from "./data.js";
import { getParty } from "./char-importer.js";
import { addCombatantsToTracker } from "./initiative-tracker.js";

let allMonsters = [];
let currentEncounter = [];

export async function initEncounterBuilder() {
	const lotrList = await getLotrAdversaries();
	const mmList = await load5eBestiary();
	allMonsters = [...lotrList, ...mmList];
	renderMonsterSearch("");
	renderCurrentEncounter();
}

export function searchMonsters(query) {
	renderMonsterSearch(query || "");
}

function renderMonsterSearch(query) {
	const resultsEl = document.getElementById("monsterSearchResults");
	if (!resultsEl) return;

	const q = (query || "").toLowerCase().trim();
	const filtered = allMonsters.filter(m => 
		m.name.toLowerCase().includes(q) || 
		m.type.toLowerCase().includes(q) ||
		m.source.toLowerCase().includes(q)
	).slice(0, 30);

	if (filtered.length === 0) {
		resultsEl.innerHTML = `<div style="color:var(--text-muted); padding:0.5rem;">No adversaries found matching "${escapeHtml(query)}"</div>`;
		return;
	}

	resultsEl.innerHTML = filtered.map(m => `
		<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); border:1px solid var(--border-light)">
			<div>
				<span style="font-weight:bold; color:${m.isLotr ? 'var(--text-gold)' : 'var(--text-primary)'}">${escapeHtml(m.name)}</span>
				<span class="badge ${m.isLotr ? 'badge-gold' : 'badge-blue'}" style="margin-left:0.4rem">${m.source}</span>
				<div style="font-size:0.75rem; color:var(--text-muted)">CR ${m.cr} · ${escapeHtml(m.type)} · HP ${m.hp} · AC ${m.ac} ${m.hate ? '· Hate ' + m.hate : ''}</div>
			</div>
			<button class="btn-lm btn-sm primary" onclick="window.addMonsterToEncounter('${escapeHtml(m.name)}', '${m.source}')">+ Add</button>
		</div>
	`).join("");
}

window.addMonsterToEncounter = function(name, source) {
	const target = allMonsters.find(m => m.name === name && m.source === source);
	if (!target) return;

	const existing = currentEncounter.find(e => e.name === name && e.source === source);
	if (existing) {
		existing.count++;
	} else {
		currentEncounter.push({
			...target,
			count: 1
		});
	}
	renderCurrentEncounter();
};

window.modEncounterCount = function(index, delta) {
	if (!currentEncounter[index]) return;
	currentEncounter[index].count += delta;
	if (currentEncounter[index].count <= 0) {
		currentEncounter.splice(index, 1);
	}
	renderCurrentEncounter();
};

function renderCurrentEncounter() {
	const listEl = document.getElementById("encounterList");
	const summaryEl = document.getElementById("encounterSummary");
	if (!listEl) return;

	if (currentEncounter.length === 0) {
		listEl.innerHTML = `<div style="color:var(--text-muted); padding:1rem; text-align:center;">No creatures added to encounter. Search and add adversaries above!</div>`;
		if (summaryEl) summaryEl.innerHTML = "";
		return;
	}

	listEl.innerHTML = currentEncounter.map((e, idx) => `
		<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:0.5rem 0.75rem; border-radius:var(--radius-md); border-left:3px solid var(--border-gold)">
			<div>
				<span style="font-weight:bold; color:var(--text-gold)">${escapeHtml(e.name)}</span>
				<div style="font-size:0.75rem; color:var(--text-muted)">CR ${e.cr} · HP ${e.hp} · AC ${e.ac}</div>
			</div>
			<div class="resource-controls">
				<button class="btn-ctrl" onclick="window.modEncounterCount(${idx}, -1)">-</button>
				<span style="font-weight:bold; font-size:0.95rem; margin:0 0.2rem;">${e.count}</span>
				<button class="btn-ctrl" onclick="window.modEncounterCount(${idx}, 1)">+</button>
			</div>
		</div>
	`).join("");

	// Summary stats
	let totalMonsters = 0;
	currentEncounter.forEach(e => totalMonsters += e.count);

	if (summaryEl) {
		summaryEl.innerHTML = `
			<div style="display:flex; justify-content:space-between; align-items:center;">
				<div style="font-family:var(--font-title); color:var(--text-gold); font-size:0.95rem;">
					Total Adversaries: <strong>${totalMonsters}</strong>
				</div>
				<button class="btn-lm primary" onclick="window.sendEncounterToTracker()">
					⚔️ Send to Initiative Tracker
				</button>
			</div>
		`;
	}
}

window.sendEncounterToTracker = function() {
	if (currentEncounter.length === 0) return;

	const combatants = [];
	currentEncounter.forEach(e => {
		for (let i = 1; i <= e.count; i++) {
			const label = e.count > 1 ? `${e.name} #${i}` : e.name;
			combatants.push({
				id: "enemy_" + Date.now() + "_" + Math.floor(Math.random()*1000),
				name: label,
				isPc: false,
				ac: e.ac,
				hp: e.hp,
				maxHp: e.hp,
				tempHp: 0,
				hate: e.hate || 0,
				init: Math.floor(Math.random() * 20) + 1,
				conditions: []
			});
		}
	});

	addCombatantsToTracker(combatants);
	// Switch tab to initiative
	if (window.switchLmTab) {
		window.switchLmTab("initiative");
	}
};
