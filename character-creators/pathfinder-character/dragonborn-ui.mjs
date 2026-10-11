export function renderDragonborn(sheet){
 const d=sheet.dragonborn;if(!d)return '';
 let html='<h3>Draconic traits</h3>';
 if(d.darkvisionFt)html+=`<p>Darkvision ${d.darkvisionFt} ft.</p>`;
 if(d.resistance)html+=`<p>Resistance ${d.resistance.value} (${d.resistance.energy}).</p>`;
 if(d.breath)html+=`<p>Breath weapon: ${d.breath.damage} ${d.breath.energy}; ${d.breath.shapes.join(' or ')}; Reflex DC ${d.breath.dc} for half damage. Once per day, standard action.</p>`;
 if(d.claws)html+=`<p>Two primary claw attacks: ${d.claws.attack>=0?'+':''}${d.claws.attack} each; 1d4 ${d.claws.damageBonus>=0?'+':''}${d.claws.damageBonus} slashing damage each. Use only free claws. When combined with manufactured weapon attacks, natural attacks become secondary. Resolve these attacks separately from the equipped weapon line.</p>`;
 return html;
}
