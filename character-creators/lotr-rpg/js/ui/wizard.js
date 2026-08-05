import {
	ABILITIES,
	ABILITY_FULL,
	STANDARD_ARRAY,
	POINT_BUY_BUDGET,
	pointBuyRemaining,
	pointBuyCostForScores,
	formatMod,
	abilityMod,
	formatAbilityBonus,
} from "../rules.js";
import {
	createEmptyCharacter,
	recomputeCharacter,
	classSkillOptions,
	entityUid,
	entriesToText,
	finalizeLevelOne,
	subclassUid,
	missingEquipmentTypePicks,
	CALLING_SHADOW_PATHS,
	backgroundDistinctiveFeatures,
} from "../character.js";
import {toUid} from "../data.js";
import {el, clear, multiCheck} from "./pickers.js";
import {mountSourceBanner, mountSourceSelectorModal} from "../../../shared/sources.js";
import {openPortraitModal} from "../../../shared/portrait.js";
import {showAlertModal} from "../../../shared/ui-modal.js";

const STEPS = [
	{id: "identity", title: "Identity"},
	{id: "abilities", title: "Abilities"},
	{id: "culture", title: "Culture"},
	{id: "background", title: "Background"},
	{id: "class", title: "Calling"},
	{id: "review", title: "Review"},
];

export function mountWizard (root, {data, character, onChange, onComplete}) {
	let step = 0;
	let char = character || createEmptyCharacter();

	const setChar = (c) => { char = c; onChange?.(char); render(); };
	const patchChar = (fn) => { fn(char); onChange?.(char); };

	const openSourceModal = () => {
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
	};

	const render = () => {
		const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

		clear(root);

		const banner = mountSourceBanner({
			enabledSources: char.sources || ["TLotRR", "MECultures", "PHB", "XPHB"],
			onOpenModal: openSourceModal,
			el,
		});
		root.append(banner);

		const nav = el("div", {class: "cc-steps"});
		STEPS.forEach((s, i) => {
			nav.append(el("button", {
				type: "button",
				class: `cc-step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`,
				text: `${i + 1}. ${s.title}`,
				onClick: () => { if (i <= step) { step = i; render(); } },
			}));
		});
		root.append(nav);

		const panel = el("div", {class: "cc-panel"});
		const id = STEPS[step].id;
		if (id === "identity") panel.append(stepIdentity());
		if (id === "abilities") panel.append(stepAbilities());
		if (id === "culture") panel.append(stepCulture());
		if (id === "background") panel.append(stepBackground());
		if (id === "class") panel.append(stepClass());
		if (id === "review") panel.append(stepReview());

		const footer = el("div", {class: "cc-wizard-footer"});
		if (step > 0) {
			footer.append(el("button", {type: "button", class: "cc-btn", text: "Back", onClick: () => { step--; render(); }}));
		} else footer.append(el("span"));
		footer.append(el("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: step === STEPS.length - 1 ? "Create hero" : "Next",
			onClick: () => {
				const err = validateStep(STEPS[step].id);
				if (err) { alert(err); return; }
				if (step === STEPS.length - 1) {
					try {
						const finalChar = finalizeLevelOne(char, data);
						onComplete?.(finalChar);
					} catch (e) {
						alert(`Error creating character: ${e.message}`);
					}
				} else {
					step++;
					render();
				}
			},
		}));
		panel.append(footer);
		root.append(panel);

		window.scrollTo({ top: scrollY, behavior: "instant" });
		requestAnimationFrame(() => {
			window.scrollTo({ top: scrollY, behavior: "instant" });
		});
	};

	function validateStep (id) {
		if (id === "identity" && !char.identity.name?.trim()) return "Enter a name for your hero.";
		if (id === "abilities") {
			if (char.abilities.method === "pointBuy") {
				const rem = pointBuyRemaining(char.abilities.base);
				if (rem < 0) return "Point buy is over budget.";
				if (rem > 0) return `You still have ${rem} point-buy points to spend.`;
			}
		}
		if (id === "culture") {
			if (!char.culture.raceUid) return "Choose a culture (race).";
			const race = data.getRace(char.culture.raceUid);
			const subs = data.subracesForRace(race);
			if (subs.length && !char.culture.subraceUid) return "Choose a subculture / kindred.";
			if (!char.culture.startingVirtueUid) return "Choose a starting virtue.";
		}
		if (id === "background" && !char.background.uid) return "Choose a background.";
		if (id === "class") {
			if (!char.class.uid) return "Choose a calling (class).";
			const cls = data.getClass(char.class.uid);
			const {chooseCount} = classSkillOptions(cls);
			if ((char.class.skillChoices || []).length < chooseCount) {
				return `Pick ${chooseCount} skill${chooseCount === 1 ? "" : "s"}.`;
			}
			const missEq = missingEquipmentTypePicks(char, data);
			if (missEq.length) {
				return `Choose equipment: ${[...new Set(missEq)].join(", ")}.`;
			}
		}
		return null;
	}

	function ensureEquipmentChoicesShape () {
		if (!char.class.equipmentChoices || Array.isArray(char.class.equipmentChoices)) {
			char.class.equipmentChoices = {packages: {}, typePicks: {}};
		}
		if (!char.class.equipmentChoices.packages) char.class.equipmentChoices.packages = {};
		if (!char.class.equipmentChoices.typePicks) char.class.equipmentChoices.typePicks = {};
		// migrate legacy flat package map
		for (const [k, v] of Object.entries(char.class.equipmentChoices)) {
			if (k === "packages" || k === "typePicks") continue;
			if (typeof v === "string") {
				char.class.equipmentChoices.packages[k] = v;
				delete char.class.equipmentChoices[k];
			}
		}
	}

	/** Render starting equipment with A/B radios and type-pick dropdowns. */
	function renderEquipmentUi (cls) {
		ensureEquipmentChoicesShape();
		const wrap = el("div", {class: "cc-equip-packages"});
		wrap.append(el("h4", {text: "Starting equipment"}));
		const blocks = data.classEquipmentChoices(cls);
		if (!blocks.length) return wrap;

		for (const block of blocks) {
			const box = el("div", {class: "cc-equip-pack"});
			box.append(el("div", {class: "cc-equip-pack-title", text: block.label}));

			const selectedOptId = char.class.equipmentChoices.packages[block.id]
				|| block.options[0]?.id
				|| "_";

			if (!block.isFixed && block.options.length > 1) {
				for (const opt of block.options) {
					const id = `eq-${block.id}-${opt.id}`;
					const lab = el("label", {class: "cc-check", for: id});
					const input = el("input", {
						type: "radio",
						name: `eq-${block.id}`,
						id,
						value: opt.id,
					});
					if (selectedOptId === opt.id) input.checked = true;
					input.addEventListener("change", () => {
						ensureEquipmentChoicesShape();
						char.class.equipmentChoices.packages[block.id] = opt.id;
						// clear type picks for this block's other options
						for (const key of Object.keys(char.class.equipmentChoices.typePicks)) {
							if (key.startsWith(`${block.id}:`) && !key.startsWith(`${block.id}:${opt.id}:`)) {
								delete char.class.equipmentChoices.typePicks[key];
							}
						}
						char.equipment = [];
						setChar(char);
					});
					lab.append(input, el("span", {text: `${opt.label}: ${opt.summary}`}));
					box.append(lab);
				}
			} else {
				// Fixed package — show line items
				const opt = block.options[0];
				if (opt) {
					box.append(el("p", {class: "cc-muted", text: opt.summary}));
					char.class.equipmentChoices.packages[block.id] = opt.id;
				}
			}

			// Type pickers for the currently selected option
			const activeOpt = block.options.find(o => o.id === selectedOptId) || block.options[0];
			if (activeOpt) {
				const typeParts = activeOpt.parts.filter(p => p.kind === "type");
				if (typeParts.length) {
					const picks = el("div", {class: "cc-equip-type-picks"});
					for (const part of typeParts) {
						const pickKey = `${block.id}:${activeOpt.id}:${part.pickKey ?? `${part.index}.${part.slot || 0}`}`;
						const row = el("label", {class: "cc-field"});
						row.append(el("span", {
							class: "cc-field-label",
							text: `Choose ${part.label}`,
						}));
						const sel = el("select", {class: "cc-select"});
						sel.append(el("option", {value: "", text: `— ${part.label} —`}));
						const opts = part.options?.length
							? part.options
							: data.itemsForEquipmentType(part.equipmentType);
						// Prefer TLotRR display names; show source when duplicates exist
						const nameCounts = opts.reduce((m, it) => {
							m[it.name] = (m[it.name] || 0) + 1;
							return m;
						}, {});
						for (const it of opts) {
							const uid = entityUid(it);
							const label = nameCounts[it.name] > 1
								? `${it.name} (${it.source})`
								: it.name;
							const o = el("option", {value: uid, text: label});
							if (char.class.equipmentChoices.typePicks[pickKey] === uid) o.selected = true;
							sel.append(o);
						}
						if (!opts.length) {
							sel.append(el("option", {
								value: "",
								text: "(no matching items in data — type a name later)",
								disabled: true,
							}));
						}
						sel.addEventListener("change", () => {
							ensureEquipmentChoicesShape();
							if (sel.value) char.class.equipmentChoices.typePicks[pickKey] = sel.value;
							else delete char.class.equipmentChoices.typePicks[pickKey];
							char.equipment = [];
							setChar(char);
						});
						row.append(sel);
						picks.append(row);
					}
					box.append(picks);
				}
			}
			wrap.append(box);
		}
		return wrap;
	}

	function field (label, control) {
		const wrap = el("label", {class: "cc-field"});
		wrap.append(el("span", {class: "cc-field-label", text: label}), control);
		return wrap;
	}

	function titleCase (s) {
		return String(s).replace(/\b\w/g, c => c.toUpperCase());
	}

	function stepIdentity () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Identity & Physical Appearance"}));
		box.append(el("p", {class: "cc-muted", text: "A hero of Middle-earth — Free League’s The Lord of the Rings Roleplaying (5e)."}));
		
		const nameGrid = el("div", {class: "cc-identity-header-grid"});
		const portraitFrame = el("div", {
			class: "cc-portrait-frame",
			title: "Click to set hero portrait",
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

		const fieldsBox = el("div", {class: "cc-identity-fields"});
		fieldsBox.append(field("Hero name", el("input", {
			class: "cc-input", value: char.identity.name || "",
			placeholder: "e.g. Buddy, Aragorn, Gimli…",
			onInput: (e) => patchChar(c => { c.identity.name = e.target.value; }),
		})));
		fieldsBox.append(field("Player name", el("input", {
			class: "cc-input", value: char.identity.playerName || "",
			placeholder: "Player name",
			onInput: (e) => patchChar(c => { c.identity.playerName = e.target.value; }),
		})));
		nameGrid.append(fieldsBox);
		box.append(nameGrid);

		box.append(el("h3", {text: "Physical Characteristics", style: "margin-top: 1rem;"}));
		const physGrid = el("div", {class: "cc-currency-grid", style: "gap: 0.75rem;"});
		physGrid.append(field("Age", el("input", {
			class: "cc-input", value: char.identity.age || "", placeholder: "e.g. 28",
			onInput: (e) => patchChar(c => { c.identity.age = e.target.value; }),
		})));
		physGrid.append(field("Height", el("input", {
			class: "cc-input", value: char.identity.height || "", placeholder: "e.g. 5' 10\"",
			onInput: (e) => patchChar(c => { c.identity.height = e.target.value; }),
		})));
		physGrid.append(field("Weight", el("input", {
			class: "cc-input", value: char.identity.weight || "", placeholder: "e.g. 165 lbs",
			onInput: (e) => patchChar(c => { c.identity.weight = e.target.value; }),
		})));
		physGrid.append(field("Eyes", el("input", {
			class: "cc-input", value: char.identity.eyes || "", placeholder: "e.g. Grey",
			onInput: (e) => patchChar(c => { c.identity.eyes = e.target.value; }),
		})));
		physGrid.append(field("Skin", el("input", {
			class: "cc-input", value: char.identity.skin || "", placeholder: "e.g. Fair",
			onInput: (e) => patchChar(c => { c.identity.skin = e.target.value; }),
		})));
		physGrid.append(field("Hair", el("input", {
			class: "cc-input", value: char.identity.hair || "", placeholder: "e.g. Dark",
			onInput: (e) => patchChar(c => { c.identity.hair = e.target.value; }),
		})));
		box.append(physGrid);

		// Heir & Legacy System Header with Info Modal
		const heirHeaderRow = el("div", {style: "display: flex; align-items: center; gap: 0.5rem; margin-top: 1.25rem;"});
		heirHeaderRow.append(el("h3", {text: "Heir & Legacy System", style: "margin: 0;"}));
		heirHeaderRow.append(el("button", {
			type: "button",
			class: "cc-btn-icon-subtle",
			text: "❓",
			title: "Info about Heir & Legacy System",
			onClick: () => showAlertModal(
				"👑 Heir & Legacy System",
				"In Middle-earth, your hero can choose a designated Heir (a relative, friend, or ward) and invest treasure or heirlooms into a Legacy during Fellowship Phases. If your hero falls or retires, their Heir steps forward as your new player character with inherited standing and legacy equipment.\n\n💡 Note: Heir & Legacy can be left blank during character creation and added or updated later during your campaign fellowship phases!",
				el
			),
		}));
		box.append(heirHeaderRow);

		const heirGrid = el("div", {class: "cc-sheet-cols"});
		heirGrid.append(field("Heir Name", el("input", {
			class: "cc-input", value: char.identity.heirName || "", placeholder: "Name of chosen heir (optional)",
			onInput: (e) => patchChar(c => { c.identity.heirName = e.target.value; }),
		})));
		heirGrid.append(field("Investment", el("input", {
			class: "cc-input", value: char.identity.investment || "", placeholder: "Legacy investment / treasure (optional)",
			onInput: (e) => patchChar(c => { c.identity.investment = e.target.value; }),
		})));
		box.append(heirGrid);

		// Patron Header with Info Modal
		const patronHeaderRow = el("div", {style: "display: flex; align-items: center; gap: 0.5rem; margin-top: 1.25rem;"});
		patronHeaderRow.append(el("h3", {text: "Patron", style: "margin: 0;"}));
		patronHeaderRow.append(el("button", {
			type: "button",
			class: "cc-btn-icon-subtle",
			text: "❓",
			title: "Info about Patrons",
			onClick: () => showAlertModal(
				"🏛️ Patrons of Middle-earth",
				"Patrons are influential figures of the Free Peoples (such as Gandalf the Grey, Elrond of Rivendell, Bilbo Baggins, Círdan, or King Bard) who guide and support your Company. Choosing a Patron provides your company with Fellowship Phase benefits, refuge, and guidance.\n\n💡 Note: You can select a Patron now or leave it blank and choose one later when your Company forms during campaign play!",
				el
			),
		}));
		box.append(patronHeaderRow);

		const traitGrid = el("div", {class: "cc-sheet-cols"});
		traitGrid.append(field("Patron Name", el("input", {
			class: "cc-input", value: char.identity.patron || "", placeholder: "e.g. Gandalf, Elrond, Bilbo… (optional)",
			onInput: (e) => patchChar(c => { c.identity.patron = e.target.value; }),
		})));
		box.append(traitGrid);
		return box;
	}

	function stepAbilities () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Ability scores"}));
		box.append(el("p", {class: "cc-muted", text: "Base scores. Cultural bonuses apply when you pick a culture."}));
		const methods = el("div", {class: "cc-btn-row"});
		for (const [id, label] of [["standardArray", "Standard Array"], ["pointBuy", "Point Buy"], ["manual", "Manual"]]) {
			methods.append(el("button", {
				type: "button",
				class: `cc-btn ${char.abilities.method === id ? "cc-btn-primary" : ""}`,
				text: label,
				onClick: () => {
					char.abilities.method = id;
					if (id === "standardArray") ABILITIES.forEach((ab, i) => { char.abilities.base[ab] = STANDARD_ARRAY[i]; });
					if (id === "pointBuy") ABILITIES.forEach(ab => { char.abilities.base[ab] = 8; });
					ABILITIES.forEach(ab => { char.abilities[ab] = char.abilities.base[ab]; });
					setChar(char);
				},
			}));
		}
		box.append(methods);
		if (char.abilities.method === "pointBuy") {
			const rem = pointBuyRemaining(char.abilities.base);
			box.append(el("p", {
				class: rem < 0 ? "cc-error" : "cc-muted",
				text: `Point buy: ${pointBuyCostForScores(char.abilities.base)} / ${POINT_BUY_BUDGET} · ${rem} remaining`,
			}));
		}
		const grid = el("div", {class: "cc-ability-grid"});
		for (const ab of ABILITIES) {
			const cell = el("div", {class: "cc-ability-cell"});
			cell.append(el("div", {class: "cc-ability-name", text: ABILITY_FULL[ab]}));
			cell.append(el("input", {
				class: "cc-input cc-input-num", type: "number", min: "3", max: "20",
				value: String(char.abilities.base[ab]),
				onChange: (e) => {
					let v = Number(e.target.value);
					if (!Number.isFinite(v)) v = 8;
					if (char.abilities.method === "pointBuy") v = Math.min(15, Math.max(8, v));
					char.abilities.base[ab] = v;
					char.abilities[ab] = v;
					setChar(char);
				},
			}));
			cell.append(el("div", {class: "cc-ability-mod", text: formatMod(abilityMod(char.abilities.base[ab]))}));
			grid.append(cell);
		}
		box.append(grid);
		return box;
	}

	function stepCulture () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Culture"}));
		const list = el("div", {class: "cc-picker-list"});
		for (const race of data.races) {
			const uid = entityUid(race);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${char.culture.raceUid === uid ? "is-selected" : ""}`,
				onClick: () => {
					char.culture.raceUid = uid;
					char.culture.subraceUid = null;
					char.culture.startingVirtueUid = null;
					char.culture.abilityChoice = {};
					char.culture.size = race.size?.[0] || "M";
					char.background.uid = null;
					char.equipment = [];
					setChar(char);
				},
			});
			card.append(el("div", {class: "cc-pick-title", text: race.name}));
			const speed = typeof race.speed === "number" ? race.speed : 30;
			const raceBonus = formatAbilityBonus(race.ability);
			const skills = (race.skillProficiencies || [])
				.flatMap(block => Object.entries(block)
					.filter(([, v]) => v === true)
					.map(([k]) => titleCase(k.replace(/\|.*$/, ""))))
				.join(", ");
			card.append(el("div", {
				class: "cc-pick-meta",
				text: [
					`Size ${(race.size || ["?"]).join("/")}`,
					`Speed ${speed} ft.`,
					raceBonus || null,
					skills ? `Skill: ${skills}` : null,
				].filter(Boolean).join(" · "),
			}));
			list.append(card);
		}
		box.append(list);

		const race = data.getRace(char.culture.raceUid);
		if (race) {
			const detail = el("div", {class: "cc-detail-box"});
			detail.append(el("h3", {text: race.name}));
			detail.append(el("pre", {class: "cc-prose", text: entriesToText(race.entries)}));

			const subs = data.subracesForRace(race);
			if (subs.length) {
				detail.append(el("h4", {text: "Kindred / subculture"}));
				const subList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
				for (const sub of subs) {
					const uid = toUid(sub.name, sub.source);
					const btn = el("button", {
						type: "button",
						class: `cc-pick ${char.culture.subraceUid === uid ? "is-selected" : ""}`,
						onClick: () => { char.culture.subraceUid = uid; setChar(char); },
					});
					btn.append(el("div", {class: "cc-pick-title", text: sub.name}));
					const bonus = formatAbilityBonus(sub.ability);
					if (bonus) {
						btn.append(el("div", {class: "cc-pick-meta", text: bonus}));
					}
					subList.append(btn);
				}
				detail.append(subList);
			}

			const selectedSub = char.culture.subraceUid
				? data.subraces.find(s => toUid(s.name, s.source) === String(char.culture.subraceUid).toLowerCase())
				: null;

			if (selectedSub?.ability?.some(b => b.choose)) {
				detail.append(el("h4", {text: `${selectedSub.name} Bonus Choice`}));
				detail.append(el("p", {
					class: "cc-muted",
					text: `Select your +1 flexible ability score bonus for ${selectedSub.name}:`,
				}));
				const chooseBlock = selectedSub.ability.find(b => b.choose).choose;
				const fromStats = chooseBlock.from || ["str", "con", "int", "wis", "cha"];
				const sel = el("select", {class: "cc-select"});
				sel.append(el("option", {value: "", text: "-- Choose +1 Stat --"}));
				for (const ab of fromStats) {
					const opt = el("option", {value: ab, text: `+1 ${ab.toUpperCase()}`});
					if (char.culture.abilityChoice?.[ab] === 1) opt.selected = true;
					sel.append(opt);
				}
				sel.addEventListener("change", () => {
					char.culture.abilityChoice = sel.value ? {[sel.value]: 1} : {};
					setChar(char);
				});
				detail.append(sel);
			}

			// Ranger-style ability choice (simplified: use first weighted option if present)
			if (race.ability?.some(b => b.choose?.weighted)) {
				detail.append(el("h4", {text: "Cultural ability bonuses"}));
				detail.append(el("p", {
					class: "cc-muted",
					text: "This culture uses flexible ability bonuses. Assign +2/+1/+1 among STR, CON, WIS (or use the fixed +1 trio + free +1 if you prefer the alternate package).",
				}));
				// Offer simple mode: assign +2, +1, +1 to str/con/wis
				const from = ["str", "con", "wis"];
				const weights = [2, 1, 1];
				const assignBox = el("div", {class: "cc-form-inline"});
				weights.forEach((w, i) => {
					const sel = el("select", {class: "cc-select"});
					sel.append(el("option", {value: "", text: `+${w} →`}));
					for (const ab of from) sel.append(el("option", {value: ab, text: ab.toUpperCase()}));
					sel.addEventListener("change", () => {
						const selects = [...assignBox.querySelectorAll("select")];
						const next = {};
						selects.forEach((s, idx) => {
							if (!s.value) return;
							next[s.value] = (next[s.value] || 0) + weights[idx];
						});
						char.culture.abilityChoice = next;
						setChar(char);
					});
					assignBox.append(sel);
				});
				detail.append(assignBox);
			}

			detail.append(el("h4", {text: "Starting virtue"}));
			detail.append(el("p", {class: "cc-muted", text: "Common virtues and your cultural virtues."}));
			const selectedSub = char.culture.subraceUid
				? data.subraces.find(s => toUid(s.name, s.source) === String(char.culture.subraceUid).toLowerCase())
				: null;
			const virtues = data.virtuesForRace(race, {subrace: selectedSub});
			const vList = el("div", {class: "cc-picker-list cc-picker-list-compact"});
			for (const feat of virtues) {
				const uid = entityUid(feat);
				const btn = el("button", {
					type: "button",
					class: `cc-pick ${char.culture.startingVirtueUid === uid ? "is-selected" : ""}`,
					onClick: () => { char.culture.startingVirtueUid = uid; setChar(char); },
				});
				btn.append(el("div", {class: "cc-pick-title", text: feat.name}));
				btn.append(el("div", {class: "cc-pick-meta", text: feat.category || "Virtue"}));
				vList.append(btn);
			}
			detail.append(vList);
			if (char.culture.startingVirtueUid) {
				const feat = data.getFeat(char.culture.startingVirtueUid);
				if (feat) detail.append(el("pre", {class: "cc-prose", text: entriesToText(feat.entries)}));
			}
			box.append(detail);
		}
		return box;
	}

	function stepBackground () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Background"}));
		const race = data.getRace(char.culture.raceUid);
		const bgs = data.backgroundsForRace(race);
		const list = el("div", {class: "cc-picker-list"});
		for (const bg of bgs) {
			const uid = entityUid(bg);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${char.background.uid === uid ? "is-selected" : ""}`,
				onClick: () => { char.background.uid = uid; char.equipment = []; setChar(char); },
			});
			card.append(el("div", {class: "cc-pick-title", text: bg.name}));
			const skills = (bg.skillProficiencies || [])
				.flatMap(block => Object.entries(block).filter(([, v]) => v === true).map(([k]) => titleCase(k)))
				.join(", ");
			const features = backgroundDistinctiveFeatures(bg);
			const meta = [skills ? `Skills: ${skills}` : null, features ? `Traits: ${features}` : null].filter(Boolean).join(" · ");
			if (meta) card.append(el("div", {class: "cc-pick-meta", text: meta}));
			list.append(card);
		}
		box.append(list);
		const bg = data.getBackground(char.background.uid);
		if (bg) {
			const detail = el("div", {class: "cc-detail-box"});
			detail.append(el("h3", {text: bg.name}));
			detail.append(el("pre", {class: "cc-prose", text: entriesToText(bg.entries)}));
			box.append(detail);
		}
		return box;
	}

	function stepClass () {
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Calling (class)"}));
		const list = el("div", {class: "cc-picker-list"});
		for (const cls of data.classes) {
			const uid = entityUid(cls);
			const card = el("button", {
				type: "button",
				class: `cc-pick ${char.class.uid === uid ? "is-selected" : ""}`,
				onClick: () => {
					char.class.uid = uid;
					char.class.skillChoices = [];
					char.class.subclassUid = null;
					char.class.equipmentChoices = {packages: {}, typePicks: {}};
					char.equipment = [];
					setChar(char);
				},
			});
			const shadowPath = CALLING_SHADOW_PATHS[cls.name.toLowerCase()] || "—";
			card.append(el("div", {class: "cc-pick-title", text: cls.name}));
			card.append(el("div", {
				class: "cc-pick-meta",
				text: `d${cls.hd?.faces} · Shadow Path: ${shadowPath} · Saves ${(cls.proficiency || []).map(a => a.toUpperCase()).join(", ")}`,
			}));
			list.append(card);
		}
		box.append(list);

		const cls = data.getClass(char.class.uid);
		if (cls) {
			const detail = el("div", {class: "cc-detail-box"});
			const shadowPath = CALLING_SHADOW_PATHS[cls.name.toLowerCase()] || "—";
			detail.append(el("h3", {text: `${cls.name} (Shadow Path: ${shadowPath})`}));
			const {options, chooseCount} = classSkillOptions(cls);
			if (chooseCount > 0) {
				detail.append(el("h4", {text: `Skill proficiencies (choose ${chooseCount})`}));
				detail.append(multiCheck(options, {
					selected: char.class.skillChoices || [],
					max: chooseCount,
					label: (s) => titleCase(s),
					onChange: (vals) => { char.class.skillChoices = vals; setChar(char); },
				}));
			}

			detail.append(renderEquipmentUi(cls));

			const unlock = 3;
			const subs = data.subclassesForClass(cls);
			if (subs.length) {
				detail.append(el("p", {
					class: "cc-muted",
					text: `${cls.subclassTitle || "Subclass"} options at level ${unlock}: ${subs.map(s => s.name).join(", ")}.`,
				}));
			}
			box.append(detail);
		}
		return box;
	}

	function stepReview () {
		char.equipment = [];
		recomputeCharacter(char, data);
		const box = el("div", {class: "cc-form"});
		box.append(el("h2", {text: "Review"}));
		const race = data.getRace(char.culture.raceUid);
		const cls = data.getClass(char.class.uid);
		const bg = data.getBackground(char.background.uid);
		const virtue = data.getFeat(char.culture.startingVirtueUid);
		const lines = [
			`${char.identity.name || "Unnamed"} · Level 1 ${race?.name || "?"} ${cls?.name || "?"}`,
			`Background: ${bg?.name || "—"} · Virtue: ${virtue?.name || "—"}`,
			`Abilities: ${ABILITIES.map(a => `${a.toUpperCase()} ${char.abilities[a]} (${formatMod(abilityMod(char.abilities[a]))})`).join(" · ")}`,
			`Skills: ${(char.class.skillChoices || []).map(titleCase).join(", ") || "—"}`,
			`HP: ${char.class.hpMax || "—"} · Gear lines: ${(char.equipment || []).length}`,
		];
		for (const line of lines) box.append(el("p", {text: line}));
		box.append(el("p", {
			class: "cc-muted",
			text: "Create the hero to open the sheet. You can level up, pick titles/ways, gain virtues, save JSON, and export PDF.",
		}));
		return box;
	}

	render();
	return {getCharacter: () => char, setCharacter: (c) => { char = c; render(); }};
}
