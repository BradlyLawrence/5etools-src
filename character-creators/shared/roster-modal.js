/**
 * Character Roster Manager Modal & Switcher UI Component.
 */

import {
	listCharacters,
	getActiveCharacter,
	setActiveCharacter,
	deleteCharacter,
	duplicateCharacter,
	upsertCharacter,
	generateCharacterId,
} from "./roster.js";
import {downloadJson, loadJsonFile} from "./file-io.js";
import {showConfirmModal} from "./ui-modal.js";

/**
 * Open the Character Roster Manager Modal.
 * @param {object} opts
 * @param {string} opts.rosterKey
 * @param {string} opts.fileType
 * @param {() => object} opts.createEmptyFn
 * @param {(character: object, mode: "wizard"|"sheet") => void} opts.onSelect
 * @param {Function} [opts.el]
 */
export function openRosterModal ({
	rosterKey,
	fileType,
	createEmptyFn,
	onSelect,
	el = null,
}) {
	const domEl = el || ((tag, attrs = {}, children = []) => {
		const elem = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs)) {
			if (k === "class") elem.className = v;
			else if (k === "text") elem.textContent = v;
			else if (k === "html") elem.innerHTML = v;
			else if (k.startsWith("on") && typeof v === "function") {
				elem.addEventListener(k.slice(2).toLowerCase(), v);
			} else elem.setAttribute(k, v);
		}
		if (Array.isArray(children)) children.forEach(c => c && elem.append(c));
		else if (children) elem.append(children);
		return elem;
	});

	const backdrop = domEl("div", {class: "cc-modal-backdrop"});
	const modal = domEl("div", {class: "cc-modal cc-roster-modal", style: "max-width: 680px; width: 95vw;"});

	const renderModal = () => {
		modal.innerHTML = "";

		const header = domEl("div", {class: "cc-modal-header", style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"});
		header.append(domEl("h2", {text: "⚔ Character Roster", style: "margin: 0;"}));

		const closeBtn = domEl("button", {
			type: "button",
			class: "cc-btn cc-btn-xs",
			text: "✕",
			onClick: () => backdrop.remove(),
		});
		header.append(closeBtn);
		modal.append(header);

		const actionsRow = domEl("div", {class: "cc-roster-actions", style: "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;"});

		const newBtn = domEl("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: "➕ Create New Character",
			onClick: () => {
				const newChar = createEmptyFn();
				newChar._id = generateCharacterId();
				upsertCharacter(rosterKey, newChar, {mode: "wizard"});
				backdrop.remove();
				onSelect(newChar, "wizard");
			},
		});

		const importBtn = domEl("button", {
			type: "button",
			class: "cc-btn",
			text: "📥 Import JSON File",
			onClick: async () => {
				const json = await loadJsonFile({expectedFileType: fileType});
				if (!json) return;
				try {
					const importedChar = json.character || json;
					importedChar._id = generateCharacterId();
					upsertCharacter(rosterKey, importedChar, {mode: "sheet"});
					backdrop.remove();
					onSelect(importedChar, "sheet");
				} catch (e) {
					alert(`Failed to import character: ${e.message}`);
				}
			},
		});

		actionsRow.append(newBtn, importBtn);
		modal.append(actionsRow);

		const charList = listCharacters(rosterKey);
		const activeChar = getActiveCharacter(rosterKey);

		if (charList.length === 0) {
			modal.append(domEl("p", {class: "cc-muted", text: "No saved characters found. Click “Create New Character” to begin!"}));
		} else {
			const grid = domEl("div", {class: "cc-roster-grid", style: "display: flex; flex-direction: column; gap: 0.75rem; max-height: 55vh; overflow-y: auto; padding-right: 0.25rem;"});

			for (const entry of charList) {
				const isActive = activeChar && activeChar.id === entry.id;
				const card = domEl("div", {
					class: `cc-roster-card ${isActive ? "is-active" : ""}`,
					style: `display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-radius: var(--cc-radius); background: ${isActive ? "var(--cc-bg-elevated)" : "var(--cc-bg)"}; border: 2px solid ${isActive ? "var(--cc-accent)" : "var(--cc-border)"};`,
				});

				// Portrait
				const portraitBox = domEl("div", {
					class: "cc-portrait-frame",
					style: "width: 52px; height: 52px; flex-shrink: 0; cursor: pointer;",
					onClick: () => {
						setActiveCharacter(rosterKey, entry.id);
						backdrop.remove();
						onSelect(entry.character, entry.mode || "sheet");
					},
				});
				if (entry.portrait) {
					portraitBox.append(domEl("img", {class: "cc-portrait-img", src: entry.portrait, alt: entry.name}));
				} else {
					portraitBox.append(domEl("span", {class: "cc-portrait-placeholder", text: "👤", style: "font-size: 1.4rem;"}));
				}
				card.append(portraitBox);

				// Info
				const infoBox = domEl("div", {
					style: "flex: 1; min-width: 0; cursor: pointer;",
					onClick: () => {
						setActiveCharacter(rosterKey, entry.id);
						backdrop.remove();
						onSelect(entry.character, entry.mode || "sheet");
					},
				});
				const titleRow = domEl("div", {style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;"});
				titleRow.append(domEl("strong", {text: entry.name || "Unnamed Hero", style: "font-size: 1.05rem;"}));
				if (isActive) {
					titleRow.append(domEl("span", {class: "cc-badge cc-badge-accent", text: "ACTIVE", style: "font-size: 0.7rem;"}));
				}
				infoBox.append(titleRow);

				const metaSub = domEl("div", {
					class: "cc-muted",
					style: "font-size: 0.85rem; margin-top: 0.2rem;",
					text: `Level ${entry.level} ${entry.cultureOrSpecies || ""} ${entry.className || ""}`.trim(),
				});
				infoBox.append(metaSub);
				card.append(infoBox);

				// Button Actions
				const btnGroup = domEl("div", {style: "display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;"});

				const playBtn = domEl("button", {
					type: "button",
					class: `cc-btn cc-btn-xs ${isActive ? "cc-btn-primary" : ""}`,
					text: isActive ? "✓ Open" : "Select",
					onClick: () => {
						setActiveCharacter(rosterKey, entry.id);
						backdrop.remove();
						onSelect(entry.character, entry.mode || "sheet");
					},
				});

				const cloneBtn = domEl("button", {
					type: "button",
					class: "cc-btn cc-btn-xs",
					text: "📋 Clone",
					title: "Duplicate this character",
					onClick: () => {
						duplicateCharacter(rosterKey, entry.id);
						renderModal();
					},
				});

				const exportBtn = domEl("button", {
					type: "button",
					class: "cc-btn cc-btn-xs",
					text: "💾 JSON",
					title: "Export character JSON file",
					onClick: () => {
						const filename = `${entry.name.toLowerCase().replace(/\s+/g, "-") || "character"}.json`;
						downloadJson(filename, {fileType, character: entry.character});
					},
				});

				const deleteBtn = domEl("button", {
					type: "button",
					class: "cc-btn cc-btn-xs cc-btn-danger",
					text: "🗑",
					title: "Delete character",
					onClick: async () => {
						const confirmed = await showConfirmModal(
							"🗑 Delete Character?",
							`Are you sure you want to permanently delete "${entry.name}"? This action cannot be undone.`,
							{confirmText: "Delete", isDanger: true, el: domEl},
						);
						if (confirmed) {
							const nextActiveId = deleteCharacter(rosterKey, entry.id);
							if (isActive) {
								if (nextActiveId) {
									const next = getActiveCharacter(rosterKey);
									if (next) onSelect(next.character, next.mode || "sheet");
								} else {
									const newChar = createEmptyFn();
									newChar._id = generateCharacterId();
									upsertCharacter(rosterKey, newChar, {mode: "wizard"});
									onSelect(newChar, "wizard");
								}
							}
							renderModal();
						}
					},
				});

				btnGroup.append(playBtn, cloneBtn, exportBtn, deleteBtn);
				card.append(btnGroup);
				grid.append(card);
			}

			modal.append(grid);
		}
	};

	renderModal();
	backdrop.append(modal);

	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});

	document.body.append(backdrop);
}

/**
 * Mount the Character Switcher dropdown / button component in the page header.
 * @param {object} opts
 * @param {string} opts.rosterKey
 * @param {string} opts.fileType
 * @param {() => object} opts.createEmptyFn
 * @param {(character: object, mode: "wizard"|"sheet") => void} opts.onSelect
 * @param {Function} [opts.el]
 * @returns {HTMLElement}
 */
export function mountCharacterSwitcher ({
	rosterKey,
	fileType,
	createEmptyFn,
	onSelect,
	el = null,
}) {
	const domEl = el || ((tag, attrs = {}, children = []) => {
		const elem = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs)) {
			if (k === "class") elem.className = v;
			else if (k === "text") elem.textContent = v;
			else if (k === "html") elem.innerHTML = v;
			else if (k.startsWith("on") && typeof v === "function") {
				elem.addEventListener(k.slice(2).toLowerCase(), v);
			} else elem.setAttribute(k, v);
		}
		if (Array.isArray(children)) children.forEach(c => c && elem.append(c));
		else if (children) elem.append(children);
		return elem;
	});

	const activeChar = getActiveCharacter(rosterKey);
	const charList = listCharacters(rosterKey);
	const count = charList.length;

	const wrap = domEl("div", {class: "cc-character-switcher", style: "display: flex; align-items: center; gap: 0.5rem;"});

	const switcherBtn = domEl("button", {
		type: "button",
		class: "cc-btn cc-btn-switcher",
		style: "display: flex; align-items: center; gap: 0.5rem; font-weight: 600;",
		onClick: () => openRosterModal({rosterKey, fileType, createEmptyFn, onSelect, el: domEl}),
	});

	if (activeChar?.portrait) {
		switcherBtn.append(domEl("img", {
			src: activeChar.portrait,
			style: "width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1px solid var(--cc-accent);",
			alt: "Portrait",
		}));
	} else {
		switcherBtn.append(domEl("span", {text: "👤"}));
	}

	const nameText = activeChar?.name ? activeChar.name : "Heroes";
	switcherBtn.append(domEl("span", {text: `${nameText} (${count}) ▾`}));
	wrap.append(switcherBtn);

	const quickNewBtn = domEl("button", {
		type: "button",
		class: "cc-btn cc-btn-xs",
		text: "➕ New",
		title: "Create a new character",
		onClick: () => {
			const newChar = createEmptyFn();
			newChar._id = generateCharacterId();
			upsertCharacter(rosterKey, newChar, {mode: "wizard"});
			onSelect(newChar, "wizard");
		},
	});
	wrap.append(quickNewBtn);

	return wrap;
}
