/**
 * Shared modal for adding custom or rules-catalog Virtues, Feats, and Features.
 */

export function openAddFeatureModal ({
	char,
	data,
	setChar,
	el,
}) {
	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-add-feature-modal", style: "max-width: 620px; text-align: left;"});

	modal.append(el("h2", {text: "Add Feature or Virtue", style: "margin-top: 0; font-size: 1.3rem;"}));

	let activeTab = "catalog"; // "catalog" | "custom"

	const tabsHeader = el("div", {class: "cc-steps", style: "margin-bottom: 1rem;"});
	const tabBtnCatalog = el("button", {
		type: "button",
		class: "cc-step-btn is-active",
		text: "📜 Rules Catalog",
		onClick: () => switchTab("catalog"),
	});
	const tabBtnCustom = el("button", {
		type: "button",
		class: "cc-step-btn",
		text: "✍️ Custom Feature / Virtue",
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

	// State for custom
	let customName = "";
	let customType = "Virtue";
	let customText = "";

	// State for catalog
	let searchQuery = "";

	// Build catalog list from data.feats, class features, etc.
	const catalogEntries = [];

	(data.feats || []).forEach(f => {
		catalogEntries.push({
			name: f.name,
			text: Array.isArray(f.entries) ? f.entries.map(e => typeof e === "string" ? e : (e.entry || "")).join("\n\n") : String(f.entries || ""),
			source: f.source || "Rules",
			typeTag: f.source === "TLotRR" ? "Virtue" : "Feat",
		});
	});

	const switchTab = (tab) => {
		activeTab = tab;
		tabBtnCatalog.classList.toggle("is-active", tab === "catalog");
		tabBtnCustom.classList.toggle("is-active", tab === "custom");
		renderBody();
	};

	const addFeatureToChar = (featObj) => {
		char.customFeatures = char.customFeatures || [];
		char.customFeatures.push({
			id: String(Date.now()) + Math.random().toString(36).substr(2, 4),
			name: featObj.name,
			text: featObj.text || "",
			source: featObj.typeTag || featObj.source || "custom",
			level: char.level || 1,
		});
		setChar(char);
	};

	const renderBody = () => {
		bodyContainer.innerHTML = "";

		if (activeTab === "custom") {
			const box = el("div", {class: "cc-form-group", style: "display: flex; flex-direction: column; gap: 0.75rem;"});

			const row1 = el("div", {style: "display: flex; gap: 0.5rem; flex-wrap: wrap;"});
			const nameIn = el("input", {
				class: "cc-input", type: "text", placeholder: "Name (e.g. Gift of Men, Elven Grace)", value: customName, style: "flex: 1;",
			});
			nameIn.addEventListener("input", () => { customName = nameIn.value; });

			const typeSelect = el("select", {class: "cc-select", style: "width: 140px;"});
			["Virtue", "Class Feature", "Feat", "Background Trait", "Custom"].forEach(t => {
				const opt = el("option", {value: t, text: t});
				if (t === customType) opt.selected = true;
				typeSelect.append(opt);
			});
			typeSelect.addEventListener("change", (e) => { customType = e.target.value; });

			row1.append(nameIn, typeSelect);
			box.append(row1);

			const txtArea = el("textarea", {
				class: "cc-input cc-textarea",
				placeholder: "Description or rules text...",
				rows: "4",
			});
			txtArea.value = customText;
			txtArea.addEventListener("input", () => { customText = txtArea.value; });
			box.append(txtArea);

			const addBtn = el("button", {
				type: "button",
				class: "cc-btn cc-btn-primary",
				text: "➕ Add Custom Feature",
				onClick: () => {
					const name = (nameIn.value || customName).trim();
					if (!name) return;
					addFeatureToChar({
						name,
						text: txtArea.value || customText,
						typeTag: typeSelect.value || customType,
					});
					showNotify(`Added "${name}" [${customType}] to sheet.`);
					customName = "";
					customText = "";
					nameIn.value = "";
					txtArea.value = "";
				},
			});
			box.append(addBtn);

			bodyContainer.append(box);
			return;
		}

		// Catalog Tab
		const catWrap = el("div", {class: "cc-eq-catalog"});

		const searchInput = el("input", {
			class: "cc-input",
			type: "search",
			placeholder: "Search virtues, feats & features...",
			value: searchQuery,
			style: "margin-bottom: 0.75rem;",
		});
		searchInput.addEventListener("input", () => {
			searchQuery = searchInput.value.trim().toLowerCase();
			renderCatalogList();
		});
		catWrap.append(searchInput);

		const listContainer = el("div", {class: "cc-eq-catalog-list", style: "max-height: 340px; overflow-y: auto; padding-right: 4px;"});
		catWrap.append(listContainer);

		const renderCatalogList = () => {
			listContainer.innerHTML = "";

			let filtered = catalogEntries;
			if (searchQuery) {
				filtered = filtered.filter(it =>
					it.name.toLowerCase().includes(searchQuery) ||
					(it.text && it.text.toLowerCase().includes(searchQuery))
				);
			}

			if (!filtered.length) {
				listContainer.append(el("p", {class: "cc-muted", text: "No matching features or virtues found."}));
				return;
			}

			filtered.slice(0, 80).forEach(it => {
				const row = el("div", {class: "cc-eq-catalog-item"});
				const info = el("div", {class: "cc-eq-catalog-info", style: "flex: 1;"});
				info.append(el("span", {class: "cc-eq-catalog-name", text: it.name}));
				info.append(el("span", {class: "cc-eq-catalog-meta", text: `[${it.typeTag}] · ${it.source}`}));

				const addBtn = el("button", {
					type: "button",
					class: "cc-btn cc-btn-xs cc-btn-primary",
					text: "➕ Add",
					onClick: () => {
						addFeatureToChar(it);
						showNotify(`Added "${it.name}" to sheet.`);
					},
				});
				row.append(info, addBtn);
				listContainer.append(row);
			});
		};

		renderCatalogList();
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
