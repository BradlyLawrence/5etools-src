import {subclassUid, entriesToText} from "../data.js";
import {subclassUnlockLevel} from "../character.js";
import {el, clear} from "./pickers.js";

/**
 * Open a modal to pick (or change) a subclass.
 * @param {object} character
 * @param {import('../data.js').DataStore} data
 * @param {{
 *   title?: string,
 *   allowClear?: boolean,
 *   onPick: (subclassUid: string|null) => void,
 * }} opts
 */
export function openSubclassPicker (character, data, opts = {}) {
	const cls = data.getClass(character.class.uid);
	if (!cls) {
		alert("No class selected.");
		return;
	}
	const subclasses = data.subclassesForClass(cls);
	if (!subclasses.length) {
		alert(`No subclasses found for ${cls.name} in the loaded 2024 data.`);
		return;
	}

	const unlock = subclassUnlockLevel(cls);
	const current = character.class.subclassUid;
	let selected = current;

	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-modal-wide"});
	modal.append(el("h2", {text: opts.title || `${cls.subclassTitle || "Subclass"} — ${cls.name}`}));
	modal.append(el("p", {
		class: "cc-muted",
		text: `${cls.name} chooses a ${cls.subclassTitle || "subclass"} at level ${unlock}. Features unlock at later levels automatically.`,
	}));

	const list = el("div", {class: "cc-subclass-list"});
	const detail = el("div", {class: "cc-detail-box"});

	const renderDetail = (sc) => {
		clear(detail);
		if (!sc) {
			detail.append(el("p", {class: "cc-muted", text: "Select a subclass to see its features."}));
			return;
		}
		detail.append(el("h3", {text: sc.name}));
		detail.append(el("p", {
			class: "cc-muted",
			text: `Source: ${sc.source}${sc.shortName ? ` · ${sc.shortName}` : ""}`,
		}));
		const feats = el("ul", {class: "cc-subclass-feat-list"});
		for (const ref of sc.subclassFeatures || []) {
			const ent = data.resolveSubclassFeatureRef(ref);
			const level = ent?.level ?? String(ref).split("|").pop();
			const name = ent?.name || String(ref).split("|")[0];
			const li = el("li");
			li.append(el("strong", {text: `L${level} ${name}`}));
			if (ent?.entries) {
				li.append(el("pre", {class: "cc-prose", text: entriesToText(ent.entries)}));
			}
			feats.append(li);
		}
		detail.append(feats);
	};

	for (const sc of subclasses) {
		const uid = subclassUid(sc);
		const btn = el("button", {
			type: "button",
			class: `cc-pick cc-subclass-pick ${selected === uid ? "is-selected" : ""}`,
			onClick: () => {
				selected = uid;
				list.querySelectorAll(".cc-subclass-pick").forEach(n => n.classList.remove("is-selected"));
				btn.classList.add("is-selected");
				renderDetail(sc);
			},
		});
		btn.append(el("div", {class: "cc-pick-title", text: sc.name}));
		const preview = data.subclassPreviewText(sc);
		if (preview) btn.append(el("div", {class: "cc-pick-detail", text: preview.split("\n")[0]}));
		list.append(btn);
	}

	const layout = el("div", {class: "cc-subclass-layout"});
	layout.append(list, detail);
	modal.append(layout);

	// Preselect current
	const currentSc = current ? data.getSubclass(current) : subclasses[0];
	if (currentSc) renderDetail(currentSc);
	else renderDetail(null);

	const actions = el("div", {class: "cc-wizard-footer"});
	actions.append(el("button", {
		type: "button",
		class: "cc-btn",
		text: "Cancel",
		onClick: () => backdrop.remove(),
	}));
	if (opts.allowClear && current) {
		actions.append(el("button", {
			type: "button",
			class: "cc-btn cc-btn-danger",
			text: "Clear subclass",
			onClick: () => {
				if (!confirm("Remove the current subclass?")) return;
				opts.onPick?.(null);
				backdrop.remove();
			},
		}));
	}
	actions.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Confirm subclass",
		onClick: () => {
			if (!selected) {
				alert("Pick a subclass first.");
				return;
			}
			opts.onPick?.(selected);
			backdrop.remove();
		},
	}));
	modal.append(actions);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}

/**
 * Compact picker for embedding in level-up modal.
 * @returns {{root: HTMLElement, getSelected: () => string|null}}
 */
export function mountInlineSubclassPicker (host, {data, classEnt, selectedUid, onChange}) {
	const subclasses = data.subclassesForClass(classEnt);
	let selected = selectedUid || null;
	clear(host);
	host.append(el("p", {
		class: "cc-muted",
		text: `Choose your ${classEnt.subclassTitle || "subclass"}:`,
	}));
	const list = el("div", {class: "cc-picker-list cc-picker-list-compact"});
	const detail = el("div", {class: "cc-detail-box"});

	const show = (sc) => {
		clear(detail);
		if (!sc) return;
		detail.append(el("h4", {text: sc.name}));
		const first = sc.subclassFeatures?.[0];
		const ent = data.resolveSubclassFeatureRef(first);
		if (ent) detail.append(el("pre", {class: "cc-prose", text: entriesToText(ent.entries)}));
		const later = (sc.subclassFeatures || []).slice(1).map(ref => {
			const e = data.resolveSubclassFeatureRef(ref);
			const lv = e?.level ?? String(ref).split("|").pop();
			return `L${lv} ${e?.name || String(ref).split("|")[0]}`;
		});
		if (later.length) {
			detail.append(el("p", {class: "cc-muted", text: `Also gains: ${later.join(" · ")}`}));
		}
	};

	for (const sc of subclasses) {
		const uid = subclassUid(sc);
		const btn = el("button", {
			type: "button",
			class: `cc-pick ${selected === uid ? "is-selected" : ""}`,
			onClick: () => {
				selected = uid;
				list.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
				btn.classList.add("is-selected");
				show(sc);
				onChange?.(uid, sc);
			},
		});
		btn.append(el("div", {class: "cc-pick-title", text: sc.name}));
		btn.append(el("div", {class: "cc-pick-meta", text: sc.source || ""}));
		list.append(btn);
	}
	host.append(list, detail);
	if (selected) show(data.getSubclass(selected));

	return {
		root: host,
		getSelected: () => selected,
	};
}
