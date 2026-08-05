/**
 * Shared Short Rest & Long Rest modal dialog system.
 */

import {showConfirmModal, showAlertModal} from "./ui-modal.js";

export function openShortRestModal ({
	char,
	d,
	setChar,
	el,
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
	const modal = domEl("div", {class: "cc-modal", style: "max-width: 480px; text-align: left;"});

	modal.append(domEl("h2", {text: "⛺ Short Rest", style: "margin-top: 0; font-size: 1.3rem;"}));

	const bodyContainer = domEl("div", {style: "margin: 1rem 0;"});
	modal.append(bodyContainer);

	const renderBody = (logMsg = "") => {
		bodyContainer.innerHTML = "";

		const availableHd = d.hitDiceTotal - (char.combat?.hitDiceSpent || 0);
		const conMod = d.mods?.con || 0;
		const hpPct = Math.min(100, Math.max(0, Math.round(((d.hpCurrent || 0) / (d.hpMax || 1)) * 100)));
		const fillClass = hpPct > 50 ? "is-good" : hpPct > 25 ? "is-warn" : "is-low";

		// HP Status
		const hpRow = domEl("div", {style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;"});
		hpRow.append(domEl("span", {html: `Hit Points: <strong style="color: var(--cc-accent);">${d.hpCurrent}</strong> / ${d.hpMax}`}));
		hpRow.append(domEl("span", {class: "cc-muted", text: `Hit Dice: ${availableHd} / ${d.hitDiceTotal} (${d.hitDie})`}));
		bodyContainer.append(hpRow);

		// HP Fill Bar
		const barBg = domEl("div", {class: "cc-hp-bar-bg", style: "margin-bottom: 1rem;"});
		barBg.append(domEl("div", {class: `cc-hp-bar-fill ${fillClass}`, style: `width: ${hpPct}%;`}));
		bodyContainer.append(barBg);

		// Spend Hit Die Button Box
		const spendBox = domEl("div", {style: "background: var(--cc-bg-elevated); padding: 0.75rem 1rem; border-radius: var(--cc-radius); border: 1px solid var(--cc-border); text-align: center; margin-bottom: 1rem;"});

		const spendBtn = domEl("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			disabled: availableHd <= 0,
			text: availableHd > 0 ? `🎲 Spend 1 Hit Die (1${d.hitDie}${conMod >= 0 ? `+${conMod}` : conMod})` : "No Hit Dice Remaining",
			onClick: () => {
				if (availableHd <= 0) return;
				const faces = d.hitDiceFaces || 8;
				const roll = Math.floor(Math.random() * faces) + 1;
				const totalHeal = Math.max(1, roll + conMod);
				const prevHp = d.hpCurrent;
				const newHp = Math.min(d.hpMax, prevHp + totalHeal);
				const actualHealed = newHp - prevHp;

				char.class = char.class || {};
				char.class.hpCurrent = newHp;
				char.combat = char.combat || {};
				char.combat.hitDiceSpent = (char.combat.hitDiceSpent || 0) + 1;

				d.hpCurrent = newHp;
				d.hitDiceSpent = char.combat.hitDiceSpent;

				setChar(char);
				renderBody(`Rolled ${roll} + ${conMod} (CON) = ${totalHeal} HP. Restored ${actualHealed} Hit Points!`);
			},
		});
		spendBox.append(spendBtn);

		if (logMsg) {
			spendBox.append(domEl("div", {
				style: "font-size: 0.85rem; color: var(--cc-accent); margin-top: 0.5rem; font-weight: 500;",
				text: `✓ ${logMsg}`,
			}));
		}

		bodyContainer.append(spendBox);
	};

	renderBody();

	const footer = domEl("div", {class: "cc-wizard-footer", style: "display: flex; justify-content: flex-end; margin-top: 1rem;"});
	footer.append(domEl("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Finish Short Rest",
		onClick: () => backdrop.remove(),
	}));
	modal.append(footer);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}

export async function handleLongRest ({
	char,
	d,
	setChar,
	el,
}) {
	const confirmed = await showConfirmModal(
		"🌙 Long Rest",
		`Take a Long Rest?\n\nThis will:\n• Restore Hit Points to Max (${d.hpMax})\n• Regain up to ${Math.max(1, Math.floor(d.hitDiceTotal / 2))} spent Hit Dice\n• Reset Hope / Spell Slots & clear Temp HP`,
		{confirmText: "Take Long Rest", cancelText: "Cancel", el}
	);

	if (!confirmed) return;

	char.class = char.class || {};
	char.class.hpCurrent = d.hpMax;
	char.combat = char.combat || {};
	const currentSpent = Number(char.combat.hitDiceSpent) || 0;
	const regained = Math.max(1, Math.floor(d.hitDiceTotal / 2));
	char.combat.hitDiceSpent = Math.max(0, currentSpent - regained);
	char.combat.tempHp = 0;

	if (char.hope) {
		char.hope.current = d.hopeMax || 10;
	}
	if (char.spells?.slots) {
		delete char.spells.slots;
	}

	setChar(char);
	showAlertModal(
		"Long Rest Complete",
		`Restored to ${d.hpMax} HP!\nRegained ${regained} Hit Dice.\nHope & Spell slots reset.`,
		el
	);
}
