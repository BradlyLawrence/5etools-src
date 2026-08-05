/**
 * dmtools/tlotrr/js/quick-ref.js
 * Rules Cheat Sheet & Reference Lookup for LOTR RPG Loremaster.
 */

export function renderQuickRefUI() {
	const containerEl = document.getElementById("quickRefContainer");
	if (!containerEl) return;

	containerEl.innerHTML = `
		<div class="lm-card">
			<div class="lm-card-header">
				<div class="lm-card-title">📜 Loremaster Quick Reference</div>
			</div>

			<div class="accordion-item">
				<div class="accordion-header" onclick="window.toggleAccordion(this)">
					<span>👁️ Sources of Shadow & Corruption</span>
					<span>▼</span>
				</div>
				<div class="accordion-body">
					<ul style="padding-left:1.2rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem;">
						<li><strong>Dread (Fear & Horror):</strong> Experiencing terrifying dark magic or undead. DC 13 Wisdom saving throw or gain 1-2 Shadow Points.</li>
						<li><strong>Greed (Lure of Secrets/Power):</strong> Handling corrupted treasure or dark artifacts. DC 14 Charisma saving throw or gain 1 Shadow Point.</li>
						<li><strong>Sorcery:</strong> Witnessing dark sorcery or stepping into defiled ground. DC 15 Wisdom saving throw or gain 2 Shadow Points.</li>
						<li><strong>Misdeed (Blunders & Treachery):</strong> Harmful or dishonorable actions against Free Peoples. Automatic 1-3 Shadow Points.</li>
					</ul>
				</div>
			</div>

			<div class="accordion-item">
				<div class="accordion-header" onclick="window.toggleAccordion(this)">
					<span>💔 Shadow Flaws & Madness Stages</span>
					<span>▼</span>
				</div>
				<div class="accordion-body">
					<p style="color:var(--text-muted); margin-bottom:0.4rem;">When a character's Shadow Points equal or exceed their Wisdom score, they become <strong>Miserable</strong>. If they fail a saving throw while Miserable, they suffer a <strong>Bout of Madness</strong> and advance a Shadow Path Flaw stage:</p>
					<ul style="padding-left:1.2rem; color:var(--text-muted);">
						<li><strong>Lure of Power (Captain):</strong> Resentful → Arrogant → Overconfident → Tyrannical</li>
						<li><strong>Path of Despair (Champion):</strong> Troubled → Wavering → Guilt-ridden → Fearful</li>
						<li><strong>Dragon-sickness (Treasure Hunter):</strong> Grasping → Mistrustful → Deceitful → Thieving</li>
						<li><strong>Lure of Secrets (Scholar):</strong> Haughty → Scornful → Scheming → Traitorous</li>
					</ul>
				</div>
			</div>

			<div class="accordion-item">
				<div class="accordion-header" onclick="window.toggleAccordion(this)">
					<span>🗺️ Travel Pace & Fatigue</span>
					<span>▼</span>
				</div>
				<div class="accordion-body">
					<p style="color:var(--text-muted);">Standard travel covers ~1 hex (20 miles) every 2 days. Hard terrain (Wild Lands / Mountains) doubles duration. At the end of a journey segment, PCs make a Travel check (DC 10 + terrain mod) to avoid Fatigue steps.</p>
				</div>
			</div>
		</div>
	`;
}

window.toggleAccordion = function(headerEl) {
	const body = headerEl.nextElementSibling;
	if (body) {
		body.style.display = (body.style.display === "none" || !body.style.display) ? "block" : "none";
	}
};
