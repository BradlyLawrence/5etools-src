import {derive, ABILITIES, ABILITY_FULL, formatMod} from "./character.js";

/**
 * Build a print/PDF-friendly character sheet element for D&D 2024.
 * Uses 2 discrete logical pages (.cc-pdf-page) to guarantee clean, un-severed page breaks.
 * @param {object} character
 * @param {import('./data.js').DataStore} data
 * @returns {HTMLElement}
 */
export function buildPdfSheet (character, data) {
	const d = derive(character, data);
	const root = document.createElement("div");
	root.className = "cc-pdf-sheet cc-pdf-dnd";

	const attacks = d.attacks || [];
	const currency = character.currency || {cp: 0, sp: 0, ep: 0, gp: 10, pp: 0};
	const weightInfo = d.weightInfo || {totalWeight: 0, capacity: 150};

	root.innerHTML = `
		<!-- PAGE 1: STATS, COMBAT & SKILLS -->
		<div class="cc-pdf-page cc-pdf-page-1">
			<header class="cc-pdf-header cc-pdf-header-dnd" style="align-items: center; gap: 12px;">
				${character.identity.portrait ? `<img class="cc-pdf-portrait" src="${character.identity.portrait}" alt="Portrait" />` : ""}
				<div class="cc-pdf-header-title">
					<div class="cc-pdf-name">${esc(character.identity.name || "Unnamed Hero")}</div>
					<div class="cc-pdf-sub">
						Level ${d.level} ${esc(d.speciesName)} ${esc(d.className)}${d.subclassName ? ` (${esc(d.subclassName)})` : ""}
						· ${esc(d.backgroundName)}
					</div>
				</div>
				<div class="cc-pdf-meta">
					<div><strong>Player:</strong> ${esc(character.identity.playerName || "—")}</div>
					<div><strong>Alignment:</strong> ${esc(character.identity.alignment || "—")}</div>
					<div><strong>XP:</strong> ${character.xp ?? 0}</div>
					<div><span class="cc-pdf-tag">Page 1: Character &amp; Combat</span></div>
				</div>
			</header>

			<section class="cc-pdf-grid3">
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Armor Class</div>
					<div class="cc-pdf-big">${d.ac}</div>
				</div>
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Initiative</div>
					<div class="cc-pdf-big">${formatMod(d.initiative)}</div>
				</div>
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Speed</div>
					<div class="cc-pdf-big">${d.speed} ft.</div>
				</div>
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Hit Points</div>
					<div class="cc-pdf-big">${d.hpCurrent} / ${d.hpMax}</div>
					<div class="cc-pdf-writein">Current HP: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
				</div>
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Hit Dice</div>
					<div class="cc-pdf-big">${esc(d.hitDie)}</div>
					<div class="cc-pdf-writein">Spent: [ &nbsp;&nbsp;&nbsp;&nbsp; ]</div>
				</div>
				<div class="cc-pdf-box">
					<div class="cc-pdf-label">Passive Perception</div>
					<div class="cc-pdf-big">${d.passivePerception}</div>
				</div>
			</section>

			<!-- HP & Death Saves Banner -->
			<section class="cc-pdf-tracker-card cc-pdf-tracker-dnd">
				<div class="cc-pdf-tracker-col">
					<div class="cc-pdf-tracker-title">Combat HP &amp; Temp HP Tracker</div>
					<div class="cc-pdf-writein-line">
						Current HP: <strong>[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</strong> &nbsp;
						Temp HP: <strong>[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</strong>
					</div>
				</div>
				<div class="cc-pdf-tracker-col">
					<div class="cc-pdf-tracker-title">Death Saving Throws</div>
					<div class="cc-pdf-writein-line">
						Successes: ◯ ◯ ◯ &nbsp;&nbsp;|&nbsp;&nbsp; Failures: ◯ ◯ ◯
					</div>
				</div>
			</section>

			<section class="cc-pdf-abilities">
				${ABILITIES.map(ab => `
					<div class="cc-pdf-ab">
						<div class="cc-pdf-label">${ABILITY_FULL[ab]}</div>
						<div class="cc-pdf-big">${character.abilities[ab]}</div>
						<div class="cc-pdf-mod">${formatMod(d.mods[ab])}</div>
						<div class="cc-pdf-tiny">Save ${formatMod(d.saves[ab].value)}${d.saves[ab].proficient ? " ●" : ""}</div>
					</div>
				`).join("")}
			</section>

			<section class="cc-pdf-section">
				<h3>Attacks &amp; Actions</h3>
				<table class="cc-pdf-table">
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
								<td>${esc(typeof atk.range === "string" ? atk.range : (atk.isRanged ? "80/320 ft." : "Melee (5 ft.)"))}</td>
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
					<h3>Skills</h3>
					<ul class="cc-pdf-list compact">
						${d.skills.map(sk => `
							<li><span>${sk.proficient ? "●" : "○"}${sk.expertise ? "●" : ""} ${esc(sk.name)}</span>
							<span class="cc-pdf-right">${formatMod(sk.bonus)}</span></li>
						`).join("")}
					</ul>
					<h3>Proficiencies</h3>
					<p class="cc-pdf-p"><strong>Armor:</strong> ${esc((d.proficiencyArmor || []).join(", ") || "—")}</p>
					<p class="cc-pdf-p"><strong>Weapons:</strong> ${esc((d.proficiencyWeapons || []).join(", ") || "—")}</p>
					<p class="cc-pdf-p"><strong>Tools:</strong> ${esc((d.tools || []).join(", ") || "—")}</p>
				</div>
				<div>
					<h3>Features &amp; Traits</h3>
					<ul class="cc-pdf-list">
						${d.features.map(f => `
							<li><strong>L${f.level} ${esc(f.name)}</strong>
							${f.text ? `<div class="cc-pdf-feat-text">${esc(truncate(f.text, 260))}</div>` : ""}</li>
						`).join("")}
					</ul>
				</div>
			</section>

			<footer class="cc-pdf-footer">
				<span>D&amp;D 2024 Character Sheet</span>
				<span>Page 1 of 2</span>
			</footer>
		</div>

		<!-- PAGE 2: SPELLCASTING, EQUIPMENT & NOTES -->
		<div class="cc-pdf-page cc-pdf-page-2">
			<header class="cc-pdf-header cc-pdf-header-dnd">
				<div class="cc-pdf-header-title">
					<div class="cc-pdf-name">${esc(character.identity.name || "Unnamed Hero")}</div>
					<div class="cc-pdf-sub">Equipment, Spellcasting &amp; Session Notes</div>
				</div>
				<div class="cc-pdf-meta">
					<div><strong>Player:</strong> ${esc(character.identity.playerName || "—")}</div>
					<div><span class="cc-pdf-tag">Page 2: Inventory &amp; Notes</span></div>
				</div>
			</header>

			${renderSpells(character, d)}

			<section class="cc-pdf-cols">
				<div>
					<h3>Equipment &amp; Inventory</h3>
					<ul class="cc-pdf-list compact">
						${(character.equipment || []).map(e => `<li>${esc(e)}</li>`).join("") || "<li>—</li>"}
					</ul>
					<p class="cc-pdf-p" style="margin-top: 8px;"><strong>Carrying Weight:</strong> ${weightInfo.totalWeight} lbs. / ${weightInfo.capacity} lbs. max</p>
				</div>
				<div>
					<h3>Coinage</h3>
					<div class="cc-pdf-coin-grid">
						<div>CP: <strong>[ ${currency.cp || "&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>SP: <strong>[ ${currency.sp || "&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>EP: <strong>[ ${currency.ep || "&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>GP: <strong>[ ${currency.gp || "&nbsp;&nbsp;&nbsp;"} ]</strong></div>
						<div>PP: <strong>[ ${currency.pp || "&nbsp;&nbsp;&nbsp;"} ]</strong></div>
					</div>
				</div>
			</section>

			<!-- Clean Open Notes Section -->
			<section class="cc-pdf-section" style="flex: 1; display: flex; flex-direction: column;">
				<h3>Character &amp; Session Notes</h3>
				<div class="cc-pdf-notes-full">
					${character.identity.notes ? esc(character.identity.notes) : ""}
				</div>
			</section>

			<footer class="cc-pdf-footer">
				<span>D&amp;D 2024 Character Sheet</span>
				<span>Page 2 of 2</span>
			</footer>
		</div>
	`;
	return root;
}

function renderSpells (character, d) {
	const cantrips = character.spells.cantrips || [];
	const prepared = character.spells.prepared || [];
	const known = character.spells.known || [];
	if (!d.spellAbility && !cantrips.length && !prepared.length && !known.length) return "";

	const slotPips = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
		const cnt = d.slots ? (d.slots[lvl - 1] || 0) : 0;
		if (!cnt) return null;
		const pips = Array.from({length: cnt}, () => "◯").join(" ");
		return `<span>Lvl ${lvl}: ${pips}</span>`;
	}).filter(Boolean).join(" &nbsp;|&nbsp; ");

	return `
		<section class="cc-pdf-section">
			<h3>Spellcasting &amp; Spell Slots Tracker</h3>
			<p class="cc-pdf-p">
				<strong>Ability:</strong> ${esc((d.spellAbility || "—").toUpperCase())}
				· <strong>Save DC:</strong> ${d.spellSaveDc ?? "—"}
				· <strong>Attack Bonus:</strong> ${d.spellAttack != null ? formatMod(d.spellAttack) : "—"}
			</p>
			${slotPips ? `<div class="cc-pdf-slot-tracker"><strong>Slots:</strong> ${slotPips}</div>` : ""}
			${cantrips.length ? `<p class="cc-pdf-p"><strong>Cantrips:</strong> ${esc(cantrips.map(prettyUid).join(", "))}</p>` : ""}
			${prepared.length ? `<p class="cc-pdf-p"><strong>Prepared:</strong> ${esc(prepared.map(prettyUid).join(", "))}</p>` : ""}
			${known.length ? `<p class="cc-pdf-p"><strong>Known:</strong> ${esc(known.map(prettyUid).join(", "))}</p>` : ""}
		</section>
	`;
}

function prettyUid (uid) {
	return String(uid).split("|")[0].replace(/\b\w/g, c => c.toUpperCase());
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
