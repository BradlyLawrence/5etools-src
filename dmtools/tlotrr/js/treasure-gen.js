/**
 * dmtools/tlotrr/js/treasure-gen.js
 * Precious Objects & Middle-earth Treasure Hoard Generator for LOTR RPG.
 */

const PRECIOUS_TYPES = [
	"Ring of carved chalcedony and silver",
	"Circlet of beaten gold set with star sapphires",
	"Drinking horn bound in chased silver depicting a stag hunt",
	"Goblet of clear crystal with gold filigree",
	"Brooch of silver, crafted in the shape of a mallorn leaf",
	"Necklace of pearls from the Bay of Belfalas",
	"Belt of silver links studded with garnets",
	"Ancient coin purse containing gold pieces of Arnor"
];

const WONDROUS_BLESSINGS = [
	"Casket of Elven Elixirs (Removes 1 Fatigue step upon consumption)",
	"Phial of Star-light (Dispels darkness and gives advantage against Dread)",
	"Cloak of Elvenkind (Advantage on Stealth checks in wilderness)",
	"Rope of Hithlain (Never unties unless commanded, advantage on Athletics)",
	"Horn of Gondor (Inspires allies, +1 Hope to all PCs within 60 ft once per day)"
];

export function renderTreasureUI() {
	const containerEl = document.getElementById("treasureUIContainer");
	if (!containerEl) return;

	containerEl.innerHTML = `
		<div class="lm-card">
			<div class="lm-card-header">
				<div class="lm-card-title">💎 Treasure Hoard & Precious Objects Generator</div>
			</div>

			<div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
				<button class="btn-lm primary" onclick="window.generateHoard('minor')">Loot Minor Hoard (CR 1-4)</button>
				<button class="btn-lm primary" onclick="window.generateHoard('major')">Loot Major Hoard (CR 5-10)</button>
				<button class="btn-lm primary" onclick="window.generateHoard('legendary')">Loot Legendary Hoard (CR 11+)</button>
			</div>

			<div id="hoardResult" style="background:rgba(0,0,0,0.3); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-gold); display:none">
			</div>
		</div>
	`;
}

window.generateHoard = function(tier) {
	const resEl = document.getElementById("hoardResult");
	if (!resEl) return;

	let coinValue = 0;
	let preciousCount = 1;
	let bonusItem = "";

	if (tier === 'minor') {
		coinValue = Math.floor(Math.random() * 50) + 20;
		preciousCount = 1;
	} else if (tier === 'major') {
		coinValue = Math.floor(Math.random() * 200) + 100;
		preciousCount = Math.floor(Math.random() * 3) + 1;
		bonusItem = WONDROUS_BLESSINGS[Math.floor(Math.random() * WONDROUS_BLESSINGS.length)];
	} else {
		coinValue = Math.floor(Math.random() * 800) + 500;
		preciousCount = Math.floor(Math.random() * 4) + 2;
		bonusItem = WONDROUS_BLESSINGS[Math.floor(Math.random() * WONDROUS_BLESSINGS.length)] + " + Famous Weapon/Armour of Arnor";
	}

	const chosenPrecious = [];
	for (let i = 0; i < preciousCount; i++) {
		chosenPrecious.push(PRECIOUS_TYPES[Math.floor(Math.random() * PRECIOUS_TYPES.length)]);
	}

	resEl.style.display = "block";
	resEl.innerHTML = `
		<h4 style="color:var(--text-gold); font-size:1rem; margin-bottom:0.4rem; text-transform:uppercase;">${tier} Hoard Contents</h4>
		<div style="font-size:0.9rem; color:var(--text-primary);">
			<div>💰 <strong>Treasure Value:</strong> ${coinValue} Silver Coins / Gold equivalent</div>
			<div style="margin-top:0.4rem;">✨ <strong>Precious Objects:</strong></div>
			<ul style="padding-left:1.2rem; color:var(--text-muted);">
				${chosenPrecious.map(p => `<li>${p}</li>`).join("")}
			</ul>
			${bonusItem ? `<div style="margin-top:0.5rem; color:var(--text-gold);">🗡️ <strong>Wondrous Artefact:</strong> ${bonusItem}</div>` : ''}
		</div>
	`;
};
