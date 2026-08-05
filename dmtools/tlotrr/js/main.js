/**
 * dmtools/tlotrr/js/main.js
 * Main entry point and state orchestrator for LOTR RPG Loremaster Suite.
 */

import { loadPartyFromStorage, getParty, parseCharacterJson, addCharacterToParty, removeCharacterFromParty, updatePcResource, renderPartyGridContainer } from "./char-importer.js";
import { initJourneyMap } from "./journey-tracker.js";
import { initEncounterBuilder, searchMonsters } from "./encounter-builder.js";
import { renderInitiativeTracker, loadPartyIntoCombat } from "./initiative-tracker.js";
import { loadPatronState, renderPatronUI } from "./patron-manager.js";
import { loadEyeState, renderEyeUI, updateGlobalEyeStatus } from "./eye-of-mordor.js";
import { renderCouncilUI } from "./council-tracker.js";
import { renderTreasureUI } from "./treasure-gen.js";
import { renderQuickRefUI } from "./quick-ref.js";

document.addEventListener("DOMContentLoaded", async () => {
	// 1. Load persisted states
	loadPartyFromStorage();
	loadPatronState();
	loadEyeState();

	// 2. Initialize UI modules
	renderPartyGrid();
	initJourneyMap("mapContainer", "journeyLog");
	await initEncounterBuilder();
	renderInitiativeTracker();
	renderPatronUI();
	renderEyeUI();
	renderCouncilUI();
	renderTreasureUI();
	renderQuickRefUI();

	updateGlobalEyeStatus();

	// 3. Setup event listeners
	setupTabNavigation();
	setupCharImportDropzone();

	console.log("Lord of the Rings Roleplaying (5e) Loremaster Suite Initialized!");
});

function renderPartyGrid() {
	const el = document.getElementById("partyGridContainer");
	renderPartyGridContainer(el);
}

function setupTabNavigation() {
	const navBtns = document.querySelectorAll(".lm-nav-btn");
	navBtns.forEach(btn => {
		btn.addEventListener("click", () => {
			const targetTab = btn.getAttribute("data-tab");
			switchLmTab(targetTab);
		});
	});
}

export function switchLmTab(tabId) {
	document.querySelectorAll(".lm-nav-btn").forEach(b => {
		if (b.getAttribute("data-tab") === tabId) b.classList.add("active");
		else b.classList.remove("active");
	});

	document.querySelectorAll(".tab-pane").forEach(pane => {
		if (pane.id === `tab-${tabId}`) pane.classList.add("active");
		else pane.classList.remove("active");
	});
}

window.switchLmTab = switchLmTab;

function setupCharImportDropzone() {
	const fileInput = document.getElementById("charFileInput");
	if (!fileInput) return;

	fileInput.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const jsonObj = JSON.parse(evt.target.result);
				const pc = parseCharacterJson(jsonObj);
				addCharacterToParty(pc);
				renderPartyGrid();
				alert(`Successfully imported ${pc.name} (${pc.culture} ${pc.calling})!`);
			} catch (err) {
				alert("Error parsing character file: " + err.message);
			}
		};
		reader.readAsText(file);
	});
}

window.modPcResource = function(id, key, delta) {
	updatePcResource(id, key, delta);
	renderPartyGrid();
};

window.updatePcRole = function(id, role) {
	updatePcResource(id, "travelRole", role);
	renderPartyGrid();
};

window.removePc = function(id) {
	if (confirm("Remove character from Fellowship?")) {
		removeCharacterFromParty(id);
		renderPartyGrid();
	}
};

window.onSearchMonsters = function(query) {
	searchMonsters(query);
};
