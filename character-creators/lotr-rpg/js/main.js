import {DataStore} from "./data.js?v=3.5";
import {
	createEmptyCharacter,
	recomputeCharacter,
	derive,
	STORAGE_KEY,
	importPayload,
	exportPayload,
	FILE_TYPE,
} from "./character.js?v=3.5";
import {loadJsonFile} from "../../shared/file-io.js?v=3.5";
import {
	migrateLegacyRoster,
	getActiveCharacter,
	upsertCharacter,
	generateCharacterId,
} from "../../shared/roster.js?v=3.5";
import {mountCharacterSwitcher} from "../../shared/roster-modal.js?v=3.5";
import {mountWizard} from "./ui/wizard.js?v=3.5";
import {mountSheet} from "./ui/sheet.js?v=3.5";

export const ROSTER_KEY = "character-creators/lotr-rpg/roster";

const app = document.getElementById("app");
const statusEl = document.getElementById("status");

function setStatus (msg, isError = false) {
	if (!statusEl) return;
	statusEl.textContent = msg || "";
	statusEl.classList.toggle("is-error", !!isError);
}

async function main () {
	setStatus("Loading The Lord of the Rings Roleplaying (homebrew)…");
	const data = new DataStore();
	try {
		await data.load();
	} catch (e) {
		console.error(e);
		setStatus(`Failed to load brew: ${e.message}`, true);
		return;
	}
	const customCount = data.races.filter(r => String(r.source).toUpperCase() === "MECULTURES").length;
	setStatus(
		`Loaded ${data.classes.length} callings · ${data.races.length} cultures (${customCount} homebrew) · ${data.backgrounds.length} backgrounds · ${data.feats.length} virtues/crafts · TLotRR + MECultures`,
	);

	// Automatically migrate legacy single-character state into multi-character roster
	migrateLegacyRoster(STORAGE_KEY, ROSTER_KEY, createEmptyCharacter);

	const activeEntry = getActiveCharacter(ROSTER_KEY);
	let character = activeEntry?.character ? importPayload(activeEntry.character) : createEmptyCharacter();
	let mode = activeEntry?.mode || (character.class?.uid ? "sheet" : "wizard");

	if (character.class?.uid) {
		try {
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
				cultureOrSpecies: d.cultureName,
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
			fileType: FILE_TYPE,
			createEmptyFn: createEmptyCharacter,
			onSelect: (selectedChar, selectedMode) => {
				character = importPayload(selectedChar);
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
			loadBtn.textContent = "📥 Import Hero JSON";
			loadBtn.addEventListener("click", async () => {
				const json = await loadJsonFile({expectedFileType: FILE_TYPE});
				if (!json) return;
				try {
					character = importPayload(json);
					character._id = generateCharacterId();
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
				onChange: (c) => { character = c; persist(); },
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
				onChange: (c) => { character = c; persist(); },
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
