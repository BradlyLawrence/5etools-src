/**
 * Source book catalog registry & selector modal for character creators.
 */

export const SOURCE_CATEGORIES = [
	{
		id: "core-2024",
		title: "D&D 2024 Core Rules",
		description: "Updated 5e rules baseline (2024 Player's Handbook, DMG, MM).",
		sources: [
			{code: "XPHB", name: "Player's Handbook (2024)", default2024: true},
			{code: "XDMG", name: "Dungeon Master's Guide (2024)", default2024: true},
			{code: "XMM", name: "Monster Manual (2024)", default2024: true},
		],
	},
	{
		id: "core-2014",
		title: "D&D 2014 Core Rules",
		description: "Original 5th Edition core rulebooks.",
		sources: [
			{code: "PHB", name: "Player's Handbook (2014)", defaultLotr: true},
			{code: "DMG", name: "Dungeon Master's Guide (2014)"},
			{code: "MM", name: "Monster Manual (2014)"},
		],
	},
	{
		id: "supplements",
		title: "Rules Expansions & Supplements",
		description: "Expanded player options, races, subclasses, feats, and spells.",
		sources: [
			{code: "TCE", name: "Tasha's Cauldron of Everything"},
			{code: "XGE", name: "Xanathar's Guide to Everything"},
			{code: "MPMM", name: "Monsters of the Multiverse"},
			{code: "FTD", name: "Fizban's Treasury of Dragons"},
			{code: "VRGR", name: "Van Richten's Guide to Ravenloft"},
			{code: "SCAG", name: "Sword Coast Adventurer's Guide"},
		],
	},
	{
		id: "settings",
		title: "Campaign Settings",
		description: "Setting-specific options, dragonmark races, and magic items.",
		sources: [
			{code: "ERLW", name: "Eberron: Rising from the Last War"},
			{code: "MOT", name: "Mythic Odysseys of Theros"},
			{code: "GGR", name: "Guildmasters' Guide to Ravnica"},
			{code: "AAG", name: "Astral Adventurer's Guide (Spelljammer)"},
			{code: "BGDIA", name: "Baldur's Gate: Descent Into Avernus"},
		],
	},
	{
		id: "middle-earth",
		title: "Middle-earth 5e (Free League)",
		description: "The Lord of the Rings Roleplaying rules & homebrew cultures.",
		sources: [
			{code: "TLotRR", name: "The Lord of the Rings Roleplaying", defaultLotr: true},
			{code: "MECultures", name: "Middle-earth Cultures (Homebrew)", defaultLotr: true},
		],
	},
];

export const DEFAULT_SOURCES_2024 = ["XPHB", "XDMG", "XMM"];
export const DEFAULT_SOURCES_LOTR = ["TLotRR", "MECultures", "PHB", "XPHB"];

/**
 * Helper to check if a source code is active in an enabled array/set.
 * @param {string} sourceCode
 * @param {Iterable<string>} activeSources
 */
export function isSourceActive (sourceCode, activeSources) {
	if (!sourceCode) return true;
	const set = new Set(Array.from(activeSources || []).map(s => String(s).toUpperCase()));
	const code = String(sourceCode).toUpperCase();
	return set.has(code);
}

/**
 * Render the Source Selection Modal.
 * @param {object} opts
 * @param {string[]} opts.enabledSources
 * @param {string} [opts.preset] "2024" | "lotr"
 * @param {(sources: string[]) => void} opts.onSave
 * @param {(tag: string, attrs?: object, children?: any) => HTMLElement} opts.el
 */
export function mountSourceSelectorModal ({
	enabledSources = [],
	preset = "2024",
	onSave,
	el,
}) {
	const current = new Set((enabledSources?.length ? enabledSources : (preset === "lotr" ? DEFAULT_SOURCES_LOTR : DEFAULT_SOURCES_2024)).map(s => s.toUpperCase()));

	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-modal-wide cc-source-modal"});

	modal.append(el("h2", {text: "⚙ Manage Sourcebooks & Allowed Content"}));
	modal.append(el("p", {
		class: "cc-muted",
		text: "Select which books and supplements to include when choosing species, backgrounds, feats, spells, equipment, and subclasses.",
	}));

	const quickRow = el("div", {class: "cc-inline-form cc-source-quick"});
	quickRow.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-sm",
		text: "Set 2024 Core Defaults",
		onClick: () => {
			current.clear();
			DEFAULT_SOURCES_2024.forEach(s => current.add(s.toUpperCase()));
			renderList();
		},
	}));
	quickRow.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-sm",
		text: "Set LOTR RPG Defaults",
		onClick: () => {
			current.clear();
			DEFAULT_SOURCES_LOTR.forEach(s => current.add(s.toUpperCase()));
			renderList();
		},
	}));
	quickRow.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-sm",
		text: "Select All Core + Supplements",
		onClick: () => {
			SOURCE_CATEGORIES.forEach(cat => {
				cat.sources.forEach(src => current.add(src.code.toUpperCase()));
			});
			renderList();
		},
	}));
	modal.append(quickRow);

	const content = el("div", {class: "cc-source-categories"});
	modal.append(content);

	const renderList = () => {
		content.innerHTML = "";
		for (const cat of SOURCE_CATEGORIES) {
			const sec = el("section", {class: "cc-source-cat"});
			sec.append(el("h3", {text: cat.title}));
			sec.append(el("p", {class: "cc-muted", text: cat.description}));

			const grid = el("div", {class: "cc-source-grid"});
			for (const src of cat.sources) {
				const codeUpper = src.code.toUpperCase();
				const isActive = current.has(codeUpper);

				const card = el("label", {class: `cc-source-card ${isActive ? "is-active" : ""}`});
				const check = el("input", {
					type: "checkbox",
					checked: isActive,
					onChange: () => {
						if (check.checked) current.add(codeUpper);
						else current.delete(codeUpper);
						card.classList.toggle("is-active", check.checked);
					},
				});
				card.append(check);
				const info = el("div", {class: "cc-source-card-info"});
				info.append(el("span", {class: "cc-source-code", text: src.code}));
				info.append(el("span", {class: "cc-source-name", text: src.name}));
				card.append(info);
				grid.append(card);
			}
			sec.append(grid);
			content.append(sec);
		}
	};

	renderList();

	const footer = el("div", {class: "cc-wizard-footer"});
	footer.append(el("button", {
		type: "button",
		class: "cc-btn",
		text: "Cancel",
		onClick: () => backdrop.remove(),
	}));
	footer.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Apply Sources",
		onClick: () => {
			const selected = Array.from(current);
			onSave?.(selected);
			backdrop.remove();
		},
	}));
	modal.append(footer);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}

/**
 * Render a source selector banner / card for wizard header.
 * @param {object} opts
 * @param {string[]} opts.enabledSources
 * @param {() => void} opts.onOpenModal
 * @param {(tag: string, attrs?: object, children?: any) => HTMLElement} opts.el
 */
export function mountSourceBanner ({enabledSources = [], onOpenModal, el}) {
	const box = el("div", {class: "cc-source-banner"});
	const left = el("div", {class: "cc-source-banner-left"});
	left.append(el("strong", {text: "Active Sources: "}));

	const badges = el("div", {class: "cc-source-badges"});
	const list = enabledSources?.length ? enabledSources : ["XPHB"];
	for (const src of list.slice(0, 6)) {
		badges.append(el("span", {class: "cc-badge cc-badge-source", text: src}));
	}
	if (list.length > 6) {
		badges.append(el("span", {class: "cc-badge cc-badge-source", text: `+${list.length - 6} more`}));
	}
	left.append(badges);
	box.append(left);

	box.append(el("button", {
		type: "button",
		class: "cc-btn cc-btn-sm cc-btn-cog",
		text: "⚙ Sources",
		onClick: () => onOpenModal?.(),
	}));

	return box;
}
