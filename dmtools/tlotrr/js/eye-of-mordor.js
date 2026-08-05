/**
 * dmtools/tlotrr/js/eye-of-mordor.js
 * Tracks Eye Awareness score, The Hunt rolls, and Revelation Thresholds for LOTR RPG.
 */

import { getParty } from "./char-importer.js";

let eyeAwareness = 0;
let huntThreshold = 14; // Base threshold for Revelation
let huntHistory = [];

export function getEyeAwareness() {
	return eyeAwareness;
}

export function setEyeAwareness(val) {
	eyeAwareness = Math.max(0, val);
	saveEyeState();
	renderEyeUI();
	updateGlobalEyeStatus();
}

export function addEyeAwareness(delta) {
	setEyeAwareness(eyeAwareness + delta);
}

function saveEyeState() {
	try {
		localStorage.setItem("dmtools/tlotrr/eye", JSON.stringify({ eyeAwareness, huntThreshold, huntHistory }));
	} catch (e) {
		console.error("Failed to save Eye state:", e);
	}
}

export function loadEyeState() {
	try {
		const raw = localStorage.getItem("dmtools/tlotrr/eye");
		if (raw) {
			const parsed = JSON.parse(raw);
			eyeAwareness = parsed.eyeAwareness || 0;
			huntThreshold = parsed.huntThreshold || 14;
			huntHistory = parsed.huntHistory || [];
		}
	} catch (e) {
		console.error("Failed to load Eye state:", e);
	}
}

export function renderEyeUI() {
	const containerEl = document.getElementById("eyeUIContainer");
	if (!containerEl) return;

	const isDanger = eyeAwareness >= huntThreshold;

	containerEl.innerHTML = `
		<div class="grid-2">
			<!-- Eye Awareness Gauge -->
			<div class="lm-card" style="${isDanger ? 'border-color:var(--text-danger); background:rgba(139,30,36,0.15)' : ''}">
				<div class="lm-card-header">
					<div class="lm-card-title">👁️ The Eye of Mordor</div>
					<span class="badge ${isDanger ? 'badge-danger' : 'badge-gold'}">${isDanger ? 'REVELATION WARNING' : 'HUNT ACTIVE'}</span>
				</div>

				<div style="text-align:center; padding:1rem;">
					<div style="font-size:0.8rem; font-family:var(--font-title); color:var(--text-muted);">EYE AWARENESS SCORE</div>
					<div style="font-size:3.2rem; font-family:var(--font-title); font-weight:bold; color:${isDanger ? 'var(--text-danger)' : 'var(--text-gold)'}">
						${eyeAwareness}
					</div>
					<div style="font-size:0.85rem; color:var(--text-muted)">
						Revelation Threshold: <strong>${huntThreshold}</strong>
					</div>

					<div style="display:flex; justify-content:center; gap:0.5rem; margin-top:1rem;">
						<button class="btn-lm btn-sm" onclick="window.modEyeAwareness(-1)">-1 Score</button>
						<button class="btn-lm btn-sm" onclick="window.modEyeAwareness(1)">+1 Score</button>
						<button class="btn-lm danger btn-sm" onclick="window.modEyeAwareness(2)">+2 Spies/Shadow</button>
						<button class="btn-lm btn-sm" onclick="window.resetEyeAwareness()">Reset</button>
					</div>
				</div>

				<div style="margin-top:1rem;">
					<button class="btn-lm primary" style="width:100%" onclick="window.rollTheHunt()">
						🎲 Roll "The Hunt" (Test for Revelation)
					</button>
				</div>
			</div>

			<!-- Hunt Log & Rules -->
			<div class="lm-card">
				<div class="lm-card-header">
					<div class="lm-card-title">📜 The Hunt Rules & History</div>
				</div>

				<div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem">
					<strong>How Eye Awareness Works:</strong>
					<ul style="padding-left:1.2rem; margin-top:0.3rem">
						<li>Increases when PCs gain Shadow Points, use high magic, or fail Scout checks.</li>
						<li>When Eye Awareness ≥ Revelation Threshold (<strong>${huntThreshold}</strong>), dark scouts or Nazgûl hunt the company!</li>
					</ul>
				</div>

				<h4 style="color:var(--text-gold); font-size:0.9rem; margin-bottom:0.4rem">Hunt History Log</h4>
				<div class="event-log" id="huntLog">
					${huntHistory.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8rem">No Hunt rolls performed yet.</div>' : huntHistory.join("")}
				</div>
			</div>
		</div>
	`;
}

export function updateGlobalEyeStatus() {
	const eyeValEl = document.getElementById("hdrEyeVal");
	const eyeItemEl = document.getElementById("hdrEyeItem");
	if (eyeValEl) eyeValEl.textContent = eyeAwareness;
	if (eyeItemEl) {
		if (eyeAwareness >= huntThreshold) {
			eyeItemEl.classList.add("eye-danger");
		} else {
			eyeItemEl.classList.remove("eye-danger");
		}
	}
}

window.modEyeAwareness = function(delta) {
	addEyeAwareness(delta);
};

window.resetEyeAwareness = function() {
	const party = getParty();
	const baseAwareness = Math.max(0, party.length);
	setEyeAwareness(baseAwareness);
};

window.rollTheHunt = function() {
	const roll = Math.floor(Math.random() * 20) + 1;
	const total = roll + eyeAwareness;
	const isRevealed = total >= 20 || eyeAwareness >= huntThreshold;

	const entry = `
		<div class="event-entry" style="${isRevealed ? 'border-color:var(--text-danger)' : ''}">
			<div class="time">${new Date().toLocaleTimeString()} · d20 Roll: ${roll} + Eye (${eyeAwareness}) = Total ${total}</div>
			<div style="font-weight:bold; color:${isRevealed ? 'var(--text-danger)' : 'var(--text-success)'}">
				${isRevealed ? '👁️ REVELATION! The Enemy has detected the company!' : '🌿 SAFE. The shadows pass without discovering the company.'}
			</div>
			${isRevealed ? '<div style="font-size:0.8rem; color:var(--text-muted)">An ambush, Orc patrol, or Nazgûl shadow approaches!</div>' : ''}
		</div>
	`;

	huntHistory.unshift(entry);
	saveEyeState();
	renderEyeUI();
};
