/**
 * Shared equipment list editor for character sheets.
 * Works with a string[] inventory (display lines, supporting "[E]" suffix for equipped).
 *
 * @param {object} opts
 * @param {string[]} opts.equipment
 * @param {(lines: string[]) => void} opts.onChange
 * @param {() => {name: string, source?: string, uid?: string, typeLabel?: string, rawItem?: object}[]} [opts.getCatalog]
 * @param {(tag: string, attrs?: object, children?: any) => HTMLElement} opts.el
 */

export function mountEquipmentEditor ({
	equipment = [],
	onChange,
	getCatalog = null,
	el,
}) {
	let lines = (equipment || []).map(s => String(s)).filter(Boolean);
	let filter = "";
	let customText = "";
	let customQty = 1;

	const root = el("div", {class: "cc-eq-editor"});

	const emit = () => onChange?.(lines.slice());

	const parseLine = (lineStr) => {
		const isEquipped = /\[E\]\s*$/i.test(lineStr);
		const cleanLine = lineStr.replace(/\s*\[E\]\s*$/i, "").trim();
		const matchQty = cleanLine.match(/^(\d+)[×x]\s*(.+)$/i);
		const qty = matchQty ? parseInt(matchQty[1], 10) : 1;
		const name = matchQty ? matchQty[2].trim() : cleanLine;
		return {isEquipped, cleanLine, name, qty};
	};

	const formatLine = ({name, qty = 1, isEquipped = false}) => {
		const qtyStr = qty > 1 ? `${qty}× ` : "";
		const eqStr = isEquipped ? " [E]" : "";
		return `${qtyStr}${name}${eqStr}`;
	};

	const render = () => {
		root.innerHTML = "";

		// Header actions
		const head = el("div", {class: "cc-eq-head", style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;"});
		const titleGroup = el("div", {style: "display: flex; align-items: baseline; gap: 0.5rem;"});
		titleGroup.append(el("h3", {text: "Equipment", style: "margin: 0;"}));
		titleGroup.append(el("span", {class: "cc-muted", text: `${lines.length} item${lines.length === 1 ? "" : "s"}`}));
		head.append(titleGroup);

		head.append(el("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: "➕ Add Item",
			onClick: () => {
				openAddItemModal({
					getCatalog,
					onAddItem: (line) => {
						lines.push(line);
						emit();
						render();
					},
					el,
				});
			},
		}));
		root.append(head);

		// List
		const list = el("ul", {class: "cc-eq-list"});
		if (!lines.length) {
			list.append(el("li", {class: "cc-eq-empty cc-muted", text: "No equipment yet. Click “➕ Add Item” above to add items."}));
		} else {
			lines.forEach((line, index) => {
				const {isEquipped, cleanLine, name} = parseLine(line);
				const li = el("li", {class: `cc-eq-row ${isEquipped ? "is-equipped" : ""}`});

				const label = el("span", {class: "cc-eq-name", text: cleanLine});
				if (isEquipped) {
					label.append(el("span", {class: "cc-badge cc-badge-source", text: "EQUIPPED"}));
				}

				const actions = el("div", {class: "cc-eq-row-actions"});

				// Inspect details
				actions.append(el("button", {
					type: "button",
					class: "cc-btn cc-btn-xs",
					text: "Inspect",
					title: "View item stats & description",
					onClick: () => {
						const catalog = getCatalog?.() || [];
						const matched = catalog.find(c => c.name.toLowerCase() === name.toLowerCase());
						openItemInspectorModal(matched?.rawItem || {name}, el);
					},
				}));

				// Equip toggle
				actions.append(el("button", {
					type: "button",
					class: `cc-btn cc-btn-xs ${isEquipped ? "cc-btn-primary" : ""}`,
					text: isEquipped ? "Equipped" : "Equip",
					title: isEquipped ? "Mark as unequipped" : "Equip item for attacks & AC",
					onClick: () => {
						const parsed = parseLine(lines[index]);
						parsed.isEquipped = !parsed.isEquipped;
						lines[index] = formatLine(parsed);
						emit();
						render();
					},
				}));

				// Delete
				actions.append(el("button", {
					type: "button",
					class: "cc-btn cc-btn-xs cc-btn-danger",
					text: "Remove",
					onClick: () => {
						lines.splice(index, 1);
						emit();
						render();
					},
				}));

				li.append(label, actions);
				list.append(li);
			});
		}
		root.append(list);



		// Bulk edit (advanced)
		const bulk = el("details", {class: "cc-eq-bulk"});
		bulk.append(el("summary", {text: "Bulk edit (one item per line)"}));
		const ta = el("textarea", {class: "cc-input cc-textarea"});
		ta.value = lines.join("\n");
		ta.addEventListener("change", () => {
			lines = ta.value.split("\n").map(s => s.trim()).filter(Boolean);
			emit();
			render();
		});
		bulk.append(ta);
		root.append(bulk);
	};

	render();
	return {
		root,
		getEquipment: () => lines.slice(),
		setEquipment: (next) => {
			lines = (next || []).map(s => String(s)).filter(Boolean);
			render();
		},
	};
}

/**
 * Build a deduped catalog from a list of item entities.
 * @param {object[]} items
 * @param {{preferSources?: string[]}} [opts]
 */
export function buildItemCatalog (items, {preferSources = ["XPHB", "TLotRR", "PHB"]} = {}) {
	const rank = (src) => {
		const i = preferSources.indexOf(String(src || "").toUpperCase());
		return i >= 0 ? i : 99;
	};
	const typeLabel = (it) => {
		const t = String(it.type || "").split("|")[0];
		const map = {
			M: "Melee weapon",
			R: "Ranged weapon",
			A: "Ammunition",
			LA: "Light armor",
			MA: "Medium armor",
			HA: "Heavy armor",
			S: "Shield",
			AT: "Artisan's tools",
			T: "Tool",
			INS: "Instrument",
			GS: "Gaming set",
			G: "Adventuring gear",
			FD: "Food & drink",
			SCF: "Focus",
			P: "Potion",
			RD: "Rod",
			RG: "Ring",
			WD: "Wand",
			W: "Wondrous",
		};
		return map[t] || (t || null);
	};

	const byName = new Map();
	for (const it of items || []) {
		if (!it?.name) continue;
		const k = it.name.toLowerCase();
		const prev = byName.get(k);
		if (!prev || rank(it.source) < rank(prev.source)) {
			byName.set(k, {
				name: it.name,
				source: it.source,
				uid: `${String(it.name).toLowerCase()}|${String(it.source || "").toLowerCase()}`,
				typeLabel: typeLabel(it),
				rawItem: it,
			});
		}
	}
	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Open Item Details Inspector Modal.
 */
export function openItemInspectorModal (item, el) {
	if (!item) return;

	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-item-inspector"});

	modal.append(el("h2", {text: item.name || "Item Details"}));

	const tags = el("div", {class: "cc-item-props"});
	if (item.source) tags.append(el("span", {class: "cc-badge cc-badge-source", text: item.source}));
	if (item.weight) tags.append(el("span", {class: "cc-item-tag", text: `${item.weight} lbs.`}));
	if (item.value) tags.append(el("span", {class: "cc-item-tag", text: `${item.value / 100} gp`}));
	if (item.ac) tags.append(el("span", {class: "cc-item-tag", text: `AC ${item.ac}`}));
	if (item.dmg1) tags.append(el("span", {class: "cc-item-tag", text: `Dmg: ${item.dmg1} ${item.dmgType || ""}`}));
	if (item.property?.length) {
		tags.append(el("span", {class: "cc-item-tag", text: `Props: ${item.property.join(", ")}`}));
	}
	modal.append(tags);

	if (item.entries?.length) {
		const text = Array.isArray(item.entries)
			? item.entries.map(e => typeof e === "string" ? e : (e.entry || JSON.stringify(e))).join("\n\n")
			: String(item.entries);
		modal.append(el("pre", {class: "cc-prose", text}));
	} else {
		modal.append(el("p", {class: "cc-muted", text: "No detailed description available for this item."}));
	}

	const footer = el("div", {class: "cc-wizard-footer"});
	footer.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Close",
		onClick: () => backdrop.remove(),
	}));
	modal.append(footer);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}

/**
 * Modal dialog for searching the catalog or adding custom equipment.
 * Supports source book filters (TLotRR, PHB, XPHB, etc.) and category grouping.
 */
export function openAddItemModal ({
	getCatalog,
	onAddItem,
	el,
}) {
	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-add-item-modal", style: "max-width: 650px; text-align: left;"});

	modal.append(el("h2", {text: "Add Item to Equipment", style: "margin-top: 0; font-size: 1.3rem;"}));

	// Tabs: [ 📦 Add from Catalog ] | [ ✍️ Custom Item ]
	let activeTab = "catalog";

	const tabsHeader = el("div", {class: "cc-steps", style: "margin-bottom: 1rem;"});
	const tabBtnCatalog = el("button", {
		type: "button",
		class: "cc-step-btn is-active",
		text: "📦 Add from Catalog",
		onClick: () => switchTab("catalog"),
	});
	const tabBtnCustom = el("button", {
		type: "button",
		class: "cc-step-btn",
		text: "✍️ Custom Item",
		onClick: () => switchTab("custom"),
	});
	tabsHeader.append(tabBtnCatalog, tabBtnCustom);
	modal.append(tabsHeader);

	const bodyContainer = el("div", {class: "cc-modal-tab-body"});
	modal.append(bodyContainer);

	// Notification banner inside modal
	const notifyBox = el("div", {
		style: "font-size: 0.85rem; color: var(--cc-accent); min-height: 1.2rem; margin-top: 0.5rem; transition: opacity 0.3s ease;",
	});
	modal.append(notifyBox);

	const showNotify = (msg) => {
		notifyBox.textContent = `✓ ${msg}`;
		notifyBox.style.opacity = "1";
		setTimeout(() => { notifyBox.style.opacity = "0"; }, 2500);
	};

	// Catalog state
	let catalogItems = [];
	try {
		catalogItems = typeof getCatalog === "function" ? (getCatalog() || []) : [];
	} catch (e) { console.warn(e); }

	// Extract unique sources
	const availableSources = Array.from(new Set(
		catalogItems.map(it => String(it.source || "").toUpperCase()).filter(Boolean)
	)).sort();

	// Default active sources: prefer TLOTRR, PHB, and XPHB
	const selectedSources = new Set(
		availableSources.filter(s => s === "TLOTRR" || s === "PHB" || s === "XPHB")
	);
	if (selectedSources.size === 0 && availableSources.length > 0) {
		availableSources.forEach(s => selectedSources.add(s));
	}

	let searchQuery = "";

	// Custom item state
	let customName = "";
	let customQty = 1;

	const switchTab = (tab) => {
		activeTab = tab;
		tabBtnCatalog.classList.toggle("is-active", tab === "catalog");
		tabBtnCustom.classList.toggle("is-active", tab === "custom");
		renderBody();
	};

	function getItemCategory (it) {
		const typeStr = (it.typeLabel || "").toLowerCase();
		const nameStr = (it.name || "").toLowerCase();
		const rawType = String(it.rawItem?.type || "").toUpperCase();

		if (rawType === "M" || rawType === "R" || rawType === "MW" || rawType === "RW" || typeStr.includes("weapon") || nameStr.includes("sword") || nameStr.includes("bow") || nameStr.includes("axe") || nameStr.includes("dagger") || nameStr.includes("spear")) {
			return "⚔️ Weapons";
		}
		if (rawType === "LA" || rawType === "MA" || rawType === "HA" || rawType === "S" || typeStr.includes("armor") || typeStr.includes("shield") || nameStr.includes("mail") || nameStr.includes("plate") || nameStr.includes("leather")) {
			return "🛡️ Armor & Shields";
		}
		if (rawType === "P" || rawType === "SC" || typeStr.includes("potion") || typeStr.includes("scroll") || nameStr.includes("potion") || nameStr.includes("scroll") || nameStr.includes("elixir")) {
			return "🧪 Potions & Scrolls";
		}
		if (rawType === "T" || rawType === "AT" || rawType === "INS" || rawType === "GS" || typeStr.includes("tool") || typeStr.includes("instrument") || typeStr.includes("gaming")) {
			return "🛠️ Tools & Instruments";
		}
		if (rawType === "W" || rawType === "WD" || rawType === "RD" || rawType === "RG" || typeStr.includes("wondrous") || typeStr.includes("ring") || typeStr.includes("wand") || typeStr.includes("relic")) {
			return "✨ Magic Items & Relics";
		}
		if (typeStr.includes("gear") || typeStr.includes("pack") || nameStr.includes("rope") || nameStr.includes("ration") || nameStr.includes("torch") || nameStr.includes("backpack") || nameStr.includes("pouch")) {
			return "🎒 Adventuring Gear";
		}
		return "📦 Other / Miscellaneous";
	}

	const renderBody = () => {
		bodyContainer.innerHTML = "";

		if (activeTab === "custom") {
			const box = el("div", {class: "cc-form-group"});
			box.append(el("label", {class: "cc-field-label", text: "Item Name & Quantity:"}));

			const row = el("div", {class: "cc-eq-add-row", style: "display: flex; gap: 0.5rem; margin-top: 0.5rem;"});
			const qtyIn = el("input", {
				class: "cc-input cc-input-num", type: "number", min: "1", max: "99", value: String(customQty),
				style: "width: 75px;",
			});
			qtyIn.addEventListener("change", () => { customQty = Math.max(1, Number(qtyIn.value) || 1); });

			const nameIn = el("input", {
				class: "cc-input", type: "text", placeholder: "e.g. Travel cloak, Rope (50ft)...", value: customName, style: "flex: 1;",
			});
			nameIn.addEventListener("input", () => { customName = nameIn.value; });
			nameIn.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					doAddCustom();
				}
			});

			const doAddCustom = () => {
				const name = (nameIn.value || customName).trim();
				if (!name) return;
				const qty = Math.max(1, Number(qtyIn.value) || customQty || 1);
				const formatted = qty > 1 ? `${qty}× ${name}` : name;
				onAddItem(formatted);
				showNotify(`Added "${formatted}" to inventory.`);
				customName = "";
				nameIn.value = "";
				customQty = 1;
				qtyIn.value = "1";
			};

			const addBtn = el("button", {
				type: "button", class: "cc-btn cc-btn-primary", text: "Add Custom Item", onClick: doAddCustom,
			});

			row.append(qtyIn, nameIn, addBtn);
			box.append(row);
			bodyContainer.append(box);
			return;
		}

		// Catalog Tab
		const catWrap = el("div", {class: "cc-eq-catalog"});

		// Source filter pills
		if (availableSources.length > 0) {
			const srcBox = el("div", {class: "cc-form-group", style: "margin-bottom: 0.75rem;"});
			srcBox.append(el("label", {class: "cc-field-label", text: "Filter Source Books:"}));
			const pillsRow = el("div", {class: "cc-source-pills"});

			availableSources.forEach(src => {
				const isSelected = selectedSources.has(src);
				const pill = el("span", {
					class: `cc-source-pill ${isSelected ? "is-active" : ""}`,
					text: `${isSelected ? "✓ " : ""}${src}`,
					onClick: () => {
						if (isSelected) {
							if (selectedSources.size > 1) selectedSources.delete(src);
						} else {
							selectedSources.add(src);
						}
						renderBody();
					},
				});
				pillsRow.append(pill);
			});
			srcBox.append(pillsRow);
			catWrap.append(srcBox);
		}

		// Search input
		const searchInput = el("input", {
			class: "cc-input",
			type: "search",
			placeholder: "Search catalog items (e.g. Mithril, Shortbow, Potion)...",
			value: searchQuery,
			style: "margin-bottom: 1rem;",
		});
		searchInput.addEventListener("input", () => {
			searchQuery = searchInput.value.trim();
			renderListOnly();
		});
		catWrap.append(searchInput);

		const listContainer = el("div", {class: "cc-eq-catalog-list", style: "max-height: 340px; overflow-y: auto; padding-right: 4px;"});
		catWrap.append(listContainer);

		const renderListOnly = () => {
			listContainer.innerHTML = "";

			let filtered = catalogItems.filter(it => {
				const src = String(it.source || "").toUpperCase();
				return selectedSources.size === 0 || selectedSources.has(src);
			});

			if (searchQuery) {
				const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
				filtered = filtered.filter(it => {
					const nameLower = String(it.name || "").toLowerCase();
					const srcLower = String(it.source || "").toLowerCase();
					const typeLower = String(it.typeLabel || "").toLowerCase();
					const entriesStr = it.rawItem?.entries ? JSON.stringify(it.rawItem.entries).toLowerCase() : "";
					const fullText = `${nameLower} ${srcLower} ${typeLower} ${entriesStr}`;

					return tokens.every(tok => {
						if (fullText.includes(tok)) return true;
						if (tok === "mithril" && fullText.includes("mithral")) return true;
						if (tok === "mithral" && fullText.includes("mithril")) return true;
						if ((tok === "chain" || tok === "shirt") && (fullText.includes("mail-shirt") || fullText.includes("chain"))) return true;
						return false;
					});
				});
			}

			if (!filtered.length) {
				listContainer.append(el("p", {class: "cc-muted", text: searchQuery ? "No matching items found." : "No catalog items for selected sources."}));
				return;
			}

			// Group by category
			const grouped = {};
			const CATEGORY_ORDER = [
				"⚔️ Weapons",
				"🛡️ Armor & Shields",
				"🎒 Adventuring Gear",
				"🧪 Potions & Scrolls",
				"🛠️ Tools & Instruments",
				"✨ Magic Items & Relics",
				"📦 Other / Miscellaneous",
			];

			filtered.forEach(it => {
				const cat = getItemCategory(it);
				if (!grouped[cat]) grouped[cat] = [];
				grouped[cat].push(it);
			});

			CATEGORY_ORDER.forEach(catName => {
				const itemsInGroup = grouped[catName];
				if (!itemsInGroup || itemsInGroup.length === 0) return;

				listContainer.append(el("div", {class: "cc-cat-group-title", text: `${catName} (${itemsInGroup.length})`}));

				itemsInGroup.forEach(it => {
					const row = el("div", {class: "cc-eq-catalog-item"});
					const labelInfo = el("div", {
						class: "cc-eq-catalog-info",
						style: "cursor: pointer; flex: 1;",
						onClick: () => { openItemInspectorModal(it.rawItem || it, el); },
					});
					labelInfo.append(el("span", {class: "cc-eq-catalog-name", text: it.name || it.uid}));
					const meta = [it.typeLabel, it.source].filter(Boolean).join(" · ");
					if (meta) labelInfo.append(el("span", {class: "cc-eq-catalog-meta", text: meta}));

					const actions = el("div", {style: "display: flex; gap: 0.3rem;"});
					actions.append(el("button", {
						type: "button",
						class: "cc-btn cc-btn-xs",
						text: "👁️ Details",
						onClick: () => { openItemInspectorModal(it.rawItem || it, el); },
					}));

					actions.append(el("button", {
						type: "button",
						class: "cc-btn cc-btn-xs cc-btn-primary",
						text: "➕ Add",
						onClick: () => {
							const formatted = `${it.name}${["weapon", "armor", "shield"].some(t => String(it.typeLabel || "").toLowerCase().includes(t)) ? " [E]" : ""}`;
							onAddItem(formatted);
							showNotify(`Added "${it.name}" to equipment.`);
						},
					}));

					row.append(labelInfo, actions);
					listContainer.append(row);
				});
			});
		};

		renderListOnly();
		bodyContainer.append(catWrap);
	};

	renderBody();

	const footer = el("div", {class: "cc-wizard-footer", style: "display: flex; justify-content: flex-end; margin-top: 1rem;"});
	footer.append(el("button", {
		type: "button", class: "cc-btn cc-btn-primary", text: "Done", onClick: () => backdrop.remove(),
	}));
	modal.append(footer);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}
