/**
 * dmtools/tlotrr/js/council-tracker.js
 * Council & Social Encounter Manager for LOTR RPG.
 */

import { escapeHtml } from "./data.js";

let councilState = {
	title: "Council with Elrond",
	attitude: "Open", // Hostile, Reluctant, Open, Friendly
	resistance: 3,
	successes: 0,
	failures: 0,
	checksLog: []
};

export function renderCouncilUI() {
	const containerEl = document.getElementById("councilUIContainer");
	if (!containerEl) return;

	const isFinished = (councilState.successes >= councilState.resistance) || (councilState.failures >= 3);
	let outcomeText = "";
	if (councilState.successes >= councilState.resistance) {
		outcomeText = `<span style="color:var(--text-success); font-weight:bold;">VICTORY: The Council is won! Full support granted.</span>`;
	} else if (councilState.failures >= 3) {
		outcomeText = `<span style="color:var(--text-danger); font-weight:bold;">FAILURE: The audience ends in dismissal or cold refusal.</span>`;
	}

	containerEl.innerHTML = `
		<div class="lm-card">
			<div class="lm-card-header">
				<div class="lm-card-title">🗣️ Council & Social Encounter Manager</div>
				<span class="badge badge-gold">${councilState.attitude} Attitude</span>
			</div>

			<div class="grid-3" style="margin-bottom:1rem;">
				<div class="form-group">
					<label class="form-label">Council Title</label>
					<input type="text" class="form-control" value="${escapeHtml(councilState.title)}" onchange="window.updateCouncilField('title', this.value)" />
				</div>
				<div class="form-group">
					<label class="form-label">Attitude</label>
					<select class="form-control" onchange="window.updateCouncilField('attitude', this.value)">
						<option value="Hostile" ${councilState.attitude==='Hostile'?'selected':''}>Hostile (Resistance +2)</option>
						<option value="Reluctant" ${councilState.attitude==='Reluctant'?'selected':''}>Reluctant (Resistance +1)</option>
						<option value="Open" ${councilState.attitude==='Open'?'selected':''}>Open (Standard)</option>
						<option value="Friendly" ${councilState.attitude==='Friendly'?'selected':''}>Friendly (Resistance -1)</option>
					</select>
				</div>
				<div class="form-group">
					<label class="form-label">Resistance Threshold</label>
					<input type="number" class="form-control" value="${councilState.resistance}" min="1" max="10" onchange="window.updateCouncilField('resistance', parseInt(this.value, 10))" />
				</div>
			</div>

			<div style="display:flex; justify-content:space-around; align-items:center; background:rgba(0,0,0,0.3); padding:0.8rem; border-radius:var(--radius-md); margin-bottom:1rem">
				<div style="text-align:center">
					<div style="font-size:0.75rem; font-family:var(--font-title); color:var(--text-success)">SUCCESSES</div>
					<div style="font-size:1.8rem; font-family:var(--font-title); font-weight:bold; color:var(--text-success)">${councilState.successes} / ${councilState.resistance}</div>
				</div>
				<div style="text-align:center">
					<div style="font-size:0.75rem; font-family:var(--font-title); color:var(--text-danger)">FAILURES</div>
					<div style="font-size:1.8rem; font-family:var(--font-title); font-weight:bold; color:var(--text-danger)">${councilState.failures} / 3</div>
				</div>
			</div>

			${isFinished ? `<div style="text-align:center; padding:0.6rem; background:rgba(0,0,0,0.4); border-radius:var(--radius-sm); margin-bottom:1rem;">${outcomeText}</div>` : ''}

			<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem">
				<button class="btn-lm primary" onclick="window.addCouncilCheck(true)">+ Add Skill Success</button>
				<button class="btn-lm danger" onclick="window.addCouncilCheck(false)">+ Add Skill Failure</button>
				<button class="btn-lm btn-sm" onclick="window.resetCouncil()">Reset Council</button>
			</div>

			<h4 style="color:var(--text-gold); font-size:0.9rem; margin-bottom:0.4rem">Council Proceedings Log</h4>
			<div class="event-log">
				${councilState.checksLog.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem">No skill checks recorded in this council yet.</div>' : councilState.checksLog.map(c => `
					<div class="event-entry" style="${c.success ? 'border-color:var(--text-success)' : 'border-color:var(--text-danger)'}">
						<div class="time">${c.time}</div>
						<div style="font-weight:bold; color:${c.success ? 'var(--text-success)' : 'var(--text-danger)'}">
							${c.success ? '✓ SUCCESS' : '✕ FAILURE'}
						</div>
					</div>
				`).join("")}
			</div>
		</div>
	`;
}

window.updateCouncilField = function(key, val) {
	councilState[key] = val;
	renderCouncilUI();
};

window.addCouncilCheck = function(success) {
	if (success) {
		councilState.successes++;
	} else {
		councilState.failures++;
	}
	councilState.checksLog.unshift({
		time: new Date().toLocaleTimeString(),
		success
	});
	renderCouncilUI();
};

window.resetCouncil = function() {
	councilState.successes = 0;
	councilState.failures = 0;
	councilState.checksLog = [];
	renderCouncilUI();
};
