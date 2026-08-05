import {
	ABILITIES,
	ABILITY_FULL,
	STANDARD_ARRAY,
	POINT_BUY_BUDGET,
	pointBuyRemaining,
	pointBuyCostForScores,
	formatMod,
	abilityMod,
} from "../rules-2024.js";
import {
	createEmptyCharacter,
	recomputeCharacter,
	classSkillOptions,
	backgroundAbilityModes,
	listEquipmentPackages,
	entityUid,
	entriesToText,
	missingEquipmentChoices,
	resolvePackageItems,
	subclassUnlockLevel,
} from "../character.js";
import {subclassUid} from "../data.js";
import {finalizeLevelOne} from "../level-up.js";
import {el, clear, multiCheck, radioCards} from "./pickers.js";
import {mountSourceBanner, mountSourceSelectorModal} from "../../../shared/sources.js";
import {openPortraitModal} from "../../../shared/portrait.js";

const STEPS = [
	{id: "identity", title: "Identity"},
	{id: "abilities", title: "Abilities"},
	{id: "species", title: "Species"},
	{id: "background", title: "Background"},
	{id: "class", title: "Class"},
	{id: "review", title: "Review"},
];

/**
 * @param {HTMLElement} root
 * @param {{
 *   data: import('../data.js').DataStore,
 *   character: object,
 *   onChange: (c: object) => void,
 *   onComplete: (c: object) => void,
 * }} opts
 */
export function mountWizard (root, {data, character, onChange, onComplete}) {
	let step = 0;
	let char = character || createEmptyCharacter();

	/** Persist + re-render (use for structural UI changes). */
	const setChar = (next) => {
		char = next;
		onChange?.(char);
		render();
	};

	/** Persist without re-render (use for typing so inputs keep focus). */
	const patchChar = (fn) => {
		fn(char);
		onChange?.(char);
	};

	const render = () => {
		clear(root);
		root.append(renderChrome(), renderStep());
	};

	const openSourceModal = () => {
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
	};

	const renderChrome = () => {
		const wrap = el("div");
		const banner = mountSourceBanner({
			enabledSources: char.sources || Array.from(data.enabledSources),
			onOpenModal: openSourceModal,
			el,
		});
		wrap.append(banner);

		const nav = el("div", {class: "cc-steps"});
		STEPS.forEach((s, i) => {
			const btn = el("button", {
				type: "button",
				class: `cc-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`,
				text: `${i + 1}. ${s.title}`,
				onClick: () => {
					if (i <= step) {
						step = i;
						render();
					}
				},
			});
			nav.append(btn);
		});
		wrap.append(nav);
		return wrap;
	};

	const renderStep = () => {
		const panel = el("div", {class: "cc-panel"});
		const id = STEPS[step].id;
		if (id === "identity") panel.append(stepIdentity());
		if (id === "abilities") panel.append(stepAbilities());
		if (id === "species") panel.append(stepSpecies());
		if (id === "background") panel.append(stepBackground());
		if (id === "class") panel.append(stepClass());
		if (id === "review") panel.append(stepReview());

		const footer = el("div", {class: "cc-wizard-footer"});
		if (step > 0) {
			footer.append(el("button", {
				type: "button",
				class: "cc-btn",
				text: "Back",
				onClick: () => { step--; render(); },
			}));
		} else footer.append(el("span"));

		const nextLabel = step === STEPS.length - 1 ? "Create character" : "Next";
		footer.append(el("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: nextLabel,
			onClick: () => {
				const err = validateStep(STEPS[step].id);
				if (err) {
					alert(err);
					return;
				}
				if (step === STEPS.length - 1) {
					try {
						finalizeLevelOne(char, data);
						onComplete?.(char);
					} catch (e) {
						alert(e.message);
					}
					return;
				}
				step++;
				render();
			},
		}));
		panel.append(footer);
		return panel;
	};

	function validateStep (id) {
		if (id === "identity" && !char.identity.name?.trim()) return "Enter a character name.";
		if (id === "abilities") {
			if (char.abilities.method === "pointBuy") {
				const rem = pointBuyRemaining(char.abilities.base);
				if (rem < 0) return "Point buy is over budget.";
				if (rem > 0) return `You still have ${rem} point-buy points to spend.`;
			}
			if (char.abilities.method === "standardArray") {
				const vals = ABILITIES.map(a => char.abilities.base[a]).sort((a, b) => b - a);
				const expected = [...STANDARD_ARRAY].sort((a, b) => b - a);
				if (vals.join() !== expected.join()) return "Assign each standard-array value exactly once.";
			}
		}
		if (id === "species" && !char.species.uid) return "Choose a species.";
		if (id === "background") {
			if (!char.background.uid) return "Choose a background.";
			const assigns = char.background.abilityChoice?.assignments || {};
			const modes = backgroundAbilityModes(data.getBackground(char.background.uid));
			const mode = modes[char.background.abilityChoice?.index ?? 0];
			if (mode && mode.mode !== "fixed") {
				const sum = Object.values(assigns).reduce((a, b) => a + Number(b || 0), 0);
				const need = (mode.weights || []).reduce((a, b) => a + b, 0);
				if (sum !== need) return "Finish assigning background ability bonuses.";
			}
			if (!char.background.originFeatUid) return "Origin feat missing for this background.";
			const miss = missingEquipmentChoices(char, data).filter(m => m.startsWith("Background"));
			if (miss.length) return `Choose equipment: ${miss.join(", ")}`;
		}
		if (id === "class") {
			if (!char.class.uid) return "Choose a class.";
			const cls = data.getClass(char.class.uid);
			const {chooseCount} = classSkillOptions(cls);
			if ((char.class.skillChoices || []).length < chooseCount) {
				return `Pick ${chooseCount} class skill${chooseCount === 1 ? "" : "s"}.`;
			}
			// fighting style at 1
			const fsNeed = (cls.featProgression || []).some(b =>
				b.category?.some(c => String(c).startsWith("FS")) && (b.progression?.["1"] || b.progression?.[1]),
			);
			if (fsNeed) {
				const hasFs = (char.feats || []).some(f => {
					const feat = data.getFeat(f.uid);
					return feat && (feat.category === "FS" || String(feat.category || "").startsWith("FS"));
				});
				if (!hasFs) return "Choose a Fighting Style.";
			}
			const miss = missingEquipmentChoices(char, data).filter(m => m.startsWith("Class"));
			if (miss.length) return `Choose equipment: ${miss.join(", ")}`;
		}
		return null;
	}

	/** Render package list with per-line choice dropdowns for equipmentType rows. */
	function renderEquipmentPackages (startingEquipment, scope /* "background" | "class" */) {
		const wrap = el("div", {class: "cc-equip-packages"});
		const packs = listEquipmentPackages(startingEquipment, data);
		if (!packs.length) return wrap;

		const stateKey = scope; // character.background | character.class
		const owner = scope === "background" ? char.background : char.class;
		if (!owner.equipmentChoices) owner.equipmentChoices = {};

		wrap.append(el("h4", {text: "Starting equipment"}));
		wrap.append(el("p", {
			class: "cc-muted",
			text: "Pick a package. If a line says “Choose …”, pick the specific item.",
		}));

		for (const pack of packs) {
			const id = `${scope}-eq-${pack.id}`;
			const block = el("div", {class: "cc-equip-pack"});
			const lab = el("label", {class: "cc-check cc-equip-pack-label", for: id});
			const input = el("input", {
				type: "radio",
				name: `${scope}-eq`,
				id,
				value: pack.id,
			});
			if ((owner.equipmentPackage || "A") === pack.id) input.checked = true;
			input.addEventListener("change", () => {
				owner.equipmentPackage = pack.id;
				owner.equipmentChoices = {};
				char.equipment = [];
				setChar(char);
			});
			const resolved = resolvePackageItems(pack, owner.equipmentChoices || {}, data);
			lab.append(input, el("span", {class: "cc-equip-pack-title", text: `Package ${pack.id}`}));
			block.append(lab);

			const ul = el("ul", {class: "cc-equip-list"});
			pack.entries.forEach((entry, index) => {
				const li = el("li", {class: "cc-equip-line"});
				if (entry?.equipmentType) {
					const metaLabel = pack.choices.find(c => c.index === index)?.label || "item";
					const options = pack.choices.find(c => c.index === index)?.options || [];
					const sel = el("select", {class: "cc-select cc-select-inline"});
					sel.append(el("option", {value: "", text: `— Choose ${metaLabel} —`}));
					for (const opt of options) {
						const uid = entityUid(opt);
						const o = el("option", {value: uid, text: opt.name});
						if ((owner.equipmentChoices || {})[String(index)] === uid) o.selected = true;
						sel.append(o);
					}
					// Only enable choices for the selected package
					sel.disabled = (owner.equipmentPackage || "A") !== pack.id;
					sel.addEventListener("change", () => {
						owner.equipmentChoices = {...(owner.equipmentChoices || {})};
						if (sel.value) owner.equipmentChoices[String(index)] = sel.value;
						else delete owner.equipmentChoices[String(index)];
						char.equipment = [];
						setChar(char);
					});
					li.append(el("span", {class: "cc-equip-choose-label", text: `${metaLabel}: `}), sel);
				} else {
					li.append(el("span", {text: formatLine(entry, resolved[index])}));
				}
				ul.append(li);
			});
			block.append(ul);
			wrap.append(block);
		}
		return wrap;
	}

	function formatLine (entry, resolvedText) {
		return resolvedText || "";
	}

	function stepIdentity () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Identity"}));

		const nameGrid = el("div", {class: "cc-sheet-cols", style: "align-items: center;"});
		const portraitFrame = el("div", {
			class: "cc-portrait-frame",
			title: "Click to set character portrait",
			onClick: () => {
				openPortraitModal({
					portraitUrl: char.identity.portrait || "",
					el,
					onSave: (nextUrl) => {
						char.identity.portrait = nextUrl;
						setChar(char);
					},
				});
			},
		});
		if (char.identity.portrait) {
			portraitFrame.append(el("img", {class: "cc-portrait-img", src: char.identity.portrait, alt: "Portrait"}));
		} else {
			portraitFrame.append(el("span", {class: "cc-portrait-placeholder", text: "👤"}));
		}
		portraitFrame.append(el("div", {class: "cc-portrait-overlay", text: "📷 Portrait"}));
		nameGrid.append(portraitFrame);

		const fieldsBox = el("div", {style: "flex: 1;"});
		fieldsBox.append(field("Character name", el("input", {
			class: "cc-input",
			value: char.identity.name || "",
			onInput: (e) => patchChar(c => { c.identity.name = e.target.value; }),
		})));
		fieldsBox.append(field("Player name", el("input", {
			class: "cc-input",
			value: char.identity.playerName || "",
			onInput: (e) => patchChar(c => { c.identity.playerName = e.target.value; }),
		})));
		nameGrid.append(fieldsBox);
		box.append(nameGrid);
		box.append(field("Alignment", el("input", {
			class: "cc-input",
			value: char.identity.alignment,
			placeholder: "e.g. Chaotic Good",
			onInput: (e) => patchChar(c => { c.identity.alignment = e.target.value; }),
		})));
		const notes = el("textarea", {
			class: "cc-input cc-textarea",
			onInput: (e) => patchChar(c => { c.identity.notes = e.target.value; }),
		});
		notes.value = char.identity.notes || "";
		box.append(field("Notes", notes));
		return box;
	}

	function stepAbilities () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Ability scores"}));
		box.append(el("p", {
			class: "cc-muted",
			text: "Base scores only. Background bonuses are applied on the next steps.",
		}));

		const methods = el("div", {class: "cc-btn-row"});
		for (const [id, label] of [
			["standardArray", "Standard Array"],
			["pointBuy", "Point Buy"],
			["manual", "Manual"],
		]) {
			methods.append(el("button", {
				type: "button",
				class: `cc-btn ${char.abilities.method === id ? "cc-btn-primary" : ""}`,
				text: label,
				onClick: () => {
					char.abilities.method = id;
					if (id === "standardArray") {
						const arr = [...STANDARD_ARRAY];
						ABILITIES.forEach((ab, i) => { char.abilities.base[ab] = arr[i]; });
					}
					if (id === "pointBuy") {
						ABILITIES.forEach(ab => { char.abilities.base[ab] = 8; });
					}
					syncFinalFromBase();
					setChar(char);
				},
			}));
		}
		box.append(methods);

		if (char.abilities.method === "pointBuy") {
			const rem = pointBuyRemaining(char.abilities.base);
			box.append(el("p", {
				class: rem < 0 ? "cc-error" : "cc-muted",
				text: `Point buy: ${pointBuyCostForScores(char.abilities.base)} / ${POINT_BUY_BUDGET} spent · ${rem} remaining`,
			}));
		}

		const grid = el("div", {class: "cc-ability-grid"});
		for (const ab of ABILITIES) {
			const cell = el("div", {class: "cc-ability-cell"});
			cell.append(el("div", {class: "cc-ability-name", text: ABILITY_FULL[ab]}));
			const input = el("input", {
				class: "cc-input cc-input-num",
				type: "number",
				min: "3",
				max: "20",
				value: String(char.abilities.base[ab]),
				onChange: (e) => {
					let v = Number(e.target.value);
					if (!Number.isFinite(v)) v = 8;
					if (char.abilities.method === "pointBuy") v = Math.min(15, Math.max(8, v));
					char.abilities.base[ab] = v;
					syncFinalFromBase();
					setChar(char);
				},
			});
			cell.append(input);
			cell.append(el("div", {
				class: "cc-ability-mod",
				text: formatMod(abilityMod(char.abilities.base[ab])),
			}));
			grid.append(cell);
		}
		box.append(grid);

		if (char.abilities.method === "standardArray") {
			box.append(el("p", {
				class: "cc-muted",
				text: `Standard array values: ${STANDARD_ARRAY.join(", ")}. Assign each once by typing them into the boxes.`,
			}));
		}
		return box;
	}

	function syncFinalFromBase () {
		for (const ab of ABILITIES) char.abilities[ab] = char.abilities.base[ab];
	}

	function stepSpecies () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Species"}));
		const selected = char.species.uid;
		const list = el("div", {class: "cc-picker-list"});
		for (const sp of data.species) {
			const uid = entityUid(sp);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${selected === uid ? "is-selected" : ""}`,
				onClick: () => {
					char.species.uid = uid;
					char.species.size = (sp.size && sp.size[0]) || "M";
					setChar(char);
				},
			});
			card.append(el("div", {class: "cc-pick-title", text: sp.name}));
			const speed = typeof sp.speed === "number" ? sp.speed : sp.speed?.walk || 30;
			card.append(el("div", {
				class: "cc-pick-meta",
				text: `Size ${(sp.size || []).join("/")} · Speed ${speed} ft.`,
			}));
			const traitNames = (sp.entries || [])
				.filter(e => e && e.name)
				.map(e => e.name)
				.slice(0, 6)
				.join(" · ");
			if (traitNames) card.append(el("div", {class: "cc-pick-detail", text: traitNames}));
			list.append(card);
		}
		box.append(list);

		if (selected) {
			const sp = data.getSpecies(selected);
			if (sp) {
				const detail = el("div", {class: "cc-detail-box"});
				detail.append(el("h3", {text: sp.name}));
				detail.append(el("pre", {class: "cc-prose", text: entriesToText(sp.entries)}));
				if (sp.size?.length > 1) {
					const sizeSel = el("select", {class: "cc-select"});
					for (const s of sp.size) {
						const o = el("option", {value: s, text: s});
						if (char.species.size === s) o.selected = true;
						sizeSel.append(o);
					}
					sizeSel.addEventListener("change", () => {
						char.species.size = sizeSel.value;
						setChar(char);
					});
					detail.append(field("Size", sizeSel));
				}
				box.append(detail);
			}
		}
		return box;
	}

	function stepBackground () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Background"}));
		const list = el("div", {class: "cc-picker-list"});
		for (const bg of data.backgrounds) {
			const uid = entityUid(bg);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${char.background.uid === uid ? "is-selected" : ""}`,
				onClick: () => {
					char.background.uid = uid;
					// origin feat
					const featKey = bg.feats?.[0] && Object.keys(bg.feats[0])[0];
					char.background.originFeatUid = featKey || null;
					char.background.abilityChoice = {mode: "2+1", assignments: {}, index: 0};
					const modes = backgroundAbilityModes(bg);
					if (modes[0]) {
						char.background.abilityChoice.mode = modes[0].mode;
						char.background.abilityChoice.index = 0;
					}
					char.background.equipmentPackage = "A";
					char.background.equipmentChoices = {};
					char.equipment = [];
					setChar(char);
				},
			});
			card.append(el("div", {class: "cc-pick-title", text: bg.name}));
			const featKey = bg.feats?.[0] && Object.keys(bg.feats[0])[0];
			const featName = featKey ? featKey.split("|")[0] : "";
			card.append(el("div", {
				class: "cc-pick-meta",
				text: featName ? `Origin feat: ${titleCase(featName)}` : "",
			}));
			list.append(card);
		}
		box.append(list);

		const bg = data.getBackground(char.background.uid);
		if (bg) {
			const detail = el("div", {class: "cc-detail-box"});
			detail.append(el("h3", {text: bg.name}));
			const feat = data.getFeat(char.background.originFeatUid);
			detail.append(el("p", {
				text: `Origin feat: ${feat?.name || char.background.originFeatUid || "—"}`,
			}));

			const modes = backgroundAbilityModes(bg);
			if (modes.length > 1) {
				const modeRow = el("div", {class: "cc-btn-row"});
				modes.forEach((m, i) => {
					modeRow.append(el("button", {
						type: "button",
						class: `cc-btn ${(char.background.abilityChoice?.index ?? 0) === i ? "cc-btn-primary" : ""}`,
						text: m.mode === "2+1" ? "+2 / +1" : m.mode === "1+1+1" ? "+1 / +1 / +1" : m.mode,
						onClick: () => {
							char.background.abilityChoice = {mode: m.mode, index: i, assignments: {}};
							setChar(char);
						},
					}));
				});
				detail.append(el("h4", {text: "Ability bonuses"}), modeRow);
			}

			const mode = modes[char.background.abilityChoice?.index ?? 0];
			if (mode && mode.mode !== "fixed") {
				detail.append(el("p", {
					class: "cc-muted",
					text: `Assign bonuses ${mode.weights.join(", ")} among: ${mode.from.map(a => a.toUpperCase()).join(", ")}`,
				}));
				const assigns = {...(char.background.abilityChoice.assignments || {})};
				// UI: for each weight, pick an ability
				const assignBox = el("div", {class: "cc-form-inline"});
				mode.weights.forEach((w, i) => {
					const sel = el("select", {class: "cc-select"});
					sel.append(el("option", {value: "", text: `+${w} →`}));
					for (const ab of mode.from) {
						sel.append(el("option", {value: ab, text: ab.toUpperCase()}));
					}
					sel.addEventListener("change", () => {
						// rebuild assignments from all selects
						const selects = [...assignBox.querySelectorAll("select")];
						const next = {};
						selects.forEach((s, idx) => {
							const ab = s.value;
							const weight = mode.weights[idx];
							if (!ab) return;
							next[ab] = (next[ab] || 0) + weight;
						});
						char.background.abilityChoice.assignments = next;
						// recompute final
						for (const ab of ABILITIES) {
							char.abilities[ab] = (char.abilities.base[ab] || 10) + (next[ab] || 0);
						}
						setChar(char);
					});
					assignBox.append(sel);
				});
				// preselect from existing assignments if possible
				const entries = Object.entries(char.background.abilityChoice.assignments || {});
				const flat = [];
				for (const [ab, bonus] of entries) {
					// expand into weights
					let rem = bonus;
					for (const w of [...mode.weights].sort((a, b) => b - a)) {
						if (rem >= w) {
							flat.push(ab);
							rem -= w;
						}
					}
				}
				[...assignBox.querySelectorAll("select")].forEach((s, i) => {
					if (flat[i]) s.value = flat[i];
				});
				detail.append(assignBox);
			}

			if (bg.startingEquipment) {
				detail.append(renderEquipmentPackages(bg.startingEquipment, "background"));
			}

			if (feat) {
				detail.append(el("h4", {text: feat.name}));
				detail.append(el("pre", {class: "cc-prose", text: entriesToText(feat.entries)}));
			}
			box.append(detail);
		}
		return box;
	}

	function stepClass () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Class"}));
		const list = el("div", {class: "cc-picker-list"});
		for (const cls of data.classes) {
			// skip sidekick for "normal" creator? include but deprioritize
			const uid = entityUid(cls);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${char.class.uid === uid ? "is-selected" : ""}`,
				onClick: () => {
					char.class.uid = uid;
					char.class.skillChoices = [];
					char.class.subclassUid = null;
					char.class.equipmentPackage = "A";
					char.class.equipmentChoices = {};
					char.feats = (char.feats || []).filter(f => f.levelGained !== 1 || f.uid === char.background.originFeatUid);
					// remove level-1 fighting styles when changing class
					char.feats = (char.feats || []).filter(f => {
						const feat = data.getFeat(f.uid);
						return !(f.levelGained === 1 && feat && String(feat.category || "").startsWith("FS"));
					});
					char.spells = {ability: cls.spellcastingAbility || null, cantrips: [], prepared: [], known: [], slotsUsed: {}};
					char.equipment = [];
					setChar(char);
				},
			});
			card.append(el("div", {class: "cc-pick-title", text: cls.name}));
			const hd = cls.hd ? `d${cls.hd.faces}` : "";
			const primary = (cls.primaryAbility || [])
				.map(p => Object.keys(p).filter(k => p[k] === true).map(k => k.toUpperCase()).join("/"))
				.filter(Boolean)
				.join(" or ");
			card.append(el("div", {
				class: "cc-pick-meta",
				text: [hd, primary && `Primary ${primary}`, cls.spellcastingAbility && "Spellcaster"].filter(Boolean).join(" · "),
			}));
			list.append(card);
		}
		box.append(list);

		const cls = data.getClass(char.class.uid);
		if (cls) {
			const detail = el("div", {class: "cc-detail-box"});
			detail.append(el("h3", {text: cls.name}));
			detail.append(el("p", {
				class: "cc-muted",
				text: `Hit Die d${cls.hd?.faces} · Saves ${(cls.proficiency || []).map(a => a.toUpperCase()).join(", ")}`,
			}));

			const {options, chooseCount} = classSkillOptions(cls);
			if (chooseCount > 0) {
				detail.append(el("h4", {text: `Skill proficiencies (choose ${chooseCount})`}));
				detail.append(multiCheck(options, {
					selected: char.class.skillChoices || [],
					max: chooseCount,
					label: (s) => titleCase(s),
					onChange: (vals) => {
						char.class.skillChoices = vals;
						setChar(char);
					},
				}));
			}

			// Fighting style
			const fsAt1 = (cls.featProgression || []).some(b =>
				b.category?.some(c => String(c).startsWith("FS")) && (b.progression?.["1"] || b.progression?.[1]),
			);
			if (fsAt1) {
				detail.append(el("h4", {text: "Fighting Style"}));
				const styles = data.fightingStyleFeats();
				const currentFs = (char.feats || []).find(f => {
					const feat = data.getFeat(f.uid);
					return f.levelGained === 1 && feat && String(feat.category || "").startsWith("FS");
				});
				const fsList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
				for (const feat of styles) {
					const uid = entityUid(feat);
					const btn = el("button", {
						type: "button",
						class: `cc-pick ${currentFs?.uid === uid ? "is-selected" : ""}`,
						onClick: () => {
							char.feats = (char.feats || []).filter(f => {
								const ft = data.getFeat(f.uid);
								return !(f.levelGained === 1 && ft && String(ft.category || "").startsWith("FS"));
							});
							char.feats.push({uid, levelGained: 1, choices: {}});
							setChar(char);
						},
					});
					btn.append(el("div", {class: "cc-pick-title", text: feat.name}));
					fsList.append(btn);
				}
				detail.append(fsList);
			}

			// Equipment packages
			if (cls.startingEquipment) {
				detail.append(renderEquipmentPackages(cls.startingEquipment, "class"));
			}

			// Level 1 spells for casters
			if (cls.cantripProgression || cls.preparedSpellsProgression || cls.spellsKnownProgression) {
				detail.append(el("h4", {text: "Spells (level 1)"}));
				const cantripN = cls.cantripProgression?.[0] || 0;
				const preparedN = cls.preparedSpellsProgression?.[0] || 0;
				const knownN = cls.spellsKnownProgression?.[0] || 0;
				if (cantripN) {
					detail.append(el("p", {class: "cc-muted", text: `Choose ${cantripN} cantrips`}));
					const cantrips = data.spellsForClass(cls.name, {cantripsOnly: true});
					detail.append(multiCheck(cantrips, {
						value: (sp) => entityUid(sp),
						label: (sp) => sp.name,
						selected: char.spells.cantrips || [],
						max: cantripN,
						onChange: (vals) => {
							char.spells.cantrips = vals;
							setChar(char);
						},
					}));
				}
				if (preparedN) {
					detail.append(el("p", {class: "cc-muted", text: `Prepare ${preparedN} level 1 spells`}));
					const spells = data.spellsForClass(cls.name, {maxLevel: 1}).filter(s => s.level > 0);
					detail.append(multiCheck(spells, {
						value: (sp) => entityUid(sp),
						label: (sp) => `${sp.name} (${sp.level})`,
						selected: char.spells.prepared || [],
						max: preparedN,
						onChange: (vals) => {
							char.spells.prepared = vals;
							setChar(char);
						},
					}));
				} else if (knownN) {
					detail.append(el("p", {class: "cc-muted", text: `Know ${knownN} spells`}));
					const spells = data.spellsForClass(cls.name, {maxLevel: 1}).filter(s => s.level > 0);
					detail.append(multiCheck(spells, {
						value: (sp) => entityUid(sp),
						label: (sp) => `${sp.name} (${sp.level})`,
						selected: char.spells.known || [],
						max: knownN,
						onChange: (vals) => {
							char.spells.known = vals;
							setChar(char);
						},
					}));
				}
			}

			// Subclass: pick now if unlocked at 1; otherwise list what's available later
			const unlock = subclassUnlockLevel(cls);
			const subs = data.subclassesForClass(cls);
			if (subs.length) {
				detail.append(el("h4", {text: cls.subclassTitle || "Subclass"}));
				if (unlock <= 1) {
					detail.append(el("p", {
						class: "cc-muted",
						text: `Choose your ${cls.subclassTitle || "subclass"} (unlocked at level 1).`,
					}));
					const subList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
					for (const sc of subs) {
						const uid = subclassUid(sc);
						const btn = el("button", {
							type: "button",
							class: `cc-pick ${char.class.subclassUid === uid ? "is-selected" : ""}`,
							onClick: () => {
								char.class.subclassUid = uid;
								setChar(char);
							},
						});
						btn.append(el("div", {class: "cc-pick-title", text: sc.name}));
						btn.append(el("div", {class: "cc-pick-meta", text: sc.source || ""}));
						subList.append(btn);
					}
					detail.append(subList);
				} else {
					detail.append(el("p", {
						class: "cc-muted",
						text: `${cls.name} chooses a ${cls.subclassTitle || "subclass"} at level ${unlock}. Options: ${subs.map(s => s.name).join(", ")}. You’ll pick one when you level up (or from the sheet).`,
					}));
				}
			}

			box.append(detail);
		}
		return box;
	}

	function stepReview () {
		recomputeCharacter(char, data);
		// rebuild equipment
		char.equipment = [];
		recomputeCharacter(char, data);

		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Review"}));
		const cls = data.getClass(char.class.uid);
		const sp = data.getSpecies(char.species.uid);
		const bg = data.getBackground(char.background.uid);
		const sub = char.class.subclassUid ? data.getSubclass(char.class.subclassUid) : null;
		const lines = [
			`${char.identity.name || "Unnamed"} · Level 1 ${sp?.name || "?"} ${cls?.name || "?"}${sub ? ` (${sub.name})` : ""}`,
			`Background: ${bg?.name || "—"} · Origin: ${data.getFeat(char.background.originFeatUid)?.name || "—"}`,
			`Abilities: ${ABILITIES.map(a => `${a.toUpperCase()} ${char.abilities[a]} (${formatMod(abilityMod(char.abilities[a]))})`).join(" · ")}`,
			`Skills: ${(char.class.skillChoices || []).map(titleCase).join(", ") || "—"}`,
			`HP: ${char.class.hpMax || "—"} · Equipment: ${(char.equipment || []).length} items`,
			cls ? `Subclass: ${sub?.name || `(choose at level ${subclassUnlockLevel(cls)})`}` : "",
		].filter(Boolean);
		for (const line of lines) box.append(el("p", {text: line}));
		box.append(el("p", {
			class: "cc-muted",
			text: "Create the character to open the sheet. You can save JSON, level up, pick a subclass, and export PDF from there.",
		}));
		return box;
	}

	function field (label, control) {
		const wrap = el("label", {class: "cc-field"});
		wrap.append(el("span", {class: "cc-field-label", text: label}), control);
		return wrap;
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
