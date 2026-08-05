import {
	entityUid,
	cantripSlotsAt,
	preparedSlotsAt,
	knownSlotsAt,
	derive,
} from "../character.js";
import {maxCastableSpellLevel} from "../rules-2024.js";
import {el, clear} from "./pickers.js";

/**
 * Modal: full class spell list with checkboxes to prepare / unprepare / learn.
 * @param {object} character
 * @param {import('../data.js').DataStore} data
 * @param {(c: object) => void} onSave
 */
export function openSpellManager (character, data, onSave) {
	const cls = data.getClass(character.class.uid);
	if (!cls) {
		alert("No class selected.");
		return;
	}

	const level = character.level || 1;
	const d = derive(character, data);
	const maxCantrips = cantripSlotsAt(cls, level) || 0;
	const maxPrepared = preparedSlotsAt(cls, level) || 0;
	const maxKnown = knownSlotsAt(cls, level) || 0;
	const isPreparedCaster = maxPrepared > 0;
	const isKnownCaster = maxKnown > 0 && !isPreparedCaster;
	// Highest level this character can cast *now* (from slots / progression)
	let maxSpellLevel = d.maxSpellLevel ?? maxCastableSpellLevel(cls, level);
	// If they can prepare/know spells but slots table is empty, still show L1 list
	if (maxSpellLevel < 1 && (maxPrepared > 0 || maxKnown > 0)) maxSpellLevel = 1;

	const state = {
		cantrips: new Set(character.spells.cantrips || []),
		prepared: new Set(character.spells.prepared || []),
		known: new Set(character.spells.known || []),
		filter: "",
		levelTab: "all", // all | 0 | 1 | ...
	};

	// Full class list for browsing; UI filters by castable level
	const allSpells = data.spellsForClass(cls.name, {maxLevel: 9});

	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-modal-wide"});
	modal.append(el("h2", {text: `Spells — ${cls.name}`}));

	const summary = el("p", {class: "cc-spell-summary"});
	const search = el("input", {
		class: "cc-input",
		type: "search",
		placeholder: "Filter spells…",
	});
	search.addEventListener("input", () => {
		state.filter = search.value.trim().toLowerCase();
		renderList();
	});

	const tabs = el("div", {class: "cc-btn-row cc-spell-tabs"});
	const listHost = el("div", {class: "cc-spell-list-host"});

	const rebuildTabs = () => {
		clear(tabs);
		const levels = ["all"];
		if (maxCantrips > 0 || allSpells.some(s => s.level === 0)) levels.push(0);
		for (let i = 1; i <= maxSpellLevel; i++) levels.push(i);
		for (const lv of levels) {
			const label = lv === "all" ? "All" : lv === 0 ? "Cantrips" : `Level ${lv}`;
			tabs.append(el("button", {
				type: "button",
				class: `cc-btn ${state.levelTab === lv || String(state.levelTab) === String(lv) ? "cc-btn-primary" : ""}`,
				text: label,
				onClick: () => {
					state.levelTab = lv;
					rebuildTabs();
					renderList();
				},
			}));
		}
	};

	const updateSummary = () => {
		const parts = [];
		if (maxCantrips) parts.push(`Cantrips ${state.cantrips.size}/${maxCantrips}`);
		if (isPreparedCaster) parts.push(`Prepared ${state.prepared.size}/${maxPrepared}`);
		if (isKnownCaster) parts.push(`Known ${state.known.size}/${maxKnown}`);
		if (d.spellSaveDc != null) parts.push(`Save DC ${d.spellSaveDc}`);
		if (d.slots) {
			const slotStr = d.slots.map((n, i) => n ? `L${i + 1}:${n}` : null).filter(Boolean).join(" · ");
			if (slotStr) parts.push(`Slots ${slotStr}`);
		}
		if (d.pact) parts.push(`Pact ${d.pact.slots}×L${d.pact.slotLevel}`);
		summary.textContent = parts.join(" · ") || "No spell slots";
	};

	const renderList = () => {
		clear(listHost);
		updateSummary();

		let spells = allSpells.filter(s => s.level === 0 || s.level <= maxSpellLevel);
		if (state.levelTab !== "all") {
			const lv = Number(state.levelTab);
			spells = spells.filter(s => s.level === lv);
		}
		if (state.filter) {
			spells = spells.filter(s => s.name.toLowerCase().includes(state.filter)
				|| String(s.school || "").toLowerCase().includes(state.filter));
		}

		if (!spells.length) {
			listHost.append(el("p", {class: "cc-muted", text: "No spells match."}));
			return;
		}

		// Group by level
		const byLevel = new Map();
		for (const sp of spells) {
			if (!byLevel.has(sp.level)) byLevel.set(sp.level, []);
			byLevel.get(sp.level).push(sp);
		}

		for (const [lv, list] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
			listHost.append(el("h3", {
				class: "cc-spell-level-head",
				text: lv === 0 ? "Cantrips" : `Level ${lv}`,
			}));
			const ul = el("div", {class: "cc-spell-grid"});
			for (const sp of list) {
				const uid = entityUid(sp);
				const isCantrip = sp.level === 0;
				const set = isCantrip
					? state.cantrips
					: isPreparedCaster
						? state.prepared
						: isKnownCaster
							? state.known
							: state.prepared; // fallback
				const max = isCantrip
					? maxCantrips
					: isPreparedCaster
						? maxPrepared
						: isKnownCaster
							? maxKnown
							: 99;

				const id = `sp-${uid.replace(/\W+/g, "_")}`;
				const lab = el("label", {class: "cc-spell-row", for: id});
				const input = el("input", {type: "checkbox", id});
				input.checked = set.has(uid);
				input.addEventListener("change", () => {
					if (input.checked) {
						if (set.size >= max && max > 0) {
							input.checked = false;
							alert(isCantrip
								? `You can only have ${max} cantrips.`
								: isPreparedCaster
									? `You can only prepare ${max} spells.`
									: `You can only know ${max} spells.`);
							return;
						}
						set.add(uid);
					} else {
						set.delete(uid);
					}
					updateSummary();
				});
				const school = sp.school ? ` · ${String(sp.school).toUpperCase()}` : "";
				lab.append(
					input,
					el("span", {class: "cc-spell-name", text: sp.name}),
					el("span", {class: "cc-spell-meta", text: school}),
				);
				ul.append(lab);
			}
			listHost.append(ul);
		}
	};

	const help = el("p", {
		class: "cc-muted",
		text: isPreparedCaster
			? `Check spells to prepare them (up to level ${maxSpellLevel}). ${maxPrepared} prepared max at your level. Change anytime (long rest).`
			: isKnownCaster
				? `Check spells you know (up to level ${maxSpellLevel}). ${maxKnown} known max.`
				: maxCantrips
					? "Manage cantrips known."
					: maxSpellLevel > 0
						? `Showing spells up to level ${maxSpellLevel}.`
						: "No castable spell levels at this character level yet — level up to gain slots.",
	});

	modal.append(summary, help, search, tabs, listHost);

	const actions = el("div", {class: "cc-wizard-footer"});
	actions.append(el("button", {
		type: "button",
		class: "cc-btn",
		text: "Cancel",
		onClick: () => backdrop.remove(),
	}));
	actions.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Save spell list",
		onClick: () => {
			character.spells.cantrips = [...state.cantrips];
			character.spells.prepared = [...state.prepared];
			character.spells.known = [...state.known];
			onSave?.(character);
			backdrop.remove();
		},
	}));
	modal.append(actions);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);

	rebuildTabs();
	renderList();
}
