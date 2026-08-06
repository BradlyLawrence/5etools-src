/**
 * dmtools/tlotrr/js/quick-ref.js
 * Comprehensive Rules Reference & DM Screen Cheat Sheet for LOTR RPG Loremaster.
 */

export function renderQuickRefUI() {
	const containerEl = document.getElementById("quickRefContainer");
	if (!containerEl) return;

	containerEl.innerHTML = `
		<div style="display:flex; flex-direction:column; gap:1rem;">
			<div class="lm-card">
				<div class="lm-card-header">
					<div class="lm-card-title">📜 Loremaster DM Screen & LOTR RPG Rules Reference</div>
					<span class="badge badge-gold">LOTR RPG (Free League 5e)</span>
				</div>
				<p style="color:var(--text-muted); font-size:0.85rem;">
					Everything that sets <em>The Lord of the Rings Roleplaying</em> apart from standard D&D 5e at a glance. Select any section below to view full mechanical rules, formulas, and conditions!
				</p>
			</div>

			<!-- Accordion Sections -->
			<div class="lm-card">
				<!-- Section 1: Fellowship Points, Hope & Downtime Undertakings -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>🕊️ 1. Fellowship Points, Hope & Downtime Undertakings</span>
						<span class="badge badge-gold">CORE SYSTEM</span>
					</div>
					<div class="accordion-body">
						<div style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.85rem; color:var(--text-primary);">
							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-left:3px solid var(--accent-gold); border-radius:4px;">
								<strong style="color:var(--text-gold)">Fellowship Pool:</strong>
								<div>Gained at the start of each Journey Phase. <strong>Pool Size = 1 per Player Character + Patron Bonus</strong> (+1 to +2).</div>
							</div>

							<div>
								<strong style="color:var(--text-gold)">Spending Fellowship Points:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.2rem; display:flex; flex-direction:column; gap:0.2rem;">
									<li><strong>Heal Companion's Hope:</strong> Spend 1 Fellowship Point to restore 1 Hope to any companion in the company.</li>
									<li><strong>Gain Advantage to Aid:</strong> Spend 1 Fellowship Point to grant Advantage on an attack roll or ability check made to assist a companion.</li>
								</ul>
							</div>

							<div>
								<strong style="color:var(--text-gold)">Hope Score:</strong>
								<div><strong>Max Hope = 8 + Wisdom modifier</strong> (or base class Hope score). Spend 1 Hope to add +1d6 to an attack roll, ability check, or saving throw, or to trigger Cultural Virtues!</div>
							</div>

							<div style="background:rgba(43,92,143,0.15); border:1px solid rgba(43,92,143,0.4); padding:0.6rem; border-radius:4px;">
								<strong style="color:#74c0fc">Yule & Fellowship Phase Undertakings:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.25rem;">
									<li><strong>Heal Shadow:</strong> Spend downtime at a Sanctuary (Rivendell, Shire, Beorn's Hall) to convert temporary Shadow to permanent or clear it.</li>
									<li><strong>Meet Patron:</strong> Receive counsel, local rumors, and +1 Fellowship Point.</li>
									<li><strong>Study Lore & Maps:</strong> Gain Advantage on future Travel/History checks in a specific region for the next journey.</li>
									<li><strong>Raise Cultural Standing:</strong> Spend treasure or gifts to increase your renown with a culture or realm.</li>
									<li><strong>Write a Song / Crafting:</strong> Produce heroic songs or forge gear.</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Section 2: Shadow Points, Miserable Condition & Bout of Madness -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>💔 2. Shadow Points, Corruption & Bout of Madness</span>
						<span class="badge danger">CORRUPTION</span>
					</div>
					<div class="accordion-body">
						<div style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.85rem;">
							<div>
								<strong style="color:var(--text-danger)">4 Sources of Shadow Points:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.25rem;">
									<li><strong>Dread (Fear & Horror):</strong> Experiencing terrifying undead, Nazgûl, or dark sorcery. DC 13-15 Wisdom saving throw or gain 1-2 Shadow.</li>
									<li><strong>Greed (Lure of Secrets & Power):</strong> Handling corrupted ancient artifacts or cursed dragon-hoards. DC 14 Charisma save or gain 1 Shadow.</li>
									<li><strong>Sorcery (Defiled Ground):</strong> Entering places tainted by Sauron's old sorcery. DC 14-16 Wisdom save or gain 2 Shadow.</li>
									<li><strong>Misdeeds (Harmful Actions):</strong> Dishonorable or cruel acts committed against Free Peoples. Automatic +1 to +3 Shadow Points.</li>
								</ul>
							</div>

							<div style="background:rgba(139,30,36,0.2); border:1px solid #8b1e24; padding:0.6rem; border-radius:4px;">
								<strong style="color:#ff6b6b">Miserable Condition:</strong>
								<div>Triggered instantly when a character's <strong>Shadow Points >= Current Hope</strong>. While Miserable:</div>
								<ul style="padding-left:1.2rem; margin-top:0.2rem;">
									<li>You suffer <strong>Disadvantage on ALL d20 rolls</strong> (attack rolls, ability checks, saving throws).</li>
									<li>You <strong>CANNOT spend Hope</strong> for any reason.</li>
									<li>Rolling a 1 on a d20 or failing a saving throw triggers a <strong>Bout of Madness</strong>!</li>
								</ul>
							</div>

							<div>
								<strong style="color:var(--text-gold)">Bout of Madness & Shadow Flaw Paths:</strong>
								<div>When a Miserable hero suffers a Bout of Madness, they lose control temporarily and advance 1 stage on their Shadow Flaw Path:</div>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.2rem; color:var(--text-muted);">
									<li><strong>Path of Power (Captain):</strong> Resentful → Arrogant → Overconfident → Tyrannical</li>
									<li><strong>Path of Despair (Champion):</strong> Troubled → Wavering → Guilt-ridden → Fearful</li>
									<li><strong>Dragon-sickness (Treasure Hunter):</strong> Grasping → Mistrustful → Deceitful → Thieving</li>
									<li><strong>Lure of Secrets (Scholar):</strong> Haughty → Scornful → Scheming → Traitorous</li>
									<li><strong>Path of the Shadow (Warden/Messenger):</strong> Aloof → Cold → Uncaring → Desperate</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Section 3: Council Rules & Audiences (Social Engine) -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>👑 3. Council Rules & Audiences (Social Interaction)</span>
						<span class="badge badge-gold">AUDIENCS</span>
					</div>
					<div class="accordion-body">
						<div style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.85rem;">
							<p>Councils represent formal audiences with lords, kings, or chieftains (e.g. Elrond at Rivendell, King Bard at Dale, Butterbur at Bree).</p>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-left:3px solid var(--accent-gold); border-radius:4px;">
								<strong style="color:var(--text-gold)">The 3 Stages of a Council:</strong>
								<ol style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.25rem;">
									<li><strong>Stage 1: Introduction:</strong> Spokesperson makes a <em>Courtesy</em> or <em>Tradition</em> check to establish initial standing and set the Lord's <strong>Tolerance Limit</strong>.</li>
									<li><strong>Stage 2: Interaction:</strong> Company presents arguments using <em>Riddle, Insight, Persuasion, Performance, History, Lore</em>. Each check consumes 1 Tolerance point.</li>
									<li><strong>Stage 3: Outcome:</strong> Compare total successful checks against the Resistance Threshold.</li>
								</ol>
							</div>

							<div>
								<strong style="color:var(--text-gold)">Initial Attitude & Modifiers:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.2rem;">
									<li><strong>Friendly (+2 Tolerance):</strong> Lord welcomes company with open arms.</li>
									<li><strong>Neutral (+0 Tolerance):</strong> Standard formal reception.</li>
									<li><strong>Suspicious (-1 Tolerance):</strong> Lord is cautious or wary of strangers.</li>
									<li><strong>Hostile (-2 Tolerance):</strong> Lord holds old grievances or prejudice against company's cultures.</li>
								</ul>
							</div>

							<div style="background:rgba(212,175,55,0.1); border:1px solid var(--border-gold); padding:0.6rem; border-radius:4px;">
								<strong style="color:var(--text-gold)">Council Outcome Table:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.2rem;">
									<li><strong>0 Successes:</strong> Request refused with offense or hostility. Company asked to leave.</li>
									<li><strong>1 Success:</strong> Request granted reluctantly, subject to strict conditions or heavy cost.</li>
									<li><strong>2-3 Successes:</strong> Full agreement! Lord provides aid, escorts, or gifts.</li>
									<li><strong>4+ Successes:</strong> Overwhelming success! Deep alliance forged, noble honors bestowed!</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Section 4: Journey Phase & Travel Roles -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>🗺️ 4. Journey Phase, Travel Roles & Peril</span>
						<span class="badge badge-gold">JOURNEYS</span>
					</div>
					<div class="accordion-body">
						<div style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.85rem;">
							<div>
								<strong style="color:var(--text-gold)">4 Essential Travel Roles:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.25rem;">
									<li><strong>Guide:</strong> Chooses the travel path and makes <em>Travel</em> checks during journey events.</li>
									<li><strong>Scout:</strong> Prevents ambushes and makes <em>Investigation/Stealth</em> checks to locate safe campsites.</li>
									<li><strong>Huntsman:</strong> Forages for food & water, making <em>Survival</em> checks to prevent Fatigue.</li>
									<li><strong>Look-out:</strong> Keeps watch against wild beasts and Orc spies, making <em>Perception</em> checks.</li>
								</ul>
							</div>

							<div>
								<strong style="color:var(--text-gold)">Hex Terrain Speed & Costs:</strong>
								<ul style="padding-left:1.2rem; margin-top:0.2rem;">
									<li>🌿 <strong>Border Lands:</strong> 1 travel day per hex (Safe, well-maintained roads).</li>
									<li>🌾 <strong>Wild Lands:</strong> 2 travel days per hex (Wilderness, hills, forests).</li>
									<li>🌋 <strong>Dark Lands:</strong> 3 travel days per hex (Swamps, ruins, tainted ground).</li>
									<li>⬛ <strong>Impassable Terrain:</strong> 5 travel days per hex (High mountain peaks, deep chasms).</li>
								</ul>
							</div>

							<div style="background:rgba(139,30,36,0.15); border-left:3px solid #8b1e24; padding:0.6rem; border-radius:4px;">
								<strong style="color:#ff6b6b">Perilous Hexes Modifier:</strong>
								<div>Perilous areas (Rating 1 to 5) increase the DC of all Journey Event checks by <strong>+1 to +5</strong>!</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Section 5: Eye of Mordor & Shadow Awareness -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>👁️ 5. Eye of Mordor & Shadow Awareness</span>
						<span class="badge danger">SAURON</span>
					</div>
					<div class="accordion-body">
						<div style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.85rem;">
							<p>Tracks how much attention the Dark Lord and his servants pay to the company's deeds across Middle-earth.</p>

							<div>
								<strong style="color:var(--text-danger)">Eye Awareness Triggers (+1 to +3):</strong>
								<ul style="padding-left:1.2rem; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.2rem;">
									<li><strong>Rolling a Natural 1 on d20:</strong> +1 Eye Awareness.</li>
									<li><strong>Casting Magic / Spells:</strong> +1 Eye Awareness per spell level cast.</li>
									<li><strong>Carrying Corrupted Artifacts:</strong> +1 Eye Awareness per day.</li>
									<li><strong>Entering Dark or Perilous Lands:</strong> +1 to +3 Eye Awareness.</li>
								</ul>
							</div>

							<div style="background:rgba(139,30,36,0.2); border:1px solid #8b1e24; padding:0.6rem; border-radius:4px;">
								<strong style="color:#ff6b6b">Revelation Episode (Threshold Reached):</strong>
								<div>When Eye Awareness reaches the Region's Hunt Threshold (14-20):</div>
								<ul style="padding-left:1.2rem; margin-top:0.2rem;">
									<li>The enemy sends Nazgûl, Black Uruks, or Fell Beasts to hunt the company!</li>
									<li>Shadow Awareness resets to 0 after the Revelation Episode resolves.</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<!-- Section 6: 5e & LOTR RPG Conditions Cheat Sheet -->
				<div class="accordion-item">
					<div class="accordion-header" onclick="window.toggleAccordion(this)">
						<span>📜 6. 5e & LOTR RPG Conditions Cheat Sheet</span>
						<span class="badge badge-gold">DM CHEAT SHEET</span>
					</div>
					<div class="accordion-body">
						<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:0.8rem; font-size:0.85rem;">
							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-gold);">
								<strong style="color:var(--text-gold)">💔 Miserable (LOTR RPG)</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Shadow >= Hope. Disadvantage on ALL attack rolls, ability checks, and saving throws; cannot spend Hope.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-gold);">
								<strong style="color:var(--text-gold)">🛡️ Weary (LOTR RPG)</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Disadvantage on physical checks (Strength, Dexterity, Constitution); movement speed reduced by 10 ft.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">⚡ Exhaustion (Levels 1-6)</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">1: Check Disadv | 2: Speed 1/2 | 3: Attack/Save Disadv | 4: HP Max 1/2 | 5: Speed 0 | 6: Death</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">👁️ Blinded</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Cannot see; automatically fails checks requiring sight. Attackers have Advantage; blinded creature's attacks have Disadvantage.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">💖 Charmed</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Cannot attack charmer; charmer has Advantage on social ability checks against the target.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">😱 Frightened</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Disadvantage on checks/attacks while source of fear is in sight; cannot willingly move closer to source of fear.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">🤼 Grappled / Restrained</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Grappled: Speed 0. Restrained: Speed 0, attacks against have Adv, target's attacks have Disadv, Dex save Disadv.</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">💫 Stunned / Paralyzed</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Incapacitated, fails Str/Dex saves. Paralyzed: Auto-crit for attacks within 5 ft!</p>
							</div>

							<div style="background:rgba(0,0,0,0.3); padding:0.6rem; border-radius:4px; border:1px solid var(--border-light);">
								<strong style="color:var(--text-primary)">🛌 Unconscious</strong>
								<p style="margin-top:0.2rem; color:var(--text-muted)">Incapacitated, drops held items, fails Str/Dex saves, attacks against have Adv, hits within 5 ft are critical hits!</p>
							</div>
						</div>
					</div>
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

