/**
 * dmtools/tlotrr/js/patron-manager.js
 * Active Patron management & Fellowship Pool tracker for LOTR RPG.
 */

import { PATRONS, escapeHtml } from "./data.js";
import { getParty } from "./char-importer.js";

let activePatronId = "gandalf";
let fellowshipPool = 4;

export function getActivePatron() {
	return PATRONS.find(p => p.id === activePatronId) || PATRONS[0];
}

export function setActivePatron(id) {
	activePatronId = id;
	savePatronState();
	renderPatronUI();
	updateGlobalHeaderStatus();
}

export function getFellowshipPool() {
	return fellowshipPool;
}

export function modFellowshipPool(delta) {
	fellowshipPool = Math.max(0, fellowshipPool + delta);
	savePatronState();
	renderPatronUI();
	updateGlobalHeaderStatus();
}

function savePatronState() {
	try {
		localStorage.setItem("dmtools/tlotrr/patron", JSON.stringify({ activePatronId, fellowshipPool }));
	} catch (e) {
		console.error("Failed to save patron state:", e);
	}
}

export function loadPatronState() {
	try {
		const raw = localStorage.getItem("dmtools/tlotrr/patron");
		if (raw) {
			const parsed = JSON.parse(raw);
			activePatronId = parsed.activePatronId || "gandalf";
			fellowshipPool = parsed.fellowshipPool !== undefined ? parsed.fellowshipPool : 4;
		}
	} catch (e) {
		console.error("Failed to load patron state:", e);
	}
}

export function renderPatronUI() {
	const containerEl = document.getElementById("patronUIContainer");
	if (!containerEl) return;

	const activePatron = getActivePatron();
	const party = getParty();
	const basePool = party.length + (activePatron.fellowshipBonus || 0);

	containerEl.innerHTML = `
		<div class="grid-2">
			<!-- Active Patron Card -->
			<div class="lm-card">
				<div class="lm-card-header">
					<div class="lm-card-title">👑 Active Party Patron</div>
					<span class="badge badge-gold">${escapeHtml(activePatron.location)}</span>
				</div>

				<div style="font-size:1.3rem; font-weight:bold; color:var(--text-gold); font-family:var(--font-title); margin-bottom:0.2rem">
					${escapeHtml(activePatron.name)}
				</div>
				<div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem">
					${escapeHtml(activePatron.title)}
				</div>

				<div style="background:rgba(0,0,0,0.3); border-left:3px solid var(--accent-gold); padding:0.6rem; border-radius:var(--radius-sm); margin-bottom:0.8rem">
					<div style="font-weight:bold; color:var(--text-gold); font-size:0.9rem">Patron Advantage: ${escapeHtml(activePatron.advantage)}</div>
					<div style="font-size:0.85rem; color:var(--text-primary); margin-top:0.2rem">${escapeHtml(activePatron.desc)}</div>
				</div>

				<div style="font-size:0.85rem; margin-bottom:1rem">
					<strong>Patron Agenda:</strong> <span style="color:var(--text-muted);">${escapeHtml(activePatron.agenda)}</span>
				</div>

				<div class="form-group">
					<label class="form-label">Switch Active Patron</label>
					<select class="form-control" onchange="window.onPatronSelect(this.value)">
						${PATRONS.map(p => `<option value="${p.id}" ${p.id === activePatronId ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.location)})</option>`).join("")}
					</select>
				</div>
			</div>

			<!-- Fellowship Pool & Safe Haven -->
			<div class="lm-card">
				<div class="lm-card-header">
					<div class="lm-card-title">🕊️ Fellowship Pool & Downtime</div>
				</div>

				<div style="text-align:center; padding:1rem; background:rgba(43,92,143,0.15); border:1px solid rgba(43,92,143,0.4); border-radius:var(--radius-md); margin-bottom:1rem">
					<div style="font-size:0.75rem; font-family:var(--font-title); color:#74c0fc">FELLOWSHIP POOL</div>
					<div style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:0.3rem">
						<button class="btn-lm btn-sm" onclick="window.modFellowshipPool(-1)">-</button>
						<span style="font-size:2rem; font-family:var(--font-title); font-weight:bold; color:#74c0fc">${fellowshipPool}</span>
						<button class="btn-lm btn-sm" onclick="window.modFellowshipPool(1)">+</button>
					</div>
					<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem">
						Base Pool: ${party.length} (PCs) + ${activePatron.fellowshipBonus} (Patron) = <strong>${basePool}</strong>
					</div>
				</div>

				<h4 style="color:var(--text-gold); font-size:0.95rem; margin-bottom:0.4rem">Fellowship Undertakings</h4>
				<ul style="font-size:0.85rem; color:var(--text-muted); padding-left:1.2rem; display:flex; flex-direction:column; gap:0.3rem">
					<li><strong>Heal Shadow:</strong> Spend time at a Safe Haven to convert temporary Shadow to permanent or clear it.</li>
					<li><strong>Meet Patron:</strong> Gain advice, local rumours, and +1 Fellowship Pool point.</li>
					<li><strong>Study Lore:</strong> Gain advantage on future History/Lore checks for a region.</li>
					<li><strong>Raise Standing:</strong> Gain prestige with a culture or realm.</li>
				</ul>
			</div>
		</div>
	`;
}

function updateGlobalHeaderStatus() {
	const patronEl = document.getElementById("hdrPatronVal");
	const poolEl = document.getElementById("hdrFellowshipVal");
	const active = getActivePatron();
	if (patronEl) patronEl.textContent = active.name.split(",")[0];
	if (poolEl) poolEl.textContent = fellowshipPool;
}

window.onPatronSelect = function(id) {
	setActivePatron(id);
};

window.modFellowshipPool = modFellowshipPool;
