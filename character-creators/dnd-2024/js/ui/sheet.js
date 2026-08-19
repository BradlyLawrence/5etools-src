import {
	ABILITIES,
	ABILITY_FULL,
	formatMod,
	derive,
	recomputeCharacter,
	entityUid,
	suggestFilename,
	exportPayload,
	importPayload,
	subclassUnlockLevel,
} from "../character.js";
import {previewLevelUp, applyLevelUp} from "../level-up.js";
import {el, clear, multiCheck} from "./pickers.js";
import {buildPdfSheet} from "../pdf-sheet.js";
import {exportElementToPdf} from "../../../shared/pdf-export.js";
import {downloadJson, loadJsonFile, FILE_TYPE_2024} from "../../../shared/file-io.js";
import {openPortraitModal} from "../../../shared/portrait.js";
import {showAlertModal, showConfirmModal, showPromptModal} from "../../../shared/ui-modal.js";
import {openShortRestModal, handleLongRest} from "../../../shared/rest-modal.js";
import {openAddFeatureModal} from "../../../shared/feature-modal.js";
import {openSpellManager} from "./spell-manager.js";
import {openSubclassPicker, mountInlineSubclassPicker} from "./subclass-picker.js";
import {renderFeatAbilityPicker, sortFeatPool} from "./feat-ability.js";
import {maxCastableSpellLevel} from "../rules-2024.js";
import {mountEquipmentEditor, buildItemCatalog} from "../../../shared/equipment-editor.js";
import {mountSourceSelectorModal} from "../../../shared/sources.js";

/**
 * @param {HTMLElement} root
 * @param {{
 *   data: import('../data.js').DataStore,
 *   character: object,
 *   onChange: (c: object) => void,
 *   onNew: () => void,
 * }} opts
 */
export function mountSheet (root, {data, character, onChange, onNew}) {
	let char = character;

	const setChar = (c) => {
		char = c;
		recomputeCharacter(char, data);
		onChange?.(char);
		render();
	};

	const render = () => {
		const scrollY = window.scrollY;
		clear(root);
		const d = derive(char, data);

		const clsEnt = data.getClass(char.class.uid);
		const unlockLvl = subclassUnlockLevel(clsEnt);
		const needsSubclassNow = !!clsEnt && d.level >= unlockLvl && !char.class.subclassUid;
		const hasSubclassOptions = !!clsEnt && data.subclassesForClass(clsEnt).length > 0;

		const toolbar = el("div", {class: "cc-toolbar"});
		toolbar.append(
			el("button", {
				type: "button",
				class: "cc-btn cc-btn-primary cc-btn-levelup",
				text: d.level >= 20 ? "Max level" : `Level Up → ${d.level + 1}`,
				disabled: d.level >= 20,
				onClick: () => openLevelUp(),
			}),
		);
		if (needsSubclassNow) {
			toolbar.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-primary",
				text: clsEnt?.subclassTitle || "Choose Subclass",
				disabled: !hasSubclassOptions,
				onClick: () => {
					openSubclassPicker(char, data, {
						title: `Choose ${clsEnt?.subclassTitle || "subclass"}`,
						allowClear: false,
						onPick: (uid) => {
							char.class.subclassUid = uid;
							setChar(char);
						},
					});
				},
			}));
		}

		toolbar.append(el("button", {
			type: "button",
			class: "cc-btn",
			text: "Manage Spells",
			onClick: () => openSpellManager(char, data, (c) => setChar(c)),
		}));

		// Options Menu Dropdown
		let isMenuOpen = false;
		const dropdown = el("div", {class: "cc-dropdown"});
		const menuBtn = el("button", {
			type: "button",
			class: "cc-btn",
			text: "⚙ Options ▾",
			onClick: (e) => {
				e.stopPropagation();
				isMenuOpen = !isMenuOpen;
				renderMenu();
			},
		});
		dropdown.append(menuBtn);
		const menuBox = el("div");
		dropdown.append(menuBox);

		const renderMenu = () => {
			menuBox.innerHTML = "";
			if (!isMenuOpen) return;
			const m = el("div", {class: "cc-dropdown-menu"});

			if (hasSubclassOptions) {
				m.append(el("button", {
					type: "button", class: "cc-dropdown-item",
					text: char.class.subclassUid ? `Change ${clsEnt?.subclassTitle || "Subclass"}…` : `Choose ${clsEnt?.subclassTitle || "Subclass"}…`,
					onClick: () => {
						isMenuOpen = false; renderMenu();
						openSubclassPicker(char, data, {
							title: char.class.subclassUid ? "Change subclass" : `Choose ${clsEnt?.subclassTitle || "subclass"}`,
							allowClear: !!char.class.subclassUid,
							onPick: (uid) => {
								char.class.subclassUid = uid;
								setChar(char);
							},
						});
					},
				}));
			}
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "⚙ Source Books",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					mountSourceSelectorModal({
						enabledSources: char.sources || Array.from(data.enabledSources),
						preset: "2024",
						el,
						onSave: (selected) => {
							char.sources = selected;
							data.filterBySources(selected);
							setChar(char);
						},
					});
				},
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "💾 Save JSON",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					const payload = exportPayload(char);
					downloadJson(suggestFilename(char, data), payload);
				},
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "📂 Load JSON",
				onClick: async () => {
					isMenuOpen = false; renderMenu();
					const json = await loadJsonFile({expectedFileType: FILE_TYPE_2024});
					if (!json) return;
					try {
						const next = importPayload(json);
						recomputeCharacter(next, data);
						setChar(next);
					} catch (e) {
						alert(e.message);
					}
				},
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "📄 Export PDF",
				onClick: () => { isMenuOpen = false; renderMenu(); doPdf(); },
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "🖨 Print Sheet",
				onClick: () => { isMenuOpen = false; renderMenu(); doPrint(); },
			}));
			m.append(el("div", {class: "cc-dropdown-divider"}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item cc-danger", text: "🗑 New Character",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					if (confirm("Start a new character? Unsaved changes will be lost unless you saved JSON.")) onNew?.();
				},
			}));
			menuBox.append(m);
		};

		document.addEventListener("click", () => {
			if (isMenuOpen) {
				isMenuOpen = false;
				renderMenu();
			}
		});

		toolbar.append(dropdown);
		root.append(toolbar);

		if (needsSubclassNow) {
			root.append(el("p", {
				class: "cc-tip cc-tip-warn",
				html: `<strong>Subclass required:</strong> ${clsEnt.name} picks a <em>${clsEnt.subclassTitle || "subclass"}</em> at level ${unlockLvl}. Click <em>${clsEnt.subclassTitle || "Choose subclass"}</em> above (or choose it when leveling up).`,
			}));
		}

		const headerWrap = el("div", {class: "cc-sheet-header-wrap"});

		const portraitFrame = el("div", {
			class: "cc-portrait-frame",
			title: "Click to change character portrait",
			onClick: () => {
				openPortraitModal({
					portraitUrl: char.identity.portrait || "",
					el,
					onSave: (nextUrl) => {
						char.identity = char.identity || {};
						char.identity.portrait = nextUrl;
						setChar(char);
					},
				});
			},
		});
		if (char.identity.portrait) {
			portraitFrame.append(el("img", {class: "cc-portrait-img", src: char.identity.portrait, alt: "Character Portrait"}));
		} else {
			portraitFrame.append(el("span", {class: "cc-portrait-placeholder", text: "👤"}));
		}
		portraitFrame.append(el("div", {class: "cc-portrait-overlay", text: "📷 Edit"}));
		headerWrap.append(portraitFrame);

		const headerMain = el("header", {class: "cc-sheet-header cc-sheet-header-main"});
		const nameInput = el("input", {
			class: "cc-input cc-input-title",
			value: char.identity.name || "",
			placeholder: "Character name",
			onInput: (e) => { char.identity.name = e.target.value; onChange?.(char); },
		});
		headerMain.append(nameInput);
		headerMain.append(el("div", {
			class: "cc-sheet-sub",
			text: `Level ${d.level} ${d.speciesName} ${d.className}${d.subclassName ? ` (${d.subclassName})` : ""} · ${d.backgroundName}`,
		}));
		headerWrap.append(headerMain);
		root.append(headerWrap);

		// Combat strip
		const strip = el("div", {class: "cc-stat-strip"});
		const stat = (label, value, sub) => {
			const b = el("div", {class: "cc-stat"});
			b.append(el("div", {class: "cc-stat-label", text: label}));
			b.append(el("div", {class: "cc-stat-value", text: String(value)}));
			if (sub) b.append(el("div", {class: "cc-stat-sub", text: sub}));
			return b;
		};
		const acSub = d.acInfo?.armorName ? (d.acInfo.armorName.length > 14 ? d.acInfo.armorName.slice(0, 12) + "…" : d.acInfo.armorName) : null;
		const acBox = stat("AC", d.ac, char.combat?.acOverride != null ? "(Override)" : acSub);
		acBox.title = `${d.acInfo?.acBreakdown || "Armor Class"}\nDouble-click to set custom AC override`;
		acBox.style.cursor = "pointer";
		acBox.addEventListener("dblclick", async () => {
			const current = char.combat?.acOverride ?? "";
			const val = await showPromptModal("Set AC Override", `Set custom Armor Class override for situational bonuses:\n(Calculated: ${d.acInfo?.acBreakdown || `${10 + d.mods.dex} AC`})\nLeave blank to reset to auto calculation.`, {
				defaultValue: current,
				placeholder: "Custom AC number (or leave blank)",
				inputType: "number",
				el,
			});
			if (val === null) return;
			char.combat = char.combat || {};
			char.combat.acOverride = val.trim() === "" ? null : Number(val);
			setChar(char);
		});

		const hpBox = stat("HP", `${d.hpCurrent}/${d.hpMax}`, char.class?.hpMaxOverride != null ? "(Override Max)" : d.hitDie);
		hpBox.title = "Double-click to set custom Max HP override (for situational bonuses)";
		hpBox.style.cursor = "pointer";
		hpBox.addEventListener("dblclick", async () => {
			const current = char.class?.hpMaxOverride ?? "";
			const val = await showPromptModal("Set Max HP Override", `Set custom Max HP override for situational bonuses:\nLeave blank to reset to auto calculation.`, {
				defaultValue: current,
				placeholder: "Custom Max HP number (or leave blank)",
				inputType: "number",
				el,
			});
			if (val === null) return;
			char.class = char.class || {};
			char.class.hpMaxOverride = val.trim() === "" ? null : Number(val);
			setChar(char);
		});

		const hdBox = stat("Hit Dice", `${d.hitDiceTotal - d.hitDiceSpent}/${d.hitDiceTotal}`, d.hitDie);
		hdBox.title = "Click to open Short Rest & spend Hit Dice";
		hdBox.style.cursor = "pointer";
		hdBox.addEventListener("click", () => {
			openShortRestModal({char, d, setChar, el});
		});

		strip.append(
			acBox,
			stat("Initiative", formatMod(d.initiative)),
			stat("Speed", `${d.speed} ft.`),
			hpBox,
			hdBox,
			stat("Proficiency", formatMod(d.pb)),
			stat("Passive Perc.", d.passivePerception),
		);
		root.append(strip);

		// Compact Damage / Heal & Rest Bar
		const hpBarRow = el("div", {class: "cc-inline-form", style: "gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.75rem; background: var(--cc-bg-elevated); padding: 0.4rem 0.65rem; border-radius: var(--cc-radius); border: 1px solid var(--cc-border); align-items: center;"});

		hpBarRow.append(el("span", {class: "cc-field-label", style: "font-size: 0.8rem;", text: "HP:"}));

		[-1, -5].forEach(amt => {
			hpBarRow.append(el("button", {
				type: "button", class: "cc-btn cc-btn-xs cc-btn-danger", text: String(amt),
				onClick: () => {
					char.class = char.class || {};
					char.class.hpCurrent = Math.max(0, (d.hpCurrent || d.hpMax) + amt);
					setChar(char);
				},
			}));
		});

		[1, 5].forEach(amt => {
			hpBarRow.append(el("button", {
				type: "button", class: "cc-btn cc-btn-xs cc-btn-primary", text: `+${amt}`,
				onClick: () => {
					char.class = char.class || {};
					char.class.hpCurrent = Math.min(d.hpMax, (d.hpCurrent || 0) + amt);
					setChar(char);
				},
			}));
		});

		const customHpIn = el("input", {
			class: "cc-input cc-input-num", type: "number", min: "1", placeholder: "Amt", style: "width: 55px; height: 26px; padding: 2px 4px; font-size: 0.8rem;",
		});
		hpBarRow.append(customHpIn);

		hpBarRow.append(el("button", {
			type: "button", class: "cc-btn cc-btn-xs cc-btn-danger", text: "Dmg",
			onClick: () => {
				const val = Number(customHpIn.value) || 0;
				if (val <= 0) return;
				char.class = char.class || {};
				char.class.hpCurrent = Math.max(0, (d.hpCurrent || d.hpMax) - val);
				customHpIn.value = "";
				setChar(char);
			},
		}));

		hpBarRow.append(el("button", {
			type: "button", class: "cc-btn cc-btn-xs cc-btn-primary", text: "Heal",
			onClick: () => {
				const val = Number(customHpIn.value) || 0;
				if (val <= 0) return;
				char.class = char.class || {};
				char.class.hpCurrent = Math.min(d.hpMax, (d.hpCurrent || 0) + val);
				customHpIn.value = "";
				setChar(char);
			},
		}));

		const shieldLab = el("label", {class: "cc-check", style: "font-size: 0.8rem; margin-left: 0.3rem;"});
		const shield = el("input", {type: "checkbox"});
		shield.checked = !!char.combat.shield;
		shield.addEventListener("change", () => {
			char.combat.shield = shield.checked;
			setChar(char);
		});
		shieldLab.append(shield, el("span", {text: "Shield (+2 AC)"}));
		hpBarRow.append(shieldLab);

		const restDivider = el("div", {style: "width: 1px; height: 18px; background: var(--cc-border); margin: 0 0.3rem;"});
		hpBarRow.append(restDivider);

		hpBarRow.append(el("button", {
			type: "button", class: "cc-btn cc-btn-xs", text: "⛺ Short Rest",
			onClick: () => openShortRestModal({char, d, setChar, el}),
		}));

		hpBarRow.append(el("button", {
			type: "button", class: "cc-btn cc-btn-xs", text: "🌙 Long Rest",
			onClick: () => handleLongRest({char, d, setChar, el}),
		}));

		root.append(hpBarRow);

		// Abilities
		const abGrid = el("div", {class: "cc-ability-grid"});
		for (const ab of ABILITIES) {
			const cell = el("div", {class: "cc-ability-cell", style: "cursor: pointer;", title: `Double-click to edit ${ABILITY_FULL[ab]} score`});
			cell.append(el("div", {class: "cc-ability-name", text: ABILITY_FULL[ab]}));
			cell.append(el("div", {class: "cc-ability-score", text: String(char.abilities[ab] || 10)}));
			cell.append(el("div", {class: "cc-ability-mod", text: formatMod(d.mods[ab])}));
			const save = d.saves[ab];
			cell.append(el("div", {
				class: "cc-ability-save",
				text: `Save ${formatMod(save.value)}${save.proficient ? " ●" : ""}`,
			}));
			cell.addEventListener("dblclick", async () => {
				const current = char.abilities[ab] || 10;
				const val = await showPromptModal(`Set Base ${ABILITY_FULL[ab]}`, `Enter new base score for ${ABILITY_FULL[ab]} (${ab.toUpperCase()}):`, {
					defaultValue: String(current),
					placeholder: "Score (1-30)",
					inputType: "number",
					el,
				});
				if (val === null) return;
				const num = Math.max(1, Math.min(30, Number(val) || 10));
				char.abilities[ab] = num;
				setChar(char);
			});
			abGrid.append(cell);
		}
		root.append(abGrid);

		// Reorderable Card System
		const defaultOrder = ["attacks", "spells", "skills_features", "equipment", "notes"];
		let currentOrder = (Array.isArray(char.sheetCardOrder) && char.sheetCardOrder.length > 0
			? char.sheetCardOrder
			: defaultOrder).filter(id => id !== "health_rest");

		defaultOrder.forEach(id => {
			if (!currentOrder.includes(id)) currentOrder.push(id);
		});

		const setOrder = (nextOrder) => {
			char.sheetCardOrder = nextOrder;
			setChar(char);
		};

		function buildCardHeader (titleText, cardId) {
			const header = el("div", {class: "cc-panel-header", style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;"});
			header.append(el("h3", {text: titleText, style: "margin: 0;"}));

			const idx = currentOrder.indexOf(cardId);
			const controls = el("div", {class: "cc-card-controls"});

			const moveUpBtn = el("button", {
				type: "button",
				class: "cc-btn-icon-subtle",
				text: "▲",
				disabled: idx <= 0,
				title: "Move card up",
				onClick: (e) => {
					e.stopPropagation();
					if (idx <= 0) return;
					const next = [...currentOrder];
					const temp = next[idx - 1];
					next[idx - 1] = next[idx];
					next[idx] = temp;
					setOrder(next);
				},
			});

			const moveDownBtn = el("button", {
				type: "button",
				class: "cc-btn-icon-subtle",
				text: "▼",
				disabled: idx >= currentOrder.length - 1,
				title: "Move card down",
				onClick: (e) => {
					e.stopPropagation();
					if (idx >= currentOrder.length - 1) return;
					const next = [...currentOrder];
					const temp = next[idx + 1];
					next[idx + 1] = next[idx];
					next[idx] = temp;
					setOrder(next);
				},
			});

			controls.append(moveUpBtn, moveDownBtn);
			header.append(controls);
			return header;
		}

		// 0. Hit Points, Hit Dice & Rest Controls Card
		function renderHealthRestCard () {
			const sec = el("section", {class: "cc-panel"});
			sec.append(buildCardHeader("Hit Points, Hit Dice & Rests", "health_rest"));

			const hpPct = Math.max(0, Math.min(100, Math.round((d.hpCurrent / d.hpMax) * 100)));
			const fillClass = hpPct <= 25 ? "is-danger" : hpPct <= 50 ? "is-warn" : "";

			// Top status row
			const statusRow = el("div", {style: "display: flex; justify-content: space-between; align-items: baseline; font-weight: 600; flex-wrap: wrap; gap: 0.5rem;"});
			statusRow.append(el("span", {
				html: `Hit Points: <strong style="font-size: 1.15rem; color: var(--cc-accent);">${d.hpCurrent}</strong> / ${d.hpMax}${d.tempHp ? ` <span class="cc-muted">(+${d.tempHp} Temp)</span>` : ""}`,
			}));
			statusRow.append(el("span", {
				class: "cc-muted",
				text: `Hit Dice: ${d.hitDiceTotal - d.hitDiceSpent} / ${d.hitDiceTotal} (${d.hitDie})`,
			}));
			sec.append(statusRow);

			// HP Fill Bar
			const barBg = el("div", {class: "cc-hp-bar-bg"});
			barBg.append(el("div", {class: `cc-hp-bar-fill ${fillClass}`, style: `width: ${hpPct}%;`}));
			sec.append(barBg);

			// Controls Row 1: Quick Damage / Heal / Temp HP
			const controlsRow = el("div", {class: "cc-inline-form", style: "gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem;"});

			controlsRow.append(el("span", {class: "cc-field-label", text: "Damage:"}));
			[-1, -5, -10].forEach(amt => {
				controlsRow.append(el("button", {
					type: "button",
					class: "cc-btn cc-btn-xs cc-btn-danger",
					text: String(amt),
					onClick: () => {
						char.class = char.class || {};
						char.class.hpCurrent = Math.max(0, (d.hpCurrent || d.hpMax) + amt);
						setChar(char);
					},
				}));
			});

			controlsRow.append(el("span", {class: "cc-field-label", style: "margin-left: 0.5rem;", text: "Heal:"}));
			[1, 5, 10].forEach(amt => {
				controlsRow.append(el("button", {
					type: "button",
					class: "cc-btn cc-btn-xs cc-btn-primary",
					text: `+${amt}`,
					onClick: () => {
						char.class = char.class || {};
						char.class.hpCurrent = Math.min(d.hpMax, (d.hpCurrent || 0) + amt);
						setChar(char);
					},
				}));
			});

			const customIn = el("input", {
				class: "cc-input cc-input-num", type: "number", min: "1", placeholder: "Amt", style: "width: 65px; margin-left: 0.5rem;",
			});
			controlsRow.append(customIn);

			controlsRow.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs cc-btn-danger",
				text: "Damage",
				onClick: () => {
					const val = Number(customIn.value) || 0;
					if (val <= 0) return;
					char.class = char.class || {};
					char.class.hpCurrent = Math.max(0, (d.hpCurrent || d.hpMax) - val);
					customIn.value = "";
					setChar(char);
				},
			}));

			controlsRow.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs cc-btn-primary",
				text: "Heal",
				onClick: () => {
					const val = Number(customIn.value) || 0;
					if (val <= 0) return;
					char.class = char.class || {};
					char.class.hpCurrent = Math.min(d.hpMax, (d.hpCurrent || 0) + val);
					customIn.value = "";
					setChar(char);
				},
			}));
			sec.append(controlsRow);

			// Controls Row 2: Hit Dice & Rests
			const restRow = el("div", {class: "cc-inline-form", style: "gap: 0.6rem; flex-wrap: wrap; background: var(--cc-bg-elevated); padding: 0.5rem 0.75rem; border-radius: var(--cc-radius);"});

			const availableHd = d.hitDiceTotal - d.hitDiceSpent;
			const conMod = d.mods.con || 0;
			restRow.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs",
				disabled: availableHd <= 0,
				text: `🎲 Spend 1 Hit Die (1${d.hitDie}${formatMod(conMod)})`,
				title: availableHd <= 0 ? "No available Hit Dice remaining" : `Roll 1${d.hitDie}${formatMod(conMod)} to heal`,
				onClick: async () => {
					if (availableHd <= 0) return;
					const roll = Math.floor(Math.random() * d.hitDiceFaces) + 1;
					const healed = Math.max(1, roll + conMod);
					char.combat = char.combat || {};
					char.combat.hitDiceSpent = (d.hitDiceSpent || 0) + 1;
					char.class = char.class || {};
					char.class.hpCurrent = Math.min(d.hpMax, (d.hpCurrent || 0) + healed);
					await showAlertModal("🎲 Hit Die Spent", `Rolled 1${d.hitDie} (${roll}) ${formatMod(conMod)} = Healed ${healed} HP!`, el);
					setChar(char);
				},
			}));

			restRow.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs cc-btn-primary",
				text: "⛺ Short Rest",
				onClick: () => openShortRestModal({char, d, setChar, el}),
			}));

			restRow.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs cc-btn-primary",
				text: "🌙 Long Rest",
				onClick: () => handleLongRest({char, d, setChar, el}),
			}));

			sec.append(restRow);
			return sec;
		}

		// 1. Attacks & Actions Section
		function renderAttacksCard () {
			const attackSec = el("section", {class: "cc-panel"});
			attackSec.append(buildCardHeader("Attacks & Actions", "attacks"));
			const attacks = d.attacks || [];
			if (attacks.length === 0) {
				attackSec.append(el("p", {class: "cc-muted", text: "No equipped weapons. Toggle [E] on weapons in Equipment & Currency to add attacks."}));
			} else {
				const table = el("table", {class: "cc-table cc-attacks-table", style: "width: 100%; margin-bottom: 0.75rem;"});
				table.append(el("thead", {}, [
					el("tr", {}, [
						el("th", {text: "Weapon / Action", style: "text-align: left;"}),
						el("th", {text: "To-Hit", style: "text-align: center;"}),
						el("th", {text: "Damage & Type", style: "text-align: center;"}),
						el("th", {text: "Range / Notes", style: "text-align: right;"}),
					])
				]));
				const tbody = el("tbody");
				attacks.forEach(atk => {
					const capitalizedName = atk.name ? (atk.name.charAt(0).toUpperCase() + atk.name.slice(1)) : "Weapon";
					const tr = el("tr");
					tr.append(
						el("td", {html: `<strong>${esc(capitalizedName)}</strong>`, style: "text-align: left;"}),
						el("td", {text: formatMod(atk.toHit), style: "text-align: center; font-weight: 600; color: var(--cc-accent);"}),
						el("td", {text: atk.damage, style: "text-align: center;"}),
						el("td", {text: atk.range || (atk.isRanged ? "80/320 ft." : "Melee (5 ft.)"), class: "cc-muted", style: "text-align: right;"}),
					);
					tbody.append(tr);
				});
				table.append(tbody);
				attackSec.append(table);
			}

			// Interactive Ammunition Tracker: Number Chooser
			const ammoBox = el("div", {class: "cc-ammo-box", style: "display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: var(--cc-bg-elevated); padding: 0.4rem 0.75rem; border-radius: var(--cc-radius); border: 1px solid var(--cc-border); margin-top: 0.75rem;"});
			ammoBox.append(el("strong", {text: "Ammunition Count:", style: "font-size: 0.85rem; color: var(--cc-accent); margin-right: 0.25rem;"}));

			const maxAmmo = 20;
			const currentAmmo = char.combat?.ammoCount ?? maxAmmo;

			[-5, -1].forEach(amt => {
				ammoBox.append(el("button", {
					type: "button", class: "cc-btn cc-btn-xs cc-btn-danger", text: String(amt),
					onClick: () => {
						char.combat = char.combat || {};
						char.combat.ammoCount = Math.max(0, currentAmmo + amt);
						setChar(char);
					},
				}));
			});

			const ammoIn = el("input", {
				class: "cc-input cc-input-num",
				type: "number",
				min: "0",
				max: "999",
				value: String(currentAmmo),
				style: "width: 60px; text-align: center; font-weight: bold; font-size: 0.9rem;",
				onChange: (e) => {
					char.combat = char.combat || {};
					char.combat.ammoCount = Math.max(0, Number(e.target.value) || 0);
					setChar(char);
				},
			});
			ammoBox.append(ammoIn);

			[1, 5].forEach(amt => {
				ammoBox.append(el("button", {
					type: "button", class: "cc-btn cc-btn-xs cc-btn-primary", text: `+${amt}`,
					onClick: () => {
						char.combat = char.combat || {};
						char.combat.ammoCount = currentAmmo + amt;
						setChar(char);
					},
				}));
			});

			ammoBox.append(el("span", {class: "cc-muted", style: "font-size: 0.8rem; margin-left: 0.3rem;", text: "(arrows / bolts)"}));
			attackSec.append(ammoBox);

			// 2024 Class Powers & Resources Widget
			if (d.classResources?.length) {
				const resBox = el("div", {style: "margin-top: 1rem;"});
				resBox.append(el("strong", {text: `${d.className} Class Resources:`, style: "font-size: 0.88rem; color: var(--cc-accent); display: block; margin-bottom: 0.5rem;"}));
				const resGrid = el("div", {class: "cc-resource-grid"});

				for (const res of d.classResources) {
					const card = el("div", {class: "cc-resource-card"});
					const head = el("div", {class: "cc-resource-header"});
					head.append(el("span", {class: "cc-resource-name", text: res.name}));
					head.append(el("span", {class: "cc-resource-recovery", text: `⏳ ${res.recovery}`}));
					card.append(head);

					const counter = el("div", {class: "cc-resource-counter"});
					const decBtn = el("button", {
						type: "button", class: "cc-btn cc-btn-xs cc-btn-danger", text: "-1",
						disabled: res.current <= 0,
						onClick: () => {
							char.classResources = char.classResources || {};
							char.classResources[res.id] = Math.max(0, res.current - 1);
							setChar(char);
						},
					});

					const valSpan = el("span", {class: "cc-resource-val", text: `${res.current} / ${res.max}`});

					const incBtn = el("button", {
						type: "button", class: "cc-btn cc-btn-xs cc-btn-primary", text: "+1",
						disabled: res.current >= res.max,
						onClick: () => {
							char.classResources = char.classResources || {};
							char.classResources[res.id] = Math.min(res.max, res.current + 1);
							setChar(char);
						},
					});

					counter.append(decBtn, valSpan, incBtn);
					card.append(counter);
					resGrid.append(card);
				}
				resBox.append(resGrid);
				attackSec.append(resBox);
			}

			return attackSec;
		}

		// 2. Skills and Features Panel
		function renderSkillsFeaturesCard () {
			const sec = el("section", {class: "cc-panel"});
			sec.append(buildCardHeader("Skills & Features", "skills_features"));
			const cols = el("div", {class: "cc-sheet-cols"});

			const skillCol = el("div", {class: "cc-form-group"});
			skillCol.append(el("h4", {text: "Skills", style: "margin-top: 0;"}));
			const ul = el("ul", {class: "cc-skill-list"});
			for (const sk of d.skills) {
				const isStealth = sk.id === "stealth";
				const stealthBadge = isStealth && d.stealthDisadvantage ? ` <span class="cc-badge-stealth-disadv" title="Disadvantage on Stealth checks from wearing noisy armor">⚠ Disadv</span>` : "";
				const li = el("li", {
					class: sk.proficient ? "is-proficient" : "",
					html: `<span>${sk.proficient ? "●" : "○"}${sk.expertise ? "●" : ""} ${esc(sk.name)}${stealthBadge}</span><span>${formatMod(sk.bonus)}</span>`,
				});
				ul.append(li);
			}
			skillCol.append(ul);
			cols.append(skillCol);

			const featCol = el("div", {class: "cc-form-group"});
			const featHead = el("div", {style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"});
			featHead.append(el("h4", {text: "Features & Traits", style: "margin: 0;"}));
			featHead.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-xs cc-btn-primary",
				text: "➕ Add Feature / Virtue",
				onClick: () => {
					openAddFeatureModal({
						char,
						data,
						setChar,
						el,
					});
				},
			}));
			featCol.append(featHead);

			if (!d.features?.length) {
				featCol.append(el("p", {class: "cc-muted", text: "No features unlocked yet. Click “➕ Add Feature / Virtue” to add custom or rules features."}));
			} else {
				for (const f of d.features) {
					const block = el("details", {
						class: `cc-feature ${f.source === "subclass" || f.isCustom ? "cc-feature-subclass" : ""}`,
					});
					const tag = f.source === "subclass" ? " [subclass]" : f.source === "feat" || f.source === "origin-feat" ? " [feat]" : f.source ? ` [${f.source}]` : "";
					block.append(el("summary", {text: `L${f.level} · ${f.name}${tag}`}));
					if (f.text) block.append(el("pre", {class: "cc-prose", text: f.text}));
					if (f.isCustom) {
						const removeBtn = el("button", {
							type: "button",
							class: "cc-btn cc-btn-xs cc-btn-danger",
							text: "Remove Feature",
							style: "margin: 0.4rem 0;",
							onClick: (e) => {
								e.stopPropagation();
								char.customFeatures = (char.customFeatures || []).filter(cf => cf.id !== f.id && cf.name !== f.name);
								setChar(char);
							},
						});
						block.append(removeBtn);
					}
					featCol.append(block);
				}
			}
			cols.append(featCol);
			sec.append(cols);
			return sec;
		}

		// 3. Spells Card
		function renderSpellsCard () {
			const cls = data.getClass(char.class.uid);
			const isCaster = !!(d.spellAbility || cls?.cantripProgression || cls?.preparedSpellsProgression || cls?.spellsKnownProgression || cls?.casterProgression);
			if (!isCaster && !(char.spells.cantrips || []).length && !(char.spells.prepared || []).length) return null;

			const spellSec = el("section", {class: "cc-panel"});
			const head = el("div", {class: "cc-panel-head", style: "margin-bottom: 0.5rem;"});
			head.append(el("h3", {text: "Spellcasting"}));
			head.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-primary",
				text: "Open full spell list",
				onClick: () => openSpellManager(char, data, (c) => setChar(c)),
			}));
			const fullHeader = el("div", {style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;"});
			fullHeader.append(head);

			const idx = currentOrder.indexOf("spells");
			const controls = el("div", {class: "cc-card-controls", style: "display: flex; gap: 4px; align-items: center;"});
			controls.append(
				el("button", {
					type: "button", class: "cc-btn cc-btn-xs", text: "▲ Move Up", disabled: idx <= 0,
					onClick: (e) => { e.stopPropagation(); if (idx > 0) { const next = [...currentOrder]; const t = next[idx - 1]; next[idx - 1] = next[idx]; next[idx] = t; setOrder(next); } }
				}),
				el("button", {
					type: "button", class: "cc-btn cc-btn-xs", text: "▼ Move Down", disabled: idx >= currentOrder.length - 1,
					onClick: (e) => { e.stopPropagation(); if (idx < currentOrder.length - 1) { const next = [...currentOrder]; const t = next[idx + 1]; next[idx + 1] = next[idx]; next[idx] = t; setOrder(next); } }
				})
			);
			fullHeader.append(controls);
			spellSec.append(fullHeader);

			spellSec.append(el("p", {
				text: `Ability ${(d.spellAbility || "—").toUpperCase()} · Save DC ${d.spellSaveDc ?? "—"} · Attack ${d.spellAttack != null ? formatMod(d.spellAttack) : "—"}`,
			}));
			if (d.pact) {
				spellSec.append(el("p", {text: `Pact Magic: ${d.pact.slots} slot(s) of level ${d.pact.slotLevel}`}));
			} else if (d.slots) {
				spellSec.append(el("p", {
					text: `Slots: ${d.slots.map((n, i) => n ? `L${i + 1}:${n}` : null).filter(Boolean).join(" · ") || "—"}`,
				}));
			}
			spellSec.append(spellList("Cantrips", char.spells.cantrips, data));
			spellSec.append(spellList("Prepared", char.spells.prepared, data));
			spellSec.append(spellList("Known", char.spells.known, data));
			spellSec.append(el("p", {
				class: "cc-muted",
				text: "Use “Open full spell list” to check/uncheck any class spell to prepare or unprepare (or manage known spells).",
			}));
			return spellSec;
		}

		// 4. Equipment & Currency / Weight
		function renderEquipmentCard () {
			const eq = el("section", {class: "cc-panel"});
			eq.append(buildCardHeader("Equipment & Currency", "equipment"));

			char.currency = char.currency || {cp: 0, sp: 0, ep: 0, gp: 10, pp: 0};
			const currRow = el("div", {class: "cc-currency-grid"});
			currRow.append(el("strong", {text: "Coinage:"}));
			for (const coin of ["cp", "sp", "ep", "gp", "pp"]) {
				const cCell = el("div", {class: "cc-currency-cell"});
				cCell.append(el("span", {text: coin.toUpperCase()}));
				const cIn = el("input", {
					class: "cc-input cc-input-num",
					type: "number",
					min: "0",
					value: String(char.currency[coin] || 0),
					onChange: (e) => {
						char.currency[coin] = Math.max(0, Number(e.target.value) || 0);
						onChange?.(char);
					},
				});
				cCell.append(cIn);
				currRow.append(cCell);
			}
			eq.append(currRow);

			const wInfo = d.weightInfo || {totalWeight: 0, capacity: 150};
			const pct = Math.min(100, Math.round((wInfo.totalWeight / wInfo.capacity) * 100));
			const wBarWrap = el("div", {class: "cc-weight-bar-wrap"});
			wBarWrap.append(el("div", {
				text: `Carrying Weight: ${wInfo.totalWeight} lbs. / ${wInfo.capacity} lbs. max ${wInfo.isEncumbered ? "(Encumbered)" : ""}`,
			}));
			const wBar = el("div", {class: "cc-weight-bar"});
			wBar.append(el("div", {
				class: `cc-weight-fill ${wInfo.isOverburdened ? "is-encumbered" : wInfo.isEncumbered ? "is-overburdened" : ""}`,
				style: `width: ${pct}%;`,
			}));
			wBarWrap.append(wBar);
			eq.append(wBarWrap);

			const eqEditor = mountEquipmentEditor({
				el,
				equipment: char.equipment || [],
				getCatalog: () => buildItemCatalog(data.items || [], {
					preferSources: ["XPHB", "PHB", "XDMG", "DMG"],
				}),
				onChange: (lines) => {
					char.equipment = lines;
					setChar(char);
				},
			});
			eq.append(eqEditor.root);
			return eq;
		}

		// 5. Notes Card
		function renderNotesCard () {
			const notes = el("section", {class: "cc-panel"});
			notes.append(buildCardHeader("Character Notes", "notes"));
			const nta = el("textarea", {
				class: "cc-input cc-textarea",
				onChange: (e) => {
					char.identity.notes = e.target.value;
					onChange?.(char);
				},
			});
			nta.value = char.identity.notes || "";
			notes.append(nta);
			return notes;
		}

		const cardRenderers = {
			health_rest: () => null,
			attacks: renderAttacksCard,
			spells: renderSpellsCard,
			skills_features: renderSkillsFeaturesCard,
			equipment: renderEquipmentCard,
			notes: renderNotesCard,
		};

		currentOrder.forEach(cardId => {
			const fn = cardRenderers[cardId];
			if (fn) {
				const cardEl = fn();
				if (cardEl) root.append(cardEl);
			}
		});

		// Hidden PDF host
		let pdfHost = document.getElementById("cc-pdf-host");
		if (!pdfHost) {
			pdfHost = el("div", {id: "cc-pdf-host", class: "cc-pdf-host", "aria-hidden": "true"});
			document.body.append(pdfHost);
		}

		window.scrollTo({ top: scrollY, behavior: "instant" });
		requestAnimationFrame(() => {
			window.scrollTo({ top: scrollY, behavior: "instant" });
		});
	};

	function spellList (title, uids, dataStore) {
		if (!uids?.length) return el("p", {class: "cc-muted", text: `${title}: —`});
		const names = uids.map(u => {
			const sp = dataStore.spellByUid.get(String(u).toLowerCase());
			return sp?.name || titleCase(String(u).split("|")[0]);
		});
		return el("p", {text: `${title}: ${names.join(", ")}`});
	}

	function openLevelUp () {
		const preview = previewLevelUp(char, data);
		if (!preview.ok) {
			alert(preview.error);
			return;
		}

		const backdrop = el("div", {class: "cc-modal-backdrop"});
		const modal = el("div", {class: "cc-modal"});
		modal.append(el("h2", {text: `Level up → ${preview.to}`}));
		modal.append(el("p", {
			text: `${preview.className}: +1 level. Average HP gain: ${preview.avgHp} (d${preview.faces} + CON ${formatMod(preview.conMod)}).`,
		}));

		const state = {
			hpRoll: null,
			subclassUid: char.class.subclassUid,
			featUid: null,
			featAbility: {},
			fightingStyleUid: null,
			cantrips: [...(char.spells.cantrips || [])],
			prepared: [...(char.spells.prepared || [])],
			known: [...(char.spells.known || [])],
		};

		// HP
		modal.append(el("h3", {text: "Hit points"}));
		const hpRow = el("div", {class: "cc-inline-form"});
		hpRow.append(el("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: `Use average (${preview.avgHp - preview.conMod} + CON)`,
			onClick: () => {
				state.hpRoll = preview.avgHp - preview.conMod;
				hpNote.textContent = `Using ${state.hpRoll} on the die (+ CON ${formatMod(preview.conMod)} = ${preview.avgHp} HP).`;
			},
		}));
		const hpInput = el("input", {
			class: "cc-input cc-input-num",
			type: "number",
			min: "1",
			max: String(preview.faces),
			placeholder: "Roll",
		});
		hpInput.addEventListener("change", () => {
			state.hpRoll = Number(hpInput.value);
			hpNote.textContent = `Using rolled ${state.hpRoll} + CON.`;
		});
		hpRow.append(hpInput);
		modal.append(hpRow);
		const hpNote = el("p", {class: "cc-muted", text: "Defaults to average if left blank."});
		modal.append(hpNote);

		if (preview.needSubclass) {
			const clsForSub = data.getClass(char.class.uid);
			modal.append(el("h3", {text: clsForSub?.subclassTitle || "Subclass"}));
			const subHost = el("div");
			const inline = mountInlineSubclassPicker(subHost, {
				data,
				classEnt: clsForSub,
				selectedUid: state.subclassUid,
				onChange: (uid) => { state.subclassUid = uid; },
			});
			modal.append(subHost);
			// keep reference for confirm validation
			state._getSubclass = () => inline.getSelected();
		}

		if (preview.needFeat || preview.needEpicBoon) {
			modal.append(el("h3", {
				text: preview.needEpicBoon
					? "Epic Boon"
					: "Feat / Ability Score Improvement",
			}));
			if (!preview.needEpicBoon) {
				modal.append(el("p", {
					class: "cc-muted",
					text: "2024 rule: take any feat you’re eligible for. Ability Score Improvement (+2 to one score, or +1 to two) is listed first.",
				}));
			}
			const list = el("div", {class: "cc-picker-list cc-picker-list-compact"});
			const featPool = sortFeatPool(preview.featPool || []);
			for (const feat of featPool) {
				const uid = entityUid(feat);
				const isAsi = /^ability score improvement$/i.test(feat.name);
				const btn = el("button", {
					type: "button",
					class: `cc-pick ${isAsi ? "cc-pick-asi" : ""}`,
					onClick: () => {
						state.featUid = uid;
						state.featAbility = {};
						list.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
						btn.classList.add("is-selected");
						renderFeatAbilityPicker(asiBox, feat, (assignments) => {
							state.featAbility = assignments || {};
						});
					},
				});
				btn.append(el("div", {
					class: "cc-pick-title",
					text: isAsi ? "Ability Score Improvement (ASI)" : feat.name,
				}));
				btn.append(el("div", {
					class: "cc-pick-meta",
					text: isAsi ? "+2 one score · or · +1 two scores" : (feat.category || ""),
				}));
				list.append(btn);
			}
			modal.append(list);
			const asiBox = el("div", {class: "cc-detail-box"});
			modal.append(asiBox);
		}

		if (preview.fsGain > 0) {
			modal.append(el("h3", {text: "Fighting Style"}));
			const list = el("div", {class: "cc-picker-list cc-picker-list-compact"});
			for (const feat of preview.fightingStyles) {
				const uid = entityUid(feat);
				const btn = el("button", {
					type: "button",
					class: "cc-pick",
					onClick: () => {
						state.fightingStyleUid = uid;
						list.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
						btn.classList.add("is-selected");
					},
				});
				btn.append(el("div", {class: "cc-pick-title", text: feat.name}));
				list.append(btn);
			}
			modal.append(list);
		}

		// Spells gains
		const cls = data.getClass(char.class.uid);
		if (preview.cantrips.gain > 0 || preview.prepared.gain > 0 || preview.known.gain > 0) {
			modal.append(el("h3", {text: "Spells"}));
			if (preview.cantrips.after) {
				modal.append(el("p", {class: "cc-muted", text: `Cantrips known: ${preview.cantrips.after}`}));
				const cantrips = data.spellsForClass(cls.name, {cantripsOnly: true});
				modal.append(multiCheck(cantrips, {
					value: (sp) => entityUid(sp),
					label: (sp) => sp.name,
					selected: state.cantrips,
					max: preview.cantrips.after,
					onChange: (vals) => { state.cantrips = vals; },
				}));
			}
			if (preview.prepared.after) {
				modal.append(el("p", {class: "cc-muted", text: `Prepared spells: ${preview.prepared.after}`}));
				const maxSpellLevel = maxSlotLevel(preview.to, cls);
				const spells = data.spellsForClass(cls.name, {maxLevel: maxSpellLevel}).filter(s => s.level > 0);
				modal.append(multiCheck(spells, {
					value: (sp) => entityUid(sp),
					label: (sp) => `${sp.name} (${sp.level})`,
					selected: state.prepared,
					max: preview.prepared.after,
					onChange: (vals) => { state.prepared = vals; },
				}));
			}
			if (preview.known.after) {
				modal.append(el("p", {class: "cc-muted", text: `Spells known: ${preview.known.after}`}));
				const maxSpellLevel = maxSlotLevel(preview.to, cls);
				const spells = data.spellsForClass(cls.name, {maxLevel: maxSpellLevel}).filter(s => s.level > 0);
				modal.append(multiCheck(spells, {
					value: (sp) => entityUid(sp),
					label: (sp) => `${sp.name} (${sp.level})`,
					selected: state.known,
					max: preview.known.after,
					onChange: (vals) => { state.known = vals; },
				}));
			}
		}

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
			text: "Confirm level up",
			onClick: () => {
				try {
					if (preview.needSubclass && state._getSubclass) {
						state.subclassUid = state._getSubclass() || state.subclassUid;
					}
					// Require ability picks when the chosen feat has ability options
					if ((preview.needFeat || preview.needEpicBoon) && state.featUid) {
						const feat = data.getFeat(state.featUid);
						if (feat?.ability?.length) {
							const total = Object.values(state.featAbility || {}).reduce((a, b) => a + Number(b || 0), 0);
							// ASI needs +2 total; fixed grants may be pre-filled
							const needsPick = feat.ability.some(b => b.choose);
							if (needsPick && total <= 0) {
								alert("Assign the ability score increase(s) for this feat before confirming.");
								return;
							}
						}
					}
					applyLevelUp(char, data, state);
					backdrop.remove();
					setChar(char);
				} catch (e) {
					alert(e.message);
				}
			},
		}));
		modal.append(actions);
		backdrop.append(modal);
		backdrop.addEventListener("click", (e) => {
			if (e.target === backdrop) backdrop.remove();
		});
		document.body.append(backdrop);
	}

	function maxSlotLevel (level, cls) {
		return maxCastableSpellLevel(cls, level) || 1;
	}

	async function doPdf () {
		const host = document.getElementById("cc-pdf-host") || (() => {
			const h = el("div", {id: "cc-pdf-host", class: "cc-pdf-host"});
			document.body.append(h);
			return h;
		})();
		clear(host);
		const sheet = buildPdfSheet(char, data);
		host.append(sheet);
		host.classList.add("is-rendering");
		try {
			await exportElementToPdf(sheet, suggestFilename(char, data));
		} catch (e) {
			console.error(e);
			alert(`PDF export failed: ${e.message}\nYou can use Print instead.`);
		} finally {
			host.classList.remove("is-rendering");
		}
	}

	function doPrint () {
		const host = document.getElementById("cc-pdf-host") || el("div", {id: "cc-pdf-host", class: "cc-pdf-host"});
		if (!host.parentNode) document.body.append(host);
		clear(host);
		host.append(buildPdfSheet(char, data));
		host.classList.add("is-print");
		window.print();
		setTimeout(() => host.classList.remove("is-print"), 500);
	}

	function esc (s) {
		return String(s)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function titleCase (s) {
		return String(s).replace(/\b\w/g, c => c.toUpperCase());
	}

	render();
	return {
		getCharacter: () => char,
		setCharacter: (c) => { char = c; render(); },
	};
}
