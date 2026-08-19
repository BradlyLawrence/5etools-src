import {DataStore} from "./data.js?v=2.1";
import {
	createEmptyCharacter,
	recomputeCharacter,
	derive,
	STORAGE_KEY,
	importPayload,
	exportPayload,
} from "./character.js?v=2.1";
import {loadJsonFile, FILE_TYPE_2024} from "../../shared/file-io.js?v=2.1";
import {
	migrateLegacyRoster,
	getActiveCharacter,
	upsertCharacter,
	generateCharacterId,
} from "../../shared/roster.js?v=2.1";
import {mountCharacterSwitcher} from "../../shared/roster-modal.js?v=2.1";
import {mountWizard} from "./ui/wizard.js?v=2.1";
import {mountSheet} from "./ui/sheet.js?v=2.1";

export const ROSTER_KEY = "character-creators/dnd-2024/roster";

const app = document.getElementById("app");
const statusEl = document.getElementById("status");

function setStatus (msg, isError = false) {
	if (!statusEl) return;
	statusEl.textContent = msg || "";
	statusEl.classList.toggle("is-error", !!isError);
}

async function main () {
	setStatus("Loading 5etools data…");
	const data = new DataStore();
	try {
		await data.load();
	} catch (e) {
		console.error(e);
		setStatus(`Failed to load data: ${e.message}. Is the server running from the repo root?`, true);
		return;
	}
	setStatus(`Loaded ${data.classes.length} classes · ${data.species.length} species · ${data.backgrounds.length} backgrounds · ${data.feats.length} feats · ${data.spells.length} spells`);

	// Automatically migrate legacy single-character state into multi-character roster
	migrateLegacyRoster(STORAGE_KEY, ROSTER_KEY, createEmptyCharacter);

	const activeEntry = getActiveCharacter(ROSTER_KEY);
	let character = activeEntry?.character ? importPayload(activeEntry.character) : createEmptyCharacter();
	let mode = activeEntry?.mode || (character.class?.uid ? "sheet" : "wizard");

	if (character.class?.uid) {
		try {
			if (character.sources?.length) data.filterBySources(character.sources);
			recomputeCharacter(character, data);
		} catch (e) {
			console.warn("Character recomputation warning", e);
		}
	}

	const persist = () => {
		try {
			const d = derive(character, data);
			upsertCharacter(ROSTER_KEY, exportPayload(character), {
				mode,
				className: d.className,
				cultureOrSpecies: d.speciesName,
			});
		} catch {
			upsertCharacter(ROSTER_KEY, exportPayload(character), {mode});
		}
	};

	const render = () => {
		app.innerHTML = "";
		const top = document.createElement("div");
		top.className = "cc-top-actions";
		top.style.display = "flex";
		top.style.justifyContent = "space-between";
		top.style.alignItems = "center";
		top.style.flexWrap = "wrap";
		top.style.gap = "0.75rem";
		top.style.marginBottom = "1rem";

		// Left side: Character Switcher & Roster Manager
		const switcher = mountCharacterSwitcher({
			rosterKey: ROSTER_KEY,
			fileType: FILE_TYPE_2024,
			createEmptyFn: createEmptyCharacter,
			onSelect: (selectedChar, selectedMode) => {
				character = importPayload(selectedChar);
				if (character.sources?.length) data.filterBySources(character.sources);
				if (character.class?.uid) {
					recomputeCharacter(character, data);
				}
				mode = selectedMode;
				render();
			},
		});
		top.append(switcher);

		// Right side: Import JSON button
		if (mode === "wizard") {
			const loadBtn = document.createElement("button");
			loadBtn.type = "button";
			loadBtn.className = "cc-btn";
			loadBtn.textContent = "📥 Import Character JSON";
			loadBtn.addEventListener("click", async () => {
				const json = await loadJsonFile({expectedFileType: FILE_TYPE_2024});
				if (!json) return;
				try {
					character = importPayload(json);
					character._id = generateCharacterId();
					if (character.sources?.length) data.filterBySources(character.sources);
					recomputeCharacter(character, data);
					mode = "sheet";
					persist();
					render();
				} catch (e) {
					alert(e.message);
				}
			});
			top.append(loadBtn);
		}
		app.append(top);

		const mount = document.createElement("div");
		mount.id = "cc-mount";
		app.append(mount);

		if (mode === "wizard") {
			mountWizard(mount, {
				data,
				character,
				onChange: (c) => {
					character = c;
					persist();
				},
				onComplete: (c) => {
					character = c;
					mode = "sheet";
					persist();
					render();
				},
			});
		} else {
			mountSheet(mount, {
				data,
				character,
				onChange: (c) => {
					character = c;
					persist();
				},
				onNew: () => {
					character = createEmptyCharacter();
					character._id = generateCharacterId();
					mode = "wizard";
					persist();
					render();
				},
			});
		}
	};

	render();
}

main();
