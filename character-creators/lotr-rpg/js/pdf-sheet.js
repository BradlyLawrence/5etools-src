import {derive, ABILITIES, ABILITY_FULL, formatMod} from "./character.js?v=3.4";

/**
 * Build a print/PDF-friendly character sheet element for Lord of the Rings Roleplaying.
 * Uses 2 discrete logical pages (.cc-pdf-page) to guarantee clean, un-severed page breaks.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 * @returns {HTMLElement}
 */
export function buildPdfSheet (character, data) {
	const d = derive(character, data);
	const root = document.createElement("div");
	root.className = "cc-pdf-sheet cc-pdf-lotr";

	const culture = d.subraceName ? `${d.cultureName} (${d.subraceName})` : d.cultureName;
	const attacks = d.attacks || [];
	const currency = d.currency || {silver: 0, copper: 0, gold: 0};
	const weightInfo = d.weightInfo || {totalWeight: 0, capacity: 150};

	// Generate Hope pips based on Hope Max
	const hopePipCount = Math.max(12, d.hopeMax || 10);
	const hopePips = Array.from({length: hopePipCount}, (_, i) => `<span class="cc-pdf-pip">${i < d.hopeCurrent ? "●" : "◯"}</span>`).join(" ");

	root.innerHTML = `
		<!-- PAGE 1: STATS, COMBAT & SKILLS -->
		<div class="cc-pdf-page cc-pdf-page-1">
			<header class="cc-pdf-header cc-pdf-header-lotr" style="align-items: center; gap: 12px;">
				${character.identity.portrait ? `<img class="cc-pdf-portrait" src="${character.identity.portrait}" alt="Portrait" />` : ""}
				<div class="cc-pdf-header-title">
					<div class="cc-pdf-name">${esc(character.identity.name || "Unnamed Hero")}</div>
					<div class="cc-pdf-sub">
						Level ${d.level} ${esc(culture)} ${esc(d.className)}${d.subclassName ? ` (${esc(d.subclassName)})` : ""}
						· ${esc(d.backgroundName)}
					</div>
				</div>
				<div class="cc-pdf-meta">
					<div><strong>Player:</strong> ${esc(character.identity.playerName || "—")}</div>
					<div><strong>Patron:</strong> ${esc(d.patron || "—")}</div>
					<div><strong>Fellowship Score:</strong> ${d.fellowship || "0"}</div>
					<div><span class="cc-pdf-tag cc-pdf-tag-lotr">Page 1: Character &amp; Combat</span></div>
				</div>
			</header>

			<section class="cc-pdf-grid3">
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Armor Class</div>
					<div class="cc-pdf-big">${d.ac}</div>
				</div>
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Initiative</div>
					<div class="cc-pdf-big">${formatMod(d.initiative)}</div>
				</div>
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Speed</div>
					<div class="cc-pdf-big">${d.speed} ft.</div>
				</div>
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Hit Points</div>
					<div class="cc-pdf-big">${d.hpCurrent} / ${d.hpMax}</div>
					<div class="cc-pdf-writein">Current HP: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
				</div>
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Hit Dice</div>
					<div class="cc-pdf-big">${esc(d.hitDie)}</div>
					<div class="cc-pdf-writein">Spent: [ &nbsp;&nbsp;&nbsp;&nbsp; ]</div>
				</div>
				<div class="cc-pdf-box cc-pdf-box-lotr">
					<div class="cc-pdf-label">Passive Perception</div>
					<div class="cc-pdf-big">${d.passivePerception}</div>
				</div>
			</section>

			<!-- Hope & Shadow Tracking Banner -->
			<section class="cc-pdf-tracker-card cc-pdf-tracker-lotr">
				<div class="cc-pdf-tracker-col">
					<div class="cc-pdf-tracker-title">Hope Points (Max: ${d.hopeMax})</div>
					<div class="cc-pdf-pips">${hopePips}</div>
					<div class="cc-pdf-writein-line">Current Hope: <strong>[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</strong></div>
				</div>
				<div class="cc-pdf-tracker-col">
					<div class="cc-pdf-tracker-title">Shadow &amp; Conditions (${d.shadowPath ? esc(d.shadowPath) : "Shadow Path"})</div>
					<div class="cc-pdf-writein-line">
						Score: <strong>[ &nbsp;&nbsp;&nbsp;&nbsp; ]</strong> &nbsp;
						Scars: <strong>[ &nbsp;&nbsp;&nbsp;&nbsp; ]</strong> &nbsp;
						<span>[ ${d.isMiserable ? "✔" : "&nbsp;&nbsp;"} ] Miserable</span> &nbsp;
						<span>[ ${d.isMelancholy ? "✔" : "&nbsp;&nbsp;"} ] Melancholy</span>
					</div>
					<div class="cc-pdf-checks" style="margin-top: 4px; font-size: 8.5px;">
						<strong>Flaws:</strong> &nbsp;
						${(d.shadowPathStages || []).map(s => `<span>[ ${s.active ? "✔" : "&nbsp;&nbsp;"} ] ${s.stage}.${esc(s.name)}</span>`).join(" &nbsp;")}
					</div>
				</div>
			</section>

			<section class="cc-pdf-abilities">
				${ABILITIES.map(ab => `
					<div class="cc-pdf-ab cc-pdf-ab-lotr">
						<div class="cc-pdf-label">${ABILITY_FULL[ab]}</div>
						<div class="cc-pdf-big">${character.abilities[ab]}</div>
						<div class="cc-pdf-mod">${formatMod(d.mods[ab])}</div>
						<div class="cc-pdf-tiny">Save ${formatMod(d.saves[ab].value)}${d.saves[ab].proficient ? " ●" : ""}</div>
					</div>
				`).join("")}
			</section>

			<section class="cc-pdf-section">
				<h3>Attacks &amp; Combat Actions</h3>
				<table class="cc-pdf-table cc-pdf-table-lotr">
					<thead>
						<tr>
							<th>Weapon / Action</th>
							<th>To-Hit</th>
							<th>Damage &amp; Type</th>
							<th>Range / Notes</th>
						</tr>
					</thead>
					<tbody>
						${attacks.map(atk => `
							<tr>
								<td><strong>${esc(atk.name)}</strong></td>
								<td>${formatMod(atk.toHit)}</td>
								<td>${esc(atk.damage)}</td>
								<td>${esc(atk.range || (atk.isRanged ? "Ranged (80/320 ft.)" : "Melee (5 ft.)"))}</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
				<div class="cc-pdf-ammo-row">
					<strong>Ammunition Tracker:</strong>
					<span>◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯ &nbsp;|&nbsp; ◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯ ◯</span>
				</div>
			</section>

			<section class="cc-pdf-cols">
				<div>
					<h3>Middle-earth Skills</h3>
					<ul class="cc-pdf-list compact">
						${d.skills.map(sk => {
							const isMeSkill = ["Explore", "Hunting", "Old Lore", "Riddle", "Travel"].includes(sk.name);
							const icon = sk.isExpert ? "✪" : (sk.proficient ? "●" : "○");
							return `<li><span>${icon} ${esc(sk.name)}${isMeSkill ? " ★" : ""}</span>
							<span class="cc-pdf-right">${formatMod(sk.bonus)}</span></li>`;
						}).join("")}
					</ul>
					<div class="cc-pdf-tiny">● Proficient &nbsp;·&nbsp; ✪ Expertise &nbsp;·&nbsp; ★ Middle-earth skill</div>
				</div>
				<div>
					<h3>Virtues, Crafts &amp; Features</h3>
					<ul class="cc-pdf-list">
						${d.features.map(f => `
							<li><strong>L${f.level} ${esc(f.name)}</strong>
							${f.text ? `<div class="cc-pdf-feat-text">${esc(truncate(f.text, 260))}</div>` : ""}</li>
						`).join("")}
					</ul>
				</div>
			</section>

			<footer class="cc-pdf-footer cc-pdf-footer-lotr">
				<span>Free League · The Lord of the Rings Roleplaying (5e)</span>
				<span>Page 1 of 2</span>
			</footer>
		</div>

		<!-- PAGE 2: EQUIPMENT, TREASURE & JOURNEY NOTES -->
		<div class="cc-pdf-page cc-pdf-page-2">
			<header class="cc-pdf-header cc-pdf-header-lotr">
				<div class="cc-pdf-header-title">
					<div class="cc-pdf-name">${esc(character.identity.name || "Unnamed Hero")}</div>
					<div class="cc-pdf-sub">Equipment, Treasure &amp; Journey Log</div>
				</div>
				<div class="cc-pdf-meta">
					<div><strong>Player:</strong> ${esc(character.identity.playerName || "—")}</div>
					<div><span class="cc-pdf-tag cc-pdf-tag-lotr">Page 2: Inventory &amp; Notes</span></div>
				</div>
			</header>

			<section class="cc-pdf-cols">
				<div>
					<h3>Equipment &amp; Inventory</h3>
					<ul class="cc-pdf-list compact">
						${(character.equipment || []).map(e => `<li>${esc(e)}</li>`).join("") || "<li>—</li>"}
					</ul>
					<p class="cc-pdf-p" style="margin-top: 8px;"><strong>Load:</strong> ${weightInfo.totalWeight} lbs. / ${weightInfo.capacity} lbs. max ${weightInfo.isEncumbered ? "(Encumbered)" : ""}</p>

					<h3>Heir &amp; Legacy</h3>
					<div class="cc-pdf-coin-grid" style="flex-direction: column; gap: 4px;">
						<div><strong>Heir Name:</strong> ${d.heirName ? esc(d.heirName) : "[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]"}</div>
						<div><strong>Investment:</strong> ${d.investment ? esc(d.investment) : "[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]"}</div>
					</div>
				</div>
				<div>
					<h3>Middle-earth Treasure</h3>
					<div class="cc-pdf-coin-grid">
						<div>Silver (st): <strong>[ ${currency.silver || "&nbsp;&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>Copper (cp): <strong>[ ${currency.copper || "&nbsp;&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>Gold (gp): <strong>[ ${currency.gold || "&nbsp;&nbsp;&nbsp;&nbsp;"} ]</strong></div>
					</div>

					<h3>Physical Characteristics</h3>
					<div class="cc-pdf-coin-grid" style="flex-wrap: wrap; gap: 6px 12px; font-size: 9.5px;">
						<div>Age: <strong>${esc(d.age || "___")}</strong></div>
						<div>Height: <strong>${esc(d.height || "___")}</strong></div>
						<div>Weight: <strong>${esc(d.weight || "___")}</strong></div>
						<div>Eyes: <strong>${esc(d.eyes || "___")}</strong></div>
						<div>Skin: <strong>${esc(d.skin || "___")}</strong></div>
						<div>Hair: <strong>${esc(d.hair || "___")}</strong></div>
					</div>

					<h3>Personality &amp; Shadow Flaw</h3>
					<p class="cc-pdf-p"><strong>Shadow Flaw:</strong> ${d.flaw ? esc(d.flaw) : "—"}</p>
					<p class="cc-pdf-p"><strong>Distinctive Features:</strong> ${d.distinctiveFeatures ? esc(d.distinctiveFeatures) : "—"}</p>
				</div>
			</section>

			<!-- Clean Open Notes Section -->
			<section class="cc-pdf-section" style="flex: 1; display: flex; flex-direction: column;">
				<h3>Tale of Years / Journey &amp; Session Notes</h3>
				<div class="cc-pdf-notes-full">
					${character.identity.notes ? esc(character.identity.notes) : ""}
				</div>
			</section>

			<footer class="cc-pdf-footer cc-pdf-footer-lotr">
				<span>Free League · The Lord of the Rings Roleplaying (5e)</span>
				<span>Page 2 of 2</span>
			</footer>
		</div>
	`;
	return root;
}

function truncate (s, n) {
	const t = String(s).replace(/\s+/g, " ").trim();
	return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function esc (s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
