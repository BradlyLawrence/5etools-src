import {overloadActive,reservoirMaximum,techProficient} from './technology.mjs';
export function defensiveTechProfiles(rules,c,sheet){
 const profiles=[];
 for(const instance of c.techEquipment?.items??[]){
  const item=rules.equipment.items.find(x=>x.id===instance.itemId);if(!item?.tech||item.kind==='weapon')continue;
  const maximumHp=item.durability.hitPoints+instance.enhancement*10,damage=instance.damageTaken??0,hardness=({steel:10,mithral:15,adamantine:20}[instance.material??'steel'])+instance.enhancement*2;
  const equipped=c.techEquipment[item.kind==='armor'?'armorInstanceId':'shieldInstanceId']===instance.instanceId;
  const specialist=(c.classes.ironwright??0)>=1&&c.techEquipment.specialization==='armour';
  const actions=rules.technology.families.find(f=>f.id===item.tech.family).actions.map(a=>{
   const b=specialist?a.specialistBenefits:a.benefits,lines=[];
   if(b.cmdBonus)for(const m of ['trip','bull-rush','reposition','disarm','sunder']){const base=sheet.stats['maneuver.'+m+'.defense']?.total??sheet.stats.cmd?.total;lines.push(`${m}: +${b.cmdBonus} CMD${base===undefined?'':'; total '+(base+b.cmdBonus)} against one attempt`);}
   if(b.interceptDamage)lines.push(`Intercept up to ${b.interceptDamage} damage; armour loses max(0, intercepted damage − ${Math.max(0,hardness-10)}) HP.`);
   if(b.gripBonus){const base=sheet.stats['maneuver.grapple.check']?.total;lines.push(`Strength checks to lift, bend, force open or hold: +${b.gripBonus} circumstance. Grapple: +${b.gripBonus} circumstance${base===undefined?'':'; total '+(base+b.gripBonus)}. Duration: 1 minute.`);}
   if(b.craftBonus)lines.push(`Craft: +${b.craftBonus} circumstance; rushed technological Craft only: +${b.quickCraftBonus} instead. One check, regardless of work duration. Quick crafting raises the DC by 5.`);
   if(b.speedBonusFt)lines.push(`One move: ${(sheet.equipment?.speedFt??30)+b.speedBonusFt} ft. (+${b.speedBonusFt} ft.).`);
   if(b.horizontalFt)lines.push(`Vault: ${b.horizontalFt} ft. horizontally or ${b.verticalFt} ft. vertically. No Acrobatics check or attacks of opportunity. Counts as the movement required to initiate a charge.`);
   if(b.shieldBonus)lines.push(`One attack: +${b.shieldBonus} additional shield AC${sheet.equipment?.shieldApplies?'; total AC '+(sheet.stats.ac.total+b.shieldBonus):' (requires the equipped shield bonus to apply)'}.`);
   if(b.edges)lines.push(`Partial cover across ${b.edges} connected 5-foot edges. Standard action to deploy; move action to disengage. May be abandoned in place; no equipped shield bonus while deployed.`);
   return {...a,benefits:b,lines,available:equipped&&!instance.deployed&&damage<maximumHp/2&&(instance.reservoir>=a.cost||overloadActive(c,instance))&&!instance.mechanismBroken&&techProficient(c,item)};
  });
  profiles.push({instance,item,equipped,specialist,actions,maximum:reservoirMaximum(item,instance),maximumHp,hp:Math.max(0,maximumHp-damage),hardness,broken:damage>=maximumHp/2});
 }
 return profiles;
}
