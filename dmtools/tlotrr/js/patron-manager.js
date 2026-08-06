/**
 * dmtools/tlotrr/js/patron-manager.js
 * Active Patron management & Fellowship Pool tracker for LOTR RPG.
 */

import { PATRONS, escapeHtml } from "./data.js";
import { getParty } from "./char-importer.js";

let activePatronId = "gandalf";
let fellowshipPool = 4;
let customPatrons = [];

function loadCustomPatrons() {
	try {
		const raw = localStorage.getItem("dmtools/tlotrr/custom_patrons");
		if (raw) {
			customPatrons = JSON.parse(raw);
		}
	} catch (e) {
		console.error("Failed to load custom patrons:", e);
		customPatrons = [];
	}
}

function saveCustomPatrons() {
	try {
		localStorage.setItem("dmtools/tlotrr/custom_patrons", JSON.stringify(customPatrons));
	} catch (e) {
		console.error("Failed to save custom patrons:", e);
	}
}

export function getPatrons() {
	return [...PATRONS, ...customPatrons];
}

export function getActivePatron() {
	const all = getPatrons();
	return all.find(p => p.id === activePatronId) || all[0] || PATRONS[0];
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
	loadCustomPatrons();
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

	const allPatrons = getPatrons();
	const activePatron = getActivePatron();
	const party = getParty();
	const basePool = party.length + (activePatron.fellowshipBonus || 0);

	const isCustom = activePatron.isCustom === true;

	containerEl.innerHTML = `
		<div class="grid-2">
			<!-- Active Patron Card -->
			<div class="lm-card">
				<div class="lm-card-header">
					<div class="lm-card-title">👑 Active Party Patron</div>
					<div style="display:flex; gap:0.4rem; align-items:center;">
						<span class="badge badge-gold">${escapeHtml(activePatron.location)}</span>
						<button class="btn-lm primary btn-sm" onclick="window.openCustomPatronModal()" title="Add a Custom Patron">➕ Custom Patron</button>
					</div>
				</div>

				<div style="display:flex; justify-content:space-between; align-items:flex-start;">
					<div>
						<div style="font-size:1.3rem; font-weight:bold; color:var(--text-gold); font-family:var(--font-title); margin-bottom:0.2rem">
							${escapeHtml(activePatron.name)} ${isCustom ? '<span class="badge" style="font-size:0.65rem; background:rgba(212,175,55,0.2); color:var(--text-gold);">CUSTOM</span>' : ''}
						</div>
						<div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem">
							${escapeHtml(activePatron.title)}
						</div>
					</div>
					${isCustom ? `<button class="btn-lm danger btn-sm" onclick="window.deleteCustomPatron('${activePatron.id}')" title="Delete Custom Patron">🗑️ Delete</button>` : ''}
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
						${allPatrons.map(p => `<option value="${p.id}" ${p.id === activePatronId ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.location)})${p.isCustom ? ' [Custom]' : ''}</option>`).join("")}
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
						Base Pool: ${party.length} (PCs) + ${activePatron.fellowshipBonus || 0} (Patron) = <strong>${basePool}</strong>
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

		<!-- Custom Patron Modal Container -->
		<div id="customPatronModal" class="modal-backdrop" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:9999; display:none; justify-content:center; align-items:center;">
			<div class="lm-card" style="width:90%; max-width:550px; max-height:90vh; overflow-y:auto; background:var(--bg-dark); border:1px solid var(--border-gold);">
				<div class="lm-card-header">
					<div class="lm-card-title">👑 Create Custom Patron</div>
					<button class="btn-lm btn-sm" onclick="window.closeCustomPatronModal()">✕</button>
				</div>
				<form onsubmit="window.saveCustomPatron(event)" style="display:flex; flex-direction:column; gap:0.8rem; margin-top:0.5rem;">
					<div class="form-group">
						<label class="form-label">Patron Name *</label>
						<input type="text" id="patronName" class="form-control" placeholder="e.g. Arwen Undómiel, King Thranduil, Lord Celeborn" required />
					</div>
					<div class="grid-2">
						<div class="form-group">
							<label class="form-label">Title / Role</label>
							<input type="text" id="patronTitle" class="form-control" placeholder="e.g. Lady of Rivendell" />
						</div>
						<div class="form-group">
							<label class="form-label">Location / Refuge</label>
							<input type="text" id="patronLocation" class="form-control" placeholder="e.g. Imladris, Mirkwood" />
						</div>
					</div>
					<div class="form-group">
						<label class="form-label">Patron Advantage *</label>
						<input type="text" id="patronAdvantage" class="form-control" placeholder="e.g. Light of Elbereth (Advantage vs Dread)" required />
					</div>
					<div class="form-group">
						<label class="form-label">Description / Advantage Details *</label>
						<textarea id="patronDesc" class="form-control" rows="3" placeholder="Describe the mechanical perk or counsel granted to the PCs..." required></textarea>
					</div>
					<div class="form-group">
						<label class="form-label">Patron Agenda / Goals</label>
						<input type="text" id="patronAgenda" class="form-control" placeholder="e.g. Protect the ancient borders of Lothlórien." />
					</div>
					<div class="form-group">
						<label class="form-label">Fellowship Bonus (+0 to +3)</label>
						<select id="patronBonus" class="form-control">
							<option value="0">0</option>
							<option value="1" selected>+1 Bonus Point</option>
							<option value="2">+2 Bonus Points</option>
							<option value="3">+3 Bonus Points</option>
						</select>
					</div>
					<div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.5rem;">
						<button type="button" class="btn-lm btn-sm" onclick="window.closeCustomPatronModal()">Cancel</button>
						<button type="submit" class="btn-lm primary btn-sm">Save Custom Patron</button>
					</div>
				</form>
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

window.openCustomPatronModal = function() {
	const modal = document.getElementById("customPatronModal");
	if (modal) modal.style.display = "flex";
};

window.closeCustomPatronModal = function() {
	const modal = document.getElementById("customPatronModal");
	if (modal) modal.style.display = "none";
};

window.saveCustomPatron = function(e) {
	if (e) e.preventDefault();

	const name = document.getElementById("patronName")?.value.trim();
	const title = document.getElementById("patronTitle")?.value.trim() || "Patron of the Free Peoples";
	const location = document.getElementById("patronLocation")?.value.trim() || "Middle-earth";
	const advantage = document.getElementById("patronAdvantage")?.value.trim() || "Custom Counsel";
	const desc = document.getElementById("patronDesc")?.value.trim() || "Provides guidance and refuge.";
	const agenda = document.getElementById("patronAgenda")?.value.trim() || "Aid the company against shadow.";
	const fellowshipBonus = parseInt(document.getElementById("patronBonus")?.value, 10) || 1;

	if (!name) return;

	const newPatron = {
		id: "custom_" + Date.now(),
		name,
		title,
		location,
		advantage,
		desc,
		agenda,
		fellowshipBonus,
		isCustom: true
	};

	customPatrons.push(newPatron);
	saveCustomPatrons();
	activePatronId = newPatron.id;
	savePatronState();
	window.closeCustomPatronModal();
	renderPatronUI();
	updateGlobalHeaderStatus();
};

window.deleteCustomPatron = function(id) {
	if (confirm("Delete this custom patron?")) {
		customPatrons = customPatrons.filter(p => p.id !== id);
		saveCustomPatrons();
		activePatronId = "gandalf";
		savePatronState();
		renderPatronUI();
		updateGlobalHeaderStatus();
	}
};

window.modFellowshipPool = modFellowshipPool;

