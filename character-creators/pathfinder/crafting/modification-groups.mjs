import {MINOR_ADAPTATIONS,adaptationAllowed} from '../../pathfinder-character/engine/minor-adaptations.mjs';
export function modificationGroups(slot,base){
 const ranged=base?.handling==='ranged'||!!base?.firearm;
 const title=slot==='weapon'?(ranged?'Ranged weapons':'Melee weapons'):'Armour & shields';
 const groups=new Map();
 for(const [id,a] of Object.entries(MINOR_ADAPTATIONS)){
  if(!adaptationAllowed(a,slot)||slot==='weapon'&&(ranged&&!a.slots||!ranged&&a.firearmOnly))continue;
  const category=a.firearmOnly?'Ammunition & range':!a.slots?'Minor adaptations':a.dice?'Elemental damage':a.penetration||a.fortificationReduction?'Armour penetration':a.somaticWhileWielding||a.damageConcentrationDCBonus?'Spellcasting & disruption':a.resistance?'Energy resistance — '+a.element[0].toUpperCase()+a.element.slice(1):a.damageReduction?'Damage reduction':a.fortification?'Fortification':a.stealthEnvironment?'Concealment':a.environmentalSave||a.insulated?'Environmental protection':a.impactCapacitor?'Impact storage':'Minor adaptations';
  if(!groups.has(category))groups.set(category,[]);groups.get(category).push([id,a]);
 }
 return {title,groups:[...groups].map(([name,items])=>({name,items}))};
}
