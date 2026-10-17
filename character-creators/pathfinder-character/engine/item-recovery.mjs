/** Explicit item-use recovery policies. No inventory mutation or automatic rolls. */
export function validateRecovery(r){
 if(!r||!['reusable','salvageable','consumed','source-rule'].includes(r.type))throw Error('Invalid recovery type.');
 if(![null,'recycle'].includes(r.requiresKnack))throw Error('Invalid recovery prerequisite.');
 if(r.type==='reusable'&&(r.chancePercent!==100||r.result!=='same-item'))throw Error('Reusable recovery must return the same item at 100%.');
 if(r.type==='consumed'&&(r.chancePercent!==0||r.result!=='none'))throw Error('Consumed items cannot be restored.');
 if(r.type==='source-rule'&&(!r.chanceByOutcome||Object.values(r.chanceByOutcome).some(n=>!Number.isFinite(n)||n<0||n>100)))throw Error('Invalid source recovery rule.');
 if(r.type==='salvageable'){
  if(r.requiresKnack!=='recycle'||r.chancePercent!==25||r.result!=='components')throw Error('Salvage requires Recycle and a 25% component roll.');
  if(!Array.isArray(r.components)||!r.components.length||r.components.some(c=>typeof c.id!=='string'||!c.id||!Number.isInteger(c.quantity)||c.quantity<1)||!Array.isArray(r.consumedIngredients))throw Error('Salvage needs explicit recoverable components and consumed ingredients.');
 }
 return r;
}

/** Each use represents ONE expended item/unit, not a stack or a gold-value pool.
 * The future sheet must persist attemptedUseIds alongside its own inventory ledger.
 */
export function resolveItemRecovery(item,use,{actorId,hasRecycle=false,rollD4,rollPercent,attemptedUseIds=[]}={}){
 if(!use||typeof use.id!=='string'||!use.id||use.itemId!==item.id||use.quantity!==1||typeof use.instanceId!=='string'||!use.instanceId)throw Error('Recovery requires one identified item-use event.');
 if(attemptedUseIds.includes(use.id))throw Error('This use has already been checked for recovery.');
 const base={useId:use.id,itemId:item.id,instanceId:use.instanceId,recoveredItem:null,components:[],attemptedUseIds:[...attemptedUseIds]};
 const deny=reason=>({...base,reason});
 if(!item.recovery)return deny('Unreviewed item: no recovery permission.');
 const r=validateRecovery(item.recovery);
 if(use.afterCombat!==true||use.accessible!==true||use.destroyed===true)return deny('Requires accessible surviving remains after combat.');
 if(r.type==='consumed')return deny('Consumed contents cannot be recovered.');
 if(r.requiresKnack==='recycle'&&(!hasRecycle||!actorId||use.actorId!==actorId))return deny('Recycle requires the knack and personal use.');
 let success=true;
 if(r.type==='salvageable'){
  if(!Number.isInteger(rollD4)||rollD4<1||rollD4>4)throw Error('Enter a separate d4 roll for this use.');
  success=rollD4===4;
 }else if(r.type==='source-rule'){
  // Masterwork ammunition is destroyed on use, even on a miss.
  const chance=item.masterwork||item.enhancement>0||item.magic===true?0:r.chanceByOutcome[use.outcome];
  if(chance===undefined)return deny('This use needs its source-rule outcome.');
  if(chance>0&&chance<100){if(!Number.isInteger(rollPercent)||rollPercent<1||rollPercent>100)throw Error('Enter a separate percentile roll for this ammunition use.');success=rollPercent<=chance;}
  else success=chance===100;
 }
 const result={...base,attemptedUseIds:[...attemptedUseIds,use.id],searchMinutes:r.requiresKnack==='recycle'?10:null,reason:success?'Recovered.':'Nothing recoverable from this use.'};
 if(!success)return result;
 if(r.type==='salvageable')return {...result,components:structuredClone(r.components).map(c=>({...c,forItemId:item.id,forInstanceId:use.instanceId})),replacementIngredients:structuredClone(r.consumedIngredients),rebuildMinutes:10};
 return {...result,recoveredItem:{itemId:item.id,instanceId:use.instanceId,quantity:1},restoresCharges:false,restoresHP:false};
}
