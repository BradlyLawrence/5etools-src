const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderBardSummary(b){
 if(!b)return '';
 const n=b.level,half=Math.floor(n/2);let h='<h3>Bard abilities</h3>';
 h+=`<p>Bardic performance: ${b.performanceRounds} rounds/day. Start as a ${b.startAction} action; maintain as a free action. Performance save DC ${b.dc} where the ability allows a save. Only one performance at a time. Usage and target resolution remain at the table.</p>`;
 if(!b.replaced.includes('inspire-courage'))h+=`<p>Inspire Courage: +${b.power} competence to weapon attacks and damage (conditional row), and +${b.power} morale on saves against charm and fear. Applies to eligible tech weapon attacks, without changing reservoir costs or powered dice.</p>`;
 if(!b.replaced.includes('bardic-knowledge'))h+=`<p>Bardic Knowledge: +${half} Knowledge checks, included; Knowledge skills can be used untrained.</p>`;
 if(!b.replaced.includes('lore-master')&&n>=5)h+=`<p>Lore Master: take 10 on Knowledge checks; take 20 ${1+Math.floor((n-5)/6)} time(s)/day.</p>`;
 if(b.untrainedAll)h+=`<p>Jack of All Trades: use skills untrained${b.allClassSkills?'; all skills count as class skills (included)':''}${n>=(b.archivist?17:19)?'; take 10 on any skill check even when normally prohibited':''}. This does not bypass proficiency or crafting feat requirements.</p>`;
 if(b.versatile.length)h+='<p>Versatile Performance: '+b.versatile.map(esc).join(', ')+'. Higher applicable Perform totals replace covered skill totals on the skills list.</p>';
 if(b.archivist){h+=`<p>Naturalist: +${b.power} insight AC and attack against an identified creature kind; +${b.power} on saves against that kind’s extraordinary, supernatural and spell-like abilities. See conditional rows; requires sight, hearing and shared language.</p>`;
 if(n>=2)h+=`<p>Archivist Lore Master: take 20 on Knowledge ${1+Math.floor((n-2)/6)} time(s)/day. Magic Lore: +${half} Spellcraft for magic item identification or scroll deciphering, take 10; disarm magical traps. Conditional saves +4.</p>`;
 if(n>=10)h+=`<p>Probable Path: take 10 on any d20 roll ${1+Math.floor((n-10)/3)} time(s)/day.</p>`;}
 if(b.court){h+=`<p>Satire: enemies who hear and understand take −${b.power} attack and damage (minimum damage 1), and −${b.power} saves against fear and charm. Enemy penalties are not subtracted from your sheet.</p><p>Heraldic Expertise: +${Math.max(1,half)} Diplomacy and Knowledge (history, local, nobility), included; ${1+Math.floor(n/5)} reroll(s)/day, keep the second result.</p>`;
 if(n>=3)h+=`<p>Mockery: −${2+Math.floor((n-3)/4)} to one target’s Charisma checks and Charisma-related skill checks.</p>`;
 if(n>=5)h+=`<p>Wide Audience: eligible area performances reach ${30+10*Math.floor((n-5)/5)}-foot radius or ${60+20*Math.floor((n-5)/5)}-foot cone. Multiple-target performances gain ${Math.floor((n-5)/5)} additional targets; single-target effects are unchanged.</p>`;}
 if(b.magician){h+=`<p>Magical Talent: +${half} Knowledge (arcana), Spellcraft and Use Magic Device, included. Improved Counterspell is granted.</p><p>Dweomercraft: allies gain +${b.power} caster-level checks, concentration and spell/spell-like attack rolls. This is ally support, not your own permanent caster-level increase, weapon bonus or Tech Use bonus.</p>`;
 if(n>=5)h+=`<p>Arcane bond: ${esc(b.bond??'choose an object')}; once/day cast a known bard spell through the bond, using normal level and component limits. Without it, casting requires concentration DC 20 + spell level. No familiar or weapon bond.</p>`;
 if(n>=10)h+=`<p>Wand Mastery: for spells on your bard list, wand save DC = 10 + spell level + ${b.cha} Charisma modifier${n>=16?'; use your bard caster level '+n+' instead of the wand’s':''}. This does not apply to technological devices.</p>`;}
 if(b.striker&&n>=3)h+=`<p>Wordstrike: standard action, 1 performance round; 1d4 + ${n} damage to an object, half to a living creature. Apply object rules normally.</p>`;
 if(b.striker&&n>=6)h+=`<p>Weird Words: standard action, up to ${Math.floor(n/4)} ranged touch attacks within 30 feet. Each costs 1 performance round and deals 4d6 sonic damage. Combine hits per target, then add Charisma (${b.cha>=0?'+':''}${b.cha}) and apply energy resistance once. No save. Weapon and reservoir bonuses do not apply.</p>`;
 if(b.dirge){if(n>=2)h+=`<p>Secrets of the Grave: +${half} Knowledge (religion) to identify undead (conditional row); mind-affecting spells can affect undead, but humanoid-only spells remain restricted. This does not bypass construct immunity or extend to all performances. Haunted Eyes gives +4 on its conditional saves.</p>`;
 if(n>=5)h+=`<p>Haunting Refrain: Perform (keyboard or percussion) can demoralise with +${half}; targets take −${2+Math.floor((n-5)/5)} on saves against fear effects you create. Immunities remain.</p>`;
 if(n>=10)h+='<p>Dance of the Dead: animate dead using performance rounds, no material components or evil descriptor. Remains collapse when performance ends and cannot be reused by this ability. Normal animate dead limits apply; no machine reanimation. Social consequences are determined by the GM.</p>';}
 for(const f of b.features)h+=`<details><summary>${esc(f.name)} — ${esc(f.archetype)}</summary><p style="white-space:pre-line">${esc(f.rulesText)}</p></details>`;
 return h;
}
