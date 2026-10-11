export const itemPrice=item=>item.cost?.gp===0||['unarmed-strike','club','quarterstaff','sling'].includes(item.id)?'Free':item.cost?.text??'Price not set';
export function equipmentGroups(items){
 const groups=[],used=new Set();
 const add=(label,predicate)=>{const entries=items.filter(x=>!used.has(x.id)&&predicate(x)).sort((a,b)=>a.name.localeCompare(b.name));if(entries.length){groups.push({label,items:entries});entries.forEach(x=>used.add(x.id));}};
 for(const [type,name]of [['simple','Simple'],['martial','Martial'],['exotic','Exotic'],['tech','Tech']]){
  const matches=x=>x.kind==='weapon'&&(type==='tech'?!!x.tech||x.proficiency?.startsWith('tech-'):x.proficiency===type);
  for(const [handling,label]of [['light','Light'],['one-handed','One-handed'],['two-handed','Two-handed'],['ranged','Ranged']])add(`${name} weapons — ${label}`,x=>matches(x)&&x.handling===handling);
  add(`${name} weapons — Miscellaneous`,matches);
 }
 for(const [category,label]of [['light','Light armour'],['medium','Medium armour'],['heavy','Heavy armour']])add(label,x=>x.kind==='armor'&&x.category===category);
 add('Shields',x=>x.kind==='shield');add('Ammunition',x=>x.kind==='ammunition');add('Armour extras',x=>x.kind==='armor-addon');add('Tools and gadgets',x=>x.kind==='tool');add('Other equipment',()=>true);
 return groups;
}
export function itemDetails(item){
 const rows=[['Price',itemPrice(item)],['Weight',item.weightLb==null?'Not set':`${item.weightLb} lb.`]];
 if(item.damage){rows.push(['Damage (Small)',item.damage.small?.join(' / ')??'—'],['Damage (Medium)',item.damage.medium?.join(' / ')??'—'],['Damage type',(item.damage.types??[]).join(item.damage.typeMode==='alternative'?' or ':' / ')],['Critical',(item.critical??[]).map(x=>(x.threatMin===20?'20':`${x.threatMin}–20`)+`/×${x.multiplier}`).join(' / ')],['Range',item.rangeIncrementFt?`${item.rangeIncrementFt} ft.`:item.firearm?.coneFt?`${item.firearm.coneFt}-foot cone`:'Melee']);}
 if(item.defense){const d=item.defense;rows.push(['AC bonus',`+${d.bonus}`],['Maximum Dex',d.maxDexBonus==null?'Unlimited':`+${d.maxDexBonus}`],['Armour check penalty',String(d.armorCheckPenalty)],['Arcane spell failure',`${d.arcaneFailurePercent}%`]);}
 if(item.tech)rows.push(['Reservoir',`${item.tech.reservoirBase} + ${item.tech.reservoirPerEnhancement} per enhancement bonus`]);
 if(item.reload)rows.push(['Capacity',String(item.reload.capacity)],['Reload',item.reload.action]);
 rows.push(['Traits',item.traits?.join(', ')||'None']);return rows;
}
