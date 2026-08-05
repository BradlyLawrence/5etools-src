import {ABILITIES, ABILITY_FULL} from "../rules-2024.js";
import {el, clear, multiCheck} from "./pickers.js";

/**
 * Describe a single ability[] block from a feat.
 * @returns {{mode: string, label: string, from: string[], amount: number, count: number, fixed?: Record<string, number>}|null}
 */
export function describeAbilityBlock (block) {
	if (!block || typeof block !== "object") return null;
	if (block.choose?.from) {
		const from = block.choose.from.map(a => String(a).toLowerCase());
		const amount = block.choose.amount != null ? Number(block.choose.amount) : 1;
		const count = block.choose.count != null ? Number(block.choose.count) : 1;
		let label;
		if (count === 1 && amount === 2) label = "+2 to one ability";
		else if (count === 2 && amount === 1) label = "+1 to two abilities";
		else if (count === 1 && amount === 1) label = `+1 to one ability (${from.map(a => a.toUpperCase()).join("/")})`;
		else label = `+${amount} to ${count} abilit${count === 1 ? "y" : "ies"}`;
		return {mode: "choose", label, from, amount, count};
	}
	const fixed = {};
	for (const ab of ABILITIES) {
		if (block[ab]) fixed[ab] = Number(block[ab]);
	}
	if (Object.keys(fixed).length) {
		const label = Object.entries(fixed).map(([a, n]) => `${a.toUpperCase()} ${n >= 0 ? "+" : ""}${n}`).join(", ");
		return {mode: "fixed", label, from: Object.keys(fixed), amount: 0, count: 0, fixed};
	}
	return null;
}

/**
 * Render ability assignment UI for a feat into `host`.
 * Mutually exclusive blocks (e.g. ASI +2 vs +1/+1) are offered as mode buttons.
 *
 * @param {HTMLElement} host
 * @param {object} feat
 * @param {(assignments: Record<string, number>) => void} onChange
 */
export function renderFeatAbilityPicker (host, feat, onChange) {
	clear(host);
	const blocks = (feat?.ability || []).map(describeAbilityBlock).filter(Boolean);
	if (!blocks.length) {
		onChange?.({});
		return;
	}

	// Single fixed grant
	if (blocks.length === 1 && blocks[0].mode === "fixed") {
		host.append(el("p", {text: `Ability scores: ${blocks[0].label}`}));
		onChange?.(blocks[0].fixed || {});
		return;
	}

	// Multiple choose blocks = mutually exclusive options (ASI style)
	const chooseBlocks = blocks.filter(b => b.mode === "choose");
	const fixedBlocks = blocks.filter(b => b.mode === "fixed");

	if (fixedBlocks.length && !chooseBlocks.length) {
		const merged = {};
		for (const b of fixedBlocks) Object.assign(merged, b.fixed);
		host.append(el("p", {text: `Ability scores: ${Object.entries(merged).map(([a, n]) => `${a.toUpperCase()} +${n}`).join(", ")}`}));
		onChange?.(merged);
		return;
	}

	let activeIdx = 0;
	const modeRow = el("div", {class: "cc-btn-row"});
	const pickHost = el("div", {class: "cc-feat-ability-picks"});

	const renderPicks = () => {
		clear(pickHost);
		const block = chooseBlocks[activeIdx];
		if (!block) {
			onChange?.({});
			return;
		}
		pickHost.append(el("p", {
			class: "cc-muted",
			text: block.count === 1
				? `Choose one ability to increase by ${block.amount}.`
				: `Choose ${block.count} different abilities to increase by ${block.amount} each.`,
		}));

		if (block.count === 1) {
			// Radio-style single select
			const row = el("div", {class: "cc-btn-row"});
			for (const ab of block.from) {
				row.append(el("button", {
					type: "button",
					class: "cc-btn",
					text: `${ABILITY_FULL[ab] || ab.toUpperCase()} (+${block.amount})`,
					onClick: (e) => {
						row.querySelectorAll(".cc-btn").forEach(b => b.classList.remove("cc-btn-primary"));
						e.currentTarget.classList.add("cc-btn-primary");
						onChange?.({[ab]: block.amount});
					},
				}));
			}
			pickHost.append(row);
			onChange?.({}); // nothing selected yet
		} else {
			const selected = [];
			pickHost.append(multiCheck(block.from, {
				label: (a) => `${ABILITY_FULL[a] || a.toUpperCase()} (+${block.amount})`,
				max: block.count,
				onChange: (vals) => {
					const next = {};
					for (const a of vals) next[a] = block.amount;
					onChange?.(next);
				},
			}));
			onChange?.({});
		}
	};

	if (chooseBlocks.length > 1) {
		host.append(el("p", {
			class: "cc-muted",
			text: "Ability Score Improvement — pick how to raise your scores:",
		}));
		chooseBlocks.forEach((block, i) => {
			modeRow.append(el("button", {
				type: "button",
				class: `cc-btn ${i === 0 ? "cc-btn-primary" : ""}`,
				text: block.label,
				onClick: (e) => {
					activeIdx = i;
					modeRow.querySelectorAll(".cc-btn").forEach(b => b.classList.remove("cc-btn-primary"));
					e.currentTarget.classList.add("cc-btn-primary");
					renderPicks();
				},
			}));
		});
		host.append(modeRow);
	} else if (chooseBlocks.length === 1) {
		host.append(el("p", {
			class: "cc-muted",
			text: `Ability increase: ${chooseBlocks[0].label}`,
		}));
	}

	host.append(pickHost);
	renderPicks();
}

/** Sort feat list with Ability Score Improvement first. */
export function sortFeatPool (feats) {
	return [...feats].sort((a, b) => {
		const aAsi = /^ability score improvement$/i.test(a.name) ? 0 : 1;
		const bAsi = /^ability score improvement$/i.test(b.name) ? 0 : 1;
		if (aAsi !== bAsi) return aAsi - bAsi;
		return a.name.localeCompare(b.name);
	});
}
