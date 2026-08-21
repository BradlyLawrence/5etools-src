import {
	ABILITIES,
	ABILITY_FULL,
	formatMod,
	derive,
	recomputeCharacter,
	entityUid,
	subclassUid,
	suggestFilename,
	exportPayload,
	importPayload,
	subclassUnlockLevel,
	entriesToText,
	FILE_TYPE,
	CLASS_FIGHTING_STYLES,
} from "../character.js?v=3.4";
import {previewLevelUp, applyLevelUp} from "../level-up.js?v=3.4";
import {el, clear} from "./pickers.js?v=3.4";
import {buildPdfSheet} from "../pdf-sheet.js?v=3.4";
import {exportElementToPdf} from "../../../shared/pdf-export.js?v=3.4";
import {downloadJson, loadJsonFile} from "../../../shared/file-io.js?v=3.4";
import {openPortraitModal} from "../../../shared/portrait.js?v=3.4";
import {showAlertModal, showConfirmModal, showPromptModal} from "../../../shared/ui-modal.js?v=3.4";
import {openShortRestModal, handleLongRest} from "../../../shared/rest-modal.js?v=3.4";
import {openAddFeatureModal} from "../../../shared/feature-modal.js?v=3.4";
import {mountEquipmentEditor, buildItemCatalog} from "../../../shared/equipment-editor.js?v=3.4";
import {mountSourceSelectorModal} from "../../../shared/sources.js?v=3.4";

export function mountSheet (root, {data, character, onChange, onNew}) {
	let char = character;
	let isEditMode = false;

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
		const cls = data.getClass(char.class.uid);
		const unlock = subclassUnlockLevel(cls);
		const needsSub = cls && d.level >= unlock && !char.class.subclassUid;

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

		if (needsSub) {
			toolbar.append(el("button", {
				type: "button",
				class: "cc-btn cc-btn-primary",
				text: `Choose ${d.subclassTitle}`,
				onClick: () => openSubclassPicker(),
			}));
		}

		toolbar.append(el("button", {
			type: "button",
			class: `cc-btn ${isEditMode ? "cc-btn-primary" : ""}`,
			text: isEditMode ? "✔ Finish Editing" : "✏️ Edit Sheet",
			title: "Toggle manual editing mode for sheet stats, scores, and features",
			onClick: () => {
				isEditMode = !isEditMode;
				render();
			},
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

			if (d.level >= unlock) {
				m.append(el("button", {
					type: "button", class: "cc-dropdown-item",
					text: char.class.subclassUid ? `Change ${d.subclassTitle}…` : `Choose ${d.subclassTitle}…`,
					onClick: () => { isMenuOpen = false; renderMenu(); openSubclassPicker(); },
				}));
			}

			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "⚙ Source Books",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					mountSourceSelectorModal({
						enabledSources: char.sources || ["TLotRR", "MECultures", "PHB", "XPHB"],
						preset: "lotr",
						el,
						onSave: (selected) => {
							char.sources = selected;
							if (typeof data.filterBySources === "function") data.filterBySources(selected);
							setChar(char);
						},
					});
				},
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "💾 Save JSON",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					downloadJson(suggestFilename(char, data), exportPayload(char));
				},
			}));
			m.append(el("button", {
				type: "button", class: "cc-dropdown-item", text: "📂 Load JSON",
				onClick: async () => {
					isMenuOpen = false; renderMenu();
					const json = await loadJsonFile({expectedFileType: FILE_TYPE, allowAnyValidJson: true});
					if (!json) return;
					try {
						const next = importPayload(json);
						recomputeCharacter(next, data);
						setChar(next);
					} catch (e) { alert(e.message); }
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
				type: "button", class: "cc-dropdown-item cc-danger", text: "🗑 New Hero",
				onClick: () => {
					isMenuOpen = false; renderMenu();
					if (confirm("Start a new hero? Unsaved changes will be lost.")) onNew?.();
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

		if (needsSub) {
			root.append(el("p", {
				class: "cc-tip cc-tip-warn",
				html: `<strong>${d.subclassTitle} required</strong> at level ${unlock}. Choose one from the toolbar.`,
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
			portraitFrame.append(el("img", {class: "cc-portrait-img", src: char.identity.portrait, alt: "Hero Portrait"}));
		} else {
			portraitFrame.append(el("span", {class: "cc-portrait-placeholder", text: "👤"}));
		}
		portraitFrame.append(el("div", {class: "cc-portrait-overlay", text: "📷 Edit"}));
		headerWrap.append(portraitFrame);

		const headerMain = el("header", {class: "cc-sheet-header cc-sheet-header-main"});
		headerMain.append(el("input", {
			class: "cc-input cc-input-title",
			value: char.identity.name || "",
			placeholder: "Hero name",
			onInput: (e) => { char.identity.name = e.target.value; onChange?.(char); },
		}));
		const culture = d.subraceName ? `${d.cultureName} (${d.subraceName})` : d.cultureName;

		if (isEditMode) {
			const editMetaRow = el("div", {class: "cc-inline-form", style: "gap: 0.5rem; margin-top: 0.35rem; flex-wrap: wrap; align-items: center;"});
			editMetaRow.append(el("span", {class: "cc-field-label", style: "font-size: 0.8rem;", text: "Level:"}));
			editMetaRow.append(el("input", {
				class: "cc-input cc-input-num", type: "number", min: "1", max: "20",
				value: String(char.level || 1),
				style: "width: 55px; height: 26px; padding: 2px 4px; font-size: 0.85rem;",
				onChange: (e) => {
					const lvl = Math.max(1, Math.min(20, Number(e.target.value) || 1));
					char.level = lvl;
					if (char.class) char.class.levels = lvl;
					setChar(char);
				},
			}));
			editMetaRow.append(el("span", {class: "cc-field-label", style: "font-size: 0.8rem;", text: "Player:"}));
			editMetaRow.append(el("input", {
				class: "cc-input", style: "height: 26px; padding: 2px 6px; font-size: 0.85rem; max-width: 130px;",
				placeholder: "Player name",
				value: char.identity.playerName || "",
				onInput: (e) => { char.identity.playerName = e.target.value; onChange?.(char); },
			}));
			headerMain.append(editMetaRow);
		} else {
			headerMain.append(el("div", {
				class: "cc-sheet-sub",
				text: `Level ${d.level} ${culture} ${d.className}${d.subclassName ? ` (${d.subclassName})` : ""} · ${d.backgroundName}`,
			}));
		}
		headerWrap.append(headerMain);
		root.append(headerWrap);

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
			stat("Shadow", d.shadow),
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

		// Base Ability Scores Grid (STR, DEX, CON, INT, WIS, CHA)
		const abGrid = el("div", {class: "cc-ability-grid"});
		for (const ab of ["str", "dex", "con", "int", "wis", "cha"]) {
			const fullName = {str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma"}[ab];
			const cell = el("div", {class: "cc-ability-cell"});
			cell.append(el("div", {class: "cc-ability-name", text: fullName}));

			if (isEditMode) {
				const details = d.abilityDetails || {cultural: {}, custom: {}, totalBonuses: {}};
				const cBonus = details.cultural[ab] || 0;
				const curCustomBonus = Number(char.abilities.customBonuses?.[ab] || 0);
				const curBase = Number(char.abilities.base?.[ab] ?? 10);
				const finalScore = Number(char.abilities[ab] ?? (curBase + cBonus + curCustomBonus));

				const editRow = el("div", {class: "cc-ability-edit-row"});

				// Base score input
				const baseGroup = el("div", {class: "cc-ability-input-group"});
				baseGroup.append(el("label", {text: "Base"}));
				const baseIn = el("input", {
					class: "cc-input cc-input-num",
					type: "number",
					min: "1",
					max: "30",
					value: String(curBase),
					title: `Base ${fullName} score`,
					onChange: (e) => {
						const num = Math.max(1, Math.min(30, Number(e.target.value) || 10));
						char.abilities = char.abilities || {};
						char.abilities.base = char.abilities.base || {};
						char.abilities.base[ab] = num;
						setChar(char);
					},
				});
				baseGroup.append(baseIn);
				editRow.append(baseGroup);

				// Custom bonus input (+bonus from magic items / custom modifiers / boons)
				const bonusGroup = el("div", {class: "cc-ability-input-group"});
				bonusGroup.append(el("label", {text: "Bonus"}));
				const bonusIn = el("input", {
					class: "cc-input cc-input-num",
					type: "number",
					min: "-20",
					max: "30",
					value: curCustomBonus !== 0 ? (curCustomBonus > 0 ? `+${curCustomBonus}` : String(curCustomBonus)) : "0",
					placeholder: "+0",
					title: `Custom / magic item / miscellaneous bonus to ${fullName}`,
					onChange: (e) => {
						const num = Number(e.target.value) || 0;
						char.abilities = char.abilities || {};
						char.abilities.customBonuses = char.abilities.customBonuses || {};
						char.abilities.customBonuses[ab] = num;
						setChar(char);
					},
				});
				bonusGroup.append(bonusIn);
				editRow.append(bonusGroup);

				cell.append(editRow);

				const parts = [];
				if (cBonus > 0) parts.push(`Culture +${cBonus}`);
				parts.push(`Total: <strong>${finalScore}</strong>`);
				cell.append(el("div", {class: "cc-ability-subtext", html: parts.join(" · ")}));
			} else {
				const details = d.abilityDetails || {cultural: {}, custom: {}, totalBonuses: {}};
				const cBonus = details.cultural[ab] || 0;
				const curCustomBonus = Number(char.abilities.customBonuses?.[ab] || 0);
				const curBase = Number(char.abilities.base?.[ab] ?? 10);
				const scoreParts = [`Base ${curBase}`];
				if (cBonus > 0) scoreParts.push(`Culture +${cBonus}`);
				if (curCustomBonus !== 0) scoreParts.push(`Bonus ${curCustomBonus > 0 ? `+${curCustomBonus}` : curCustomBonus}`);

				const scoreDiv = el("div", {
					class: "cc-ability-score",
					title: scoreParts.length > 1 ? `${scoreParts.join(" + ")} = ${char.abilities[ab] || 10}` : `Score: ${char.abilities[ab] || 10}`,
					text: String(char.abilities[ab] || 10),
				});
				cell.append(scoreDiv);
			}

			cell.append(el("div", {class: "cc-ability-mod", text: formatMod(d.mods[ab])}));
			const save = d.saves[ab];
			const saveDiv = el("div", {
				class: `cc-ability-save ${save.proficient ? "is-proficient" : ""}`,
				style: isEditMode ? "cursor: pointer; user-select: none;" : "user-select: none;",
				title: isEditMode ? `Click to toggle ${ab.toUpperCase()} saving throw proficiency` : "",
				html: `Save ${formatMod(save.value)} <strong>${save.proficient ? "●" : "○"}</strong>`,
				onClick: isEditMode ? () => {
					char.proficiencies = char.proficiencies || {};
					let curSaves = Array.isArray(char.proficiencies.saves) ? [...char.proficiencies.saves] : [];
					if (curSaves.includes(ab)) {
						curSaves = curSaves.filter(s => s !== ab);
					} else {
						curSaves.push(ab);
					}
					char.proficiencies.saves = curSaves;
					setChar(char);
				} : null,
			});
			cell.append(saveDiv);
			abGrid.append(cell);
		}
		root.append(abGrid);

		// Reorderable Card System
		const defaultOrder = ["attacks", "hope", "skills_features", "equipment", "patron", "appearance", "heir", "notes"];
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

		// 1. Attacks & Combat Actions Card
		function renderAttacksCard () {
			const sec = el("section", {class: "cc-panel"});
			sec.append(buildCardHeader("Attacks & Combat Actions", "attacks"));

			const attacks = d.attacks || [];
			if (attacks.length === 0) {
				sec.append(el("p", {class: "cc-muted", text: "No equipped weapons. Toggle [E] on weapons in Equipment & Inventory to add attacks."}));
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
				sec.append(table);
			}

			// Interactive Ammunition Tracker: Number Chooser
			const ammoBox = el("div", {class: "cc-ammo-box", style: "display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: var(--cc-bg-elevated); padding: 0.4rem 0.75rem; border-radius: var(--cc-radius); border: 1px solid var(--cc-border);"});
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
			sec.append(ammoBox);

			// Calling Powers & Resources Widget
			if (d.classResources?.length) {
				const resBox = el("div", {style: "margin-top: 1rem;"});
				resBox.append(el("strong", {text: `${d.className} Calling Powers & Resources:`, style: "font-size: 0.88rem; color: var(--cc-accent); display: block; margin-bottom: 0.5rem;"}));
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
				sec.append(resBox);
			}

			return sec;
		}

		// 2. Hope, Shadow & Conditions Section
		function renderHopeCard () {
			const hopeSec = el("section", {class: "cc-panel"});
			hopeSec.append(buildCardHeader("Hope & Shadow", "hope"));

			const hopeCols = el("div", {class: "cc-sheet-cols"});

			// Left Column: Hope Points & Visual Tracker
			const hopeCol = el("div", {class: "cc-form-group"});
			hopeCol.append(el("div", {class: "cc-card-header-badge", text: "HOPE POINTS"}));

			const hopeRow = el("div", {class: "cc-inline-form", style: "margin-bottom: 0.5rem;"});
			hopeRow.append(el("span", {class: "cc-field-label", text: "Current Hope:"}));
			hopeRow.append(el("input", {
				class: "cc-input cc-input-num", type: "number", min: "0",
				value: String(d.hopeCurrent),
				onChange: (e) => {
					char.hope = char.hope || {};
					char.hope.current = Number(e.target.value) || 0;
					setChar(char);
				},
			}));
			hopeRow.append(el("span", {class: "cc-muted", style: "font-size: 0.85rem;", text: `(Max ${d.hopeMax})`}));
			hopeCol.append(hopeRow);

			// Visual Hope Pips Bar
			const pipsBar = el("div", {class: "cc-pips-bar", style: "display: flex; gap: 4px; font-size: 1.1rem; color: var(--cc-accent); flex-wrap: wrap;"});
			const hopeMaxCount = Math.max(12, d.hopeMax || 10);
			for (let i = 0; i < hopeMaxCount; i++) {
				const pip = el("span", {
					style: "cursor: pointer; user-select: none;",
					text: i < d.hopeCurrent ? "●" : "◯",
					title: `Set Hope to ${i + 1}`,
					onClick: () => {
						char.hope = char.hope || {};
						char.hope.current = i + 1;
						setChar(char);
					},
				});
				pipsBar.append(pip);
			}
			hopeCol.append(pipsBar);
			hopeCols.append(hopeCol);

			// Right Column: Shadow, Conditions & 4 Flaws
			const shadowCol = el("div", {class: "cc-form-group"});
			shadowCol.append(el("div", {class: "cc-card-header-badge", text: "SHADOW & CORRUPTION"}));

			const shadowFields = el("div", {class: "cc-inline-form", style: "margin-bottom: 0.5rem; gap: 0.75rem; flex-wrap: wrap;"});
			shadowFields.append(el("span", {class: "cc-field-label", text: "Shadow Score:"}));
			shadowFields.append(el("input", {
				class: "cc-input cc-input-num", type: "number", min: "0",
				value: String(d.shadow),
				onChange: (e) => {
					char.shadow = char.shadow || {score: 0, scars: [], notes: ""};
					char.shadow.score = Number(e.target.value) || 0;
					setChar(char);
				},
			}));

			shadowFields.append(el("span", {class: "cc-field-label", text: "Shadow Path:"}));
			shadowFields.append(el("input", {
				class: "cc-input", style: "flex: 1; min-width: 130px;",
				placeholder: "Shadow Path",
				value: d.shadowPath || "",
				onInput: (e) => {
					char.shadow = char.shadow || {};
					char.shadow.path = e.target.value;
					onChange?.(char);
				},
			}));
			shadowCol.append(shadowFields);

			// Conditions
			const condRow = el("div", {class: "cc-inline-form", style: "margin-bottom: 0.5rem; gap: 1rem;"});
			const misLab = el("label", {class: "cc-check"});
			const misIn = el("input", {type: "checkbox", checked: d.isMiserable});
			misIn.addEventListener("change", () => {
				char.shadow = char.shadow || {};
				char.shadow.isMiserable = misIn.checked;
				setChar(char);
			});
			misLab.append(misIn, el("span", {text: "Miserable"}));
			condRow.append(misLab);

			const melLab = el("label", {class: "cc-check"});
			const melIn = el("input", {type: "checkbox", checked: d.isMelancholy});
			melIn.addEventListener("change", () => {
				char.shadow = char.shadow || {};
				char.shadow.isMelancholy = melIn.checked;
				setChar(char);
			});
			melLab.append(melIn, el("span", {text: "Melancholy"}));
			condRow.append(melLab);
			shadowCol.append(condRow);

			// Shadow Path 4-Stage Flaw Tracker
			const stagesBox = el("div", {class: "cc-shadow-stages-box"});
			stagesBox.append(el("div", {class: "cc-field-label", text: "Shadow Path Flaws (4 Stages):", style: "margin-bottom: 0.35rem;"}));
			const stagesRow = el("div", {class: "cc-shadow-stages-row", style: "display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;"});

			(d.shadowPathStages || []).forEach(stg => {
				const badge = el("button", {
					type: "button",
					class: `cc-btn cc-btn-xs ${stg.active ? "cc-btn-danger" : ""}`,
					text: `${stg.stage}. ${stg.name}${stg.active ? " ✖" : ""}`,
					title: `Click to toggle Stage ${stg.stage} Flaw (${stg.name})`,
					onClick: () => {
						char.shadow = char.shadow || {};
						let flaws = Array.isArray(char.shadow.flaws) ? [...char.shadow.flaws] : [];
						if (flaws.includes(stg.name)) {
							flaws = flaws.filter(f => f !== stg.name);
						} else {
							flaws.push(stg.name);
						}
						char.shadow.flaws = flaws;
						char.shadow.stage = flaws.length;
						setChar(char);
					},
				});
				stagesRow.append(badge);
			});
			stagesBox.append(stagesRow);
			shadowCol.append(stagesBox);

			hopeCols.append(shadowCol);
			hopeSec.append(hopeCols);
			return hopeSec;
		}

		// 3. Patron & Fellowship Details Section
		function renderPatronCard () {
			const patronSec = el("section", {class: "cc-panel"});
			patronSec.append(buildCardHeader("Patron & Fellowship Details", "patron"));

			const patronCols = el("div", {class: "cc-sheet-cols"});

			// Left Column: Patron & Fellowship Score
			const pCol1 = el("div", {class: "cc-form-group"});
			pCol1.append(el("label", {class: "cc-field"}, [
				el("span", {class: "cc-field-label", text: "Patron"}),
				el("input", {
					class: "cc-input",
					placeholder: "e.g. Gandalf, Elrond, Bilbo…",
					value: d.patron,
					onInput: (e) => {
						char.identity = char.identity || {};
						char.identity.patron = e.target.value;
						onChange?.(char);
					},
				}),
			]));
			pCol1.append(el("label", {class: "cc-field"}, [
				el("span", {class: "cc-field-label", text: "Fellowship Score"}),
				el("input", {
					class: "cc-input cc-input-num", type: "number", min: "0",
					value: String(d.fellowship),
					onChange: (e) => {
						char.identity = char.identity || {};
						char.identity.fellowship = Number(e.target.value) || 0;
						onChange?.(char);
					},
				}),
			]));
			patronCols.append(pCol1);

			// Right Column: Distinctive Features (Background Traits)
			const pCol2 = el("div", {class: "cc-form-group"});
			pCol2.append(el("label", {class: "cc-field"}, [
				el("span", {class: "cc-field-label", text: "Distinctive Features (Background Traits)"}),
				el("input", {
					class: "cc-input",
					placeholder: "e.g. Secretive, Wilful, Fair-spoken…",
					value: d.distinctiveFeatures,
					onInput: (e) => {
						char.identity = char.identity || {};
						char.identity.distinctiveFeatures = e.target.value;
						onChange?.(char);
					},
				}),
			]));
			patronCols.append(pCol2);
			patronSec.append(patronCols);
			return patronSec;
		}

		// 4. Physical Appearance Section
		function renderAppearanceCard () {
			const appearanceSec = el("section", {class: "cc-panel"});
			appearanceSec.append(buildCardHeader("Physical Appearance", "appearance"));
			const appCols = el("div", {class: "cc-sheet-cols"});

			const physBox = el("div");
			physBox.append(el("div", {class: "cc-card-header-badge", text: "PHYSICAL CHARACTERISTICS"}));
			const physGrid = el("div", {class: "cc-stat-strip", style: "grid-template-columns: repeat(3, 1fr); gap: 0.5rem; border: none; background: transparent; padding: 0;"});
			for (const [prop, label] of [["age", "Age"], ["height", "Height"], ["weight", "Weight"], ["eyes", "Eyes"], ["skin", "Skin"], ["hair", "Hair"]]) {
				const cell = el("label", {class: "cc-field", style: "margin: 0;"});
				cell.append(el("span", {class: "cc-field-label", text: label}));
				cell.append(el("input", {
					class: "cc-input",
					value: char.identity[prop] || "",
					placeholder: label,
					onInput: (e) => {
						char.identity[prop] = e.target.value;
						onChange?.(char);
					},
				}));
				physGrid.append(cell);
			}
			physBox.append(physGrid);
			appCols.append(physBox);
			appearanceSec.append(appCols);
			return appearanceSec;
		}

		// 5. Heir & Legacy System Section
		function renderHeirCard () {
			const heirSec = el("section", {class: "cc-panel"});
			heirSec.append(buildCardHeader("Heir & Legacy System", "heir"));
			const heirBox = el("div");
			const heirForm = el("div", {class: "cc-form-group"});
			heirForm.append(el("label", {class: "cc-field"}, [
				el("span", {class: "cc-field-label", text: "Heir Name"}),
				el("input", {
					class: "cc-input",
					placeholder: "Name of chosen heir",
					value: char.identity.heirName || "",
					onInput: (e) => {
						char.identity.heirName = e.target.value;
						onChange?.(char);
					},
				}),
			]));
			heirForm.append(el("label", {class: "cc-field"}, [
				el("span", {class: "cc-field-label", text: "Investment"}),
				el("input", {
					class: "cc-input",
					placeholder: "Legacy investment / treasure",
					value: char.identity.investment || "",
					onInput: (e) => {
						char.identity.investment = e.target.value;
						onChange?.(char);
					},
				}),
			]));
			heirBox.append(heirForm);
			heirSec.append(heirBox);
			return heirSec;
		}

		// 6. Skills and Features, Virtues & Crafts Panel
		function renderSkillsFeaturesCard () {
			const sec = el("section", {class: "cc-panel"});
			sec.append(buildCardHeader("Middle-earth Skills & Features", "skills_features"));
			const cols = el("div", {class: "cc-sheet-cols"});

			const skillCol = el("div", {class: "cc-form-group"});
			skillCol.append(el("h4", {text: "Skills", style: "margin-top: 0;"}));
			const ul = el("ul", {class: "cc-skill-list"});
			for (const sk of d.skills) {
				const isMeSkill = ["Explore", "Hunting", "Old Lore", "Riddle", "Travel"].includes(sk.name);
				const isStealth = sk.id === "stealth";
				const stealthBadge = isStealth && d.stealthDisadvantage ? ` <span class="cc-badge-stealth-disadv" title="Disadvantage on Stealth checks from wearing noisy armor">⚠ Disadv</span>` : "";
				const icon = sk.isExpert ? "✪" : (sk.proficient ? "●" : "○");
				const stateClass = sk.isExpert ? "is-expert is-proficient" : (sk.proficient ? "is-proficient" : "");
				const profLabel = sk.isExpert ? " [Expertise]" : (sk.proficient ? " [Proficient]" : "");

				const li = el("li", {
					class: `${stateClass} ${isEditMode ? "cc-skill-row is-editable" : ""}`,
					style: isEditMode ? "cursor: pointer; user-select: none; transition: background 0.15s ease;" : "user-select: none;",
					title: isEditMode ? `Click to cycle proficiency (None → Proficient → Expertise)\nCurrent: ${sk.isExpert ? "Expertise (2× PB)" : (sk.proficient ? "Proficient (+PB)" : "None")}` : "",
					html: `<span><strong style="color: ${sk.isExpert ? "var(--cc-accent, #c99c47)" : "inherit"}; font-size: 1.1em;">${icon}</strong> ${esc(sk.name)}${isMeSkill ? " ★" : ""}${stealthBadge}<span class="cc-muted" style="font-size: 0.75rem;">${profLabel}</span></span><span style="font-weight: ${sk.proficient ? "bold" : "normal"};">${formatMod(sk.bonus)}</span>`,
					onClick: isEditMode ? () => {
						char.proficiencies = char.proficiencies || {};
						char.proficiencies.skills = char.proficiencies.skills || {};
						const cur = char.proficiencies.skills[sk.id];
						if (!cur) {
							char.proficiencies.skills[sk.id] = "proficient";
						} else if (cur === "proficient") {
							char.proficiencies.skills[sk.id] = "expert";
						} else {
							delete char.proficiencies.skills[sk.id];
						}
						setChar(char);
					} : null,
				});
				ul.append(li);
			}
			skillCol.append(ul);
			if (isEditMode) {
				skillCol.append(el("p", {class: "cc-tip", style: "font-size: 0.8rem; margin-top: 0.5rem;", text: "✏️ Edit Mode Active: Click any skill to cycle None (○) → Proficient (●) → Expertise (✪)"}));
			} else {
				skillCol.append(el("p", {class: "cc-muted", text: "● Proficient (+PB) · ✪ Expertise (2× PB)"}));
			}
			skillCol.append(el("p", {class: "cc-muted", text: "★ Middle-earth skill (Explore, Hunting, Old Lore, Riddle, Travel)"}));
			cols.append(skillCol);

			const featCol = el("div", {class: "cc-form-group"});
			const featHead = el("div", {style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"});
			featHead.append(el("h4", {text: "Features, Virtues & Crafts", style: "margin: 0;"}));
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

			const callingKey = (d.className || "").toLowerCase();
			const stylesAvail = CLASS_FIGHTING_STYLES[callingKey] || [];
			if (stylesAvail.length > 0 && isEditMode) {
				const fsRow = el("div", {style: "display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0.4rem 0.6rem; background: var(--cc-bg-subtle, rgba(0,0,0,0.03)); border: 1px solid var(--cc-border); border-radius: 4px;"});
				fsRow.append(el("span", {style: "font-weight: 600; font-size: 0.85rem; white-space: nowrap;", text: "⚔️ Fighting Style:"}));
				const fsSelect = el("select", {class: "cc-select cc-select-sm", style: "flex: 1;"});
				fsSelect.append(el("option", {value: "", text: "— None / Unchosen —"}));
				for (const sName of stylesAvail) {
					const opt = el("option", {value: sName, text: sName});
					if (char.class?.fightingStyle === sName) opt.selected = true;
					fsSelect.append(opt);
				}
				fsSelect.addEventListener("change", (e) => {
					char.class = char.class || {};
					char.class.fightingStyle = e.target.value || null;
					setChar(char);
				});
				fsRow.append(fsSelect);
				featCol.append(fsRow);
			}

			if (!d.features?.length) {
				featCol.append(el("p", {class: "cc-muted", text: "No features unlocked yet. Click “➕ Add Feature / Virtue” to add custom or rules features."}));
			} else {
				for (const f of d.features) {
					const block = el("details", {
						class: `cc-feature ${f.source === "virtue" || f.source === "craft" || f.isCustom ? "cc-feature-subclass" : ""}`,
					});
					const sourceTag = f.source !== "class" ? ` [${f.source}]` : "";
					block.append(el("summary", {text: `L${f.level} · ${f.name}${sourceTag}`}));
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

		// 7. Equipment & Inventory Card
		function renderEquipmentCard () {
			const eq = el("section", {class: "cc-panel"});
			eq.append(buildCardHeader("Equipment & Inventory", "equipment"));

			char.currency = char.currency || {silver: 0, copper: 0, gold: 0};
			const currRow = el("div", {class: "cc-currency-grid"});
			currRow.append(el("strong", {text: "Middle-earth Treasure:"}));
			for (const coin of [["silver", "Silver Pieces (st)"], ["copper", "Copper Pieces (cp)"], ["gold", "Gold Pieces (gp)"]]) {
				const cCell = el("div", {class: "cc-currency-cell"});
				cCell.append(el("span", {text: coin[1]}));
				const cIn = el("input", {
					class: "cc-input cc-input-num",
					type: "number",
					min: "0",
					value: String(char.currency[coin[0]] || 0),
					onChange: (e) => {
						char.currency[coin[0]] = Math.max(0, Number(e.target.value) || 0);
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
				getCatalog: () => buildItemCatalog(
					[...(data.items || []), ...(data.baseItems || []), ...(data.siteItems || [])],
					{preferSources: ["TLotRR", "XPHB", "PHB", "DMG"]},
				),
				onChange: (lines) => {
					char.equipment = lines;
					setChar(char);
				},
			});
			eq.append(eqEditor.root);
			return eq;
		}

		// 8. Tale of Years / Journey Notes Card
		function renderNotesCard () {
			const notes = el("section", {class: "cc-panel"});
			notes.append(buildCardHeader("Tale of Years / Journey Notes", "notes"));
			const nta = el("textarea", {
				class: "cc-input cc-textarea",
				onChange: (e) => { char.identity.notes = e.target.value; onChange?.(char); },
			});
			nta.value = char.identity.notes || "";
			notes.append(nta);
			return notes;
		}

		const cardRenderers = {
			health_rest: () => null,
			attacks: renderAttacksCard,
			hope: renderHopeCard,
			skills_features: renderSkillsFeaturesCard,
			equipment: renderEquipmentCard,
			patron: renderPatronCard,
			appearance: renderAppearanceCard,
			heir: renderHeirCard,
			notes: renderNotesCard,
		};

		currentOrder.forEach(cardId => {
			const fn = cardRenderers[cardId];
			if (fn) {
				const cardEl = fn();
				if (cardEl) root.append(cardEl);
			}
		});

		if (!document.getElementById("cc-pdf-host")) {
			document.body.append(el("div", {id: "cc-pdf-host", class: "cc-pdf-host", "aria-hidden": "true"}));
		}

		window.scrollTo({ top: scrollY, behavior: "instant" });
		requestAnimationFrame(() => {
			window.scrollTo({ top: scrollY, behavior: "instant" });
		});
	};

	function openSubclassPicker () {
		const cls = data.getClass(char.class.uid);
		const subs = data.subclassesForClass(cls);
		if (!subs.length) { alert("No subclasses for this calling."); return; }
		const backdrop = el("div", {class: "cc-modal-backdrop"});
		const modal = el("div", {class: "cc-modal"});
		modal.append(el("h2", {text: cls.subclassTitle || "Subclass"}));
		let selected = char.class.subclassUid;
		const list = el("div", {class: "cc-picker-list"});
		const detail = el("div", {class: "cc-detail-box"});
		for (const sc of subs) {
			const uid = subclassUid(sc);
			const btn = el("button", {
				type: "button",
				class: `cc-pick ${selected === uid ? "is-selected" : ""}`,
				onClick: () => {
					selected = uid;
					list.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
					btn.classList.add("is-selected");
					clear(detail);
					detail.append(el("h3", {text: sc.name}));
					const first = sc.subclassFeatures?.[0];
					const ent = data.resolveSubclassFeatureRef(first);
					if (ent) detail.append(el("pre", {class: "cc-prose", text: entriesToText(ent.entries)}));
				},
			});
			btn.append(el("div", {class: "cc-pick-title", text: sc.name}));
			list.append(btn);
		}
		modal.append(list, detail);
		const actions = el("div", {class: "cc-wizard-footer"});
		actions.append(el("button", {type: "button", class: "cc-btn", text: "Cancel", onClick: () => backdrop.remove()}));
		actions.append(el("button", {
			type: "button", class: "cc-btn cc-btn-primary", text: "Confirm",
			onClick: () => {
				if (!selected) { alert("Pick one."); return; }
				char.class.subclassUid = selected;
				backdrop.remove();
				setChar(char);
			},
		}));
		modal.append(actions);
		backdrop.append(modal);
		backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
		document.body.append(backdrop);
	}

	function openLevelUp () {
		const preview = previewLevelUp(char, data);
		if (!preview.ok) { alert(preview.error); return; }

		const backdrop = el("div", {class: "cc-modal-backdrop"});
		const modal = el("div", {class: "cc-modal cc-modal-wide"});
		modal.append(el("h2", {text: `Level up → ${preview.to}`}));
		modal.append(el("p", {
			text: `${preview.className}: average HP +${preview.avgHp} (d${preview.faces} + CON ${formatMod(preview.conMod)}).`,
		}));

		const state = {
			hpRoll: null,
			subclassUid: char.class.subclassUid,
			virtueUid: null,
			craftUid: null,
		};

		modal.append(el("h3", {text: "Hit points"}));
		const hpRow = el("div", {class: "cc-inline-form"});
		hpRow.append(el("button", {
			type: "button", class: "cc-btn cc-btn-primary",
			text: `Use average (${preview.avgHp - preview.conMod} + CON)`,
			onClick: () => {
				state.hpRoll = preview.avgHp - preview.conMod;
				hpNote.textContent = `Using ${state.hpRoll} on the die.`;
			},
		}));
		const hpInput = el("input", {
			class: "cc-input cc-input-num", type: "number", min: "1", max: String(preview.faces), placeholder: "Roll",
		});
		hpInput.addEventListener("change", () => {
			state.hpRoll = Number(hpInput.value);
			hpNote.textContent = `Using rolled ${state.hpRoll}.`;
		});
		hpRow.append(hpInput);
		modal.append(hpRow);
		if (preview.needFightingStyle) {
			modal.append(el("h3", {text: "Fighting Style"}));
			modal.append(el("p", {class: "cc-muted", text: "Adopt a speciality fighting style for your Calling."}));
			const fsList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
			for (const st of preview.fightingStyles) {
				const btn = el("button", {
					type: "button", class: `cc-pick ${state.fightingStyle === st.name ? "is-selected" : ""}`,
					onClick: () => {
						state.fightingStyle = st.name;
						fsList.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
						btn.classList.add("is-selected");
					},
				});
				btn.append(el("div", {class: "cc-pick-title", text: st.name}));
				if (st.desc) btn.append(el("div", {class: "cc-pick-meta", text: st.desc}));
				fsList.append(btn);
			}
			modal.append(fsList);
		}

		if (preview.needSubclass) {
			modal.append(el("h3", {text: preview.subclassTitle}));
			const list = el("div", {class: "cc-picker-list cc-picker-list-compact"});
			for (const sc of preview.subclasses) {
				const uid = subclassUid(sc);
				const btn = el("button", {
					type: "button", class: "cc-pick",
					onClick: () => {
						state.subclassUid = uid;
						list.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
						btn.classList.add("is-selected");
					},
				});
				btn.append(el("div", {class: "cc-pick-title", text: sc.name}));
				list.append(btn);
			}
			modal.append(list);
		}

		if (preview.needVirtue) {
			modal.append(el("h3", {
				text: preview.virtueMode === "craft"
					? "Craft"
					: preview.virtueMode === "craft-or-virtue"
						? "Virtue or Craft"
						: "Virtue",
			}));
			modal.append(el("p", {
				class: "cc-muted",
				text: preview.virtueMode === "craft"
					? "Take a Scholar craft."
					: preview.virtueMode === "craft-or-virtue"
						? "Take a common/cultural virtue, or a Scholar craft."
						: "Take a common or cultural virtue.",
			}));
			if (preview.crafts?.length) {
				modal.append(el("h4", {text: "Crafts"}));
				const cList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
				for (const feat of preview.crafts) {
					const uid = entityUid(feat);
					const btn = el("button", {
						type: "button", class: "cc-pick",
						onClick: () => {
							state.craftUid = uid;
							state.virtueUid = null;
							modal.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
							btn.classList.add("is-selected");
						},
					});
					btn.append(el("div", {class: "cc-pick-title", text: feat.name}));
					cList.append(btn);
				}
				modal.append(cList);
			}
			if (preview.virtues?.length) {
				modal.append(el("h4", {text: "Virtues"}));
				const vList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
				for (const feat of preview.virtues) {
					const uid = entityUid(feat);
					const btn = el("button", {
						type: "button", class: "cc-pick",
						onClick: () => {
							state.virtueUid = uid;
							state.craftUid = null;
							modal.querySelectorAll(".cc-pick").forEach(n => n.classList.remove("is-selected"));
							btn.classList.add("is-selected");
						},
					});
					btn.append(el("div", {class: "cc-pick-title", text: feat.name}));
					btn.append(el("div", {class: "cc-pick-meta", text: feat.category || ""}));
					vList.append(btn);
				}
				modal.append(vList);
			}
		}

		const actions = el("div", {class: "cc-wizard-footer"});
		actions.append(el("button", {type: "button", class: "cc-btn", text: "Cancel", onClick: () => backdrop.remove()}));
		actions.append(el("button", {
			type: "button", class: "cc-btn cc-btn-primary", text: "Confirm level up",
			onClick: () => {
				try {
					applyLevelUp(char, data, state);
					backdrop.remove();
					setChar(char);
				} catch (e) { alert(e.message); }
			},
		}));
		modal.append(actions);
		backdrop.append(modal);
		backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
		document.body.append(backdrop);
	}

	async function doPdf () {
		const host = document.getElementById("cc-pdf-host");
		clear(host);
		const sheet = buildPdfSheet(char, data);
		host.append(sheet);
		try {
			await exportElementToPdf(sheet, suggestFilename(char, data));
		} catch (e) {
			alert(`PDF export failed: ${e.message}. Try Print.`);
		}
	}

	function doPrint () {
		const host = document.getElementById("cc-pdf-host");
		clear(host);
		host.append(buildPdfSheet(char, data));
		host.classList.add("is-print");
		window.print();
		setTimeout(() => host.classList.remove("is-print"), 500);
	}

	function esc (s) {
		return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	render();
	return {getCharacter: () => char, setCharacter: (c) => { char = c; render(); }};
}
