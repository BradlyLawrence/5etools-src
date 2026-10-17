import {craftingDay} from './crafting.mjs';

/** Explicit recipe classifications only; never infer mundane from price/name. */
export function mundaneCraftingMultiplier(recipe,{rapidFabrication=false,masterAlchemist=false}={}){
 const c=recipe.craftingClassification;
 const excluded=recipe.magic===true||recipe.technology===true||recipe.enhancement>0||recipe.tech||recipe.reservoir||
  (recipe.adaptations?.length??0)>0||(recipe.effects?.length??0)>0;
 if(c?.mundane!==true||excluded)return 1;
 const rapid=rapidFabrication&&c.device===true;
 const alchemy=masterAlchemist&&(c.alchemical===true||c.poison===true);
 return rapid||alchemy?10:1;
}

/** Existing work target/DC/costs are untouched, including the campaign work discount.
 * Only successful progress increases. Mishaps use the original plan DC and penalty.
 * Caller is responsible for training/tools/materials/feat eligibility.
 */
export function mundaneCraftingDay(plan,day,recipe,benefits){
 const multiplier=mundaneCraftingMultiplier(recipe,benefits);
 return {...craftingDay({...plan,progressMultiplier:plan.progressMultiplier*multiplier},day),workRateMultiplier:multiplier};
}
