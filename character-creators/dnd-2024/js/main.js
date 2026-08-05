import {DataStore} from "./data.js";
import {
	createEmptyCharacter,
	recomputeCharacter,
	STORAGE_KEY,
	importPayload,
	exportPayload,
} from "./character.js";
import {storageGet, storageSet, storageRemove, loadJsonFile, FILE_TYPE_2024} from "../../shared/file-io.js";
import {mountWizard} from "./ui/wizard.js";
import {mountSheet} from "./ui/sheet.js";

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

	const saved = storageGet(STORAGE_KEY);
	let mode = "wizard"; // wizard | sheet
	let character = createEmptyCharacter();

	if (saved?.mode === "sheet" && saved?.character) {
		try {
			character = importPayload(saved.character);
			if (character.sources?.length) data.filterBySources(character.sources);
			recomputeCharacter(character, data);
			mode = "sheet";
		} catch {
			character = createEmptyCharacter();
			mode = "wizard";
		}
	} else if (saved?.character && saved?.mode === "wizard") {
		try {
			character = importPayload(saved.character);
			if (character.sources?.length) data.filterBySources(character.sources);
		} catch {
			character = createEmptyCharacter();
		}
	}

	const persist = () => {
		storageSet(STORAGE_KEY, {
			mode,
			character: exportPayload(character),
		});
	};

	const render = () => {
		app.innerHTML = "";
		const top = document.createElement("div");
		top.className = "cc-top-actions";
		if (mode === "wizard") {
			const loadBtn = document.createElement("button");
			loadBtn.type = "button";
			loadBtn.className = "cc-btn";
			loadBtn.textContent = "Load character JSON";
			loadBtn.addEventListener("click", async () => {
				const json = await loadJsonFile({expectedFileType: FILE_TYPE_2024});
				if (!json) return;
				try {
					character = importPayload(json);
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
					mode = "wizard";
					storageRemove(STORAGE_KEY);
					persist();
					render();
				},
			});
		}
	};

	render();
}

main();
