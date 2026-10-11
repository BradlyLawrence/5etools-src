/** Equipment catalogue validation and safe, explicit derivation. No combat state. */
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const nullable=(v,test)=>v===null||test(v);
export function validateEquipment(catalogue,traitCatalogue){
 assert(catalogue.schemaVersion==='1.0.0'&&Array.isArray(catalogue.items),'Invalid equipment catalogue');
 const traits=new Set(traitCatalogue.traits.map(t=>t.id));assert(traits.size===traitCatalogue.traits.length,'Duplicate traits');
 const ids=new Set();
 for(const item of catalogue.items){
  assert(typeof item.id==='string'&&/^[a-z0-9-]+$/.test(item.id)&&!ids.has(item.id),'Invalid or duplicate item ID');ids.add(item.id);
  assert(typeof item.name==='string'&&item.name.length>0,'Missing name');
  assert(['weapon','armor','shield','ammunition','armor-addon'].includes(item.kind),'Invalid item kind');
  assert(item.cost&&nullable(item.cost.gp,n=>finite(n)&&n>=0),'Invalid cost');
  assert(nullable(item.weightLb,n=>finite(n)&&n>=0),'Invalid weight');
  assert(Array.isArray(item.traits)&&item.traits.every(t=>traits.has(t)),'Unknown weapon trait');
  if(item.kind==='weapon'){
   assert(['simple','martial','exotic','tech-melee'].includes(item.proficiency),'Invalid proficiency');
   assert(['unarmed','light','one-handed','two-handed','ranged'].includes(item.handling),'Invalid weapon handling');
   for(const size of ['small','medium'])assert(nullable(item.damage?.[size],a=>Array.isArray(a)&&a.length>0&&a.every(d=>/^(\d+d\d+|\d+)$/.test(d))),'Invalid damage dice');
   assert(['choice','combined'].includes(item.damage.typeMode)&&item.damage.types.every(t=>['bludgeoning','piercing','slashing'].includes(t)),'Invalid damage type');
   assert(nullable(item.critical,a=>Array.isArray(a)&&a.length>0&&a.every(c=>Number.isInteger(c.threatMin)&&c.threatMin>=2&&c.threatMin<=20&&Number.isInteger(c.multiplier)&&c.multiplier>=2)),'Invalid critical profile');
   assert(nullable(item.rangeIncrementFt,n=>finite(n)&&n>0),'Invalid range');
   assert(typeof item.finesseEligible==='boolean','Missing finesse eligibility');
  }
  if(['armor','shield'].includes(item.kind)){
   const d=item.defense;assert(d&&finite(d.bonus)&&d.bonus>=0,'Invalid armor bonus');
   assert(nullable(d.maxDexBonus,n=>finite(n)&&n>=0)&&finite(d.armorCheckPenalty)&&d.armorCheckPenalty<=0,'Invalid armor limits');
   assert(finite(d.arcaneFailurePercent)&&d.arcaneFailurePercent>=0&&d.arcaneFailurePercent<=100,'Invalid spell failure');
  }
 }
 return catalogue;
}
export function deriveEquipment(base,{id,name,changes={}},traits){
 assert(id!==base.id&&name&&id,'A derived item needs a new ID and name');
 assert(!['id','name','source','sourceRow'].some(k=>Object.hasOwn(changes,k)),'Identity and provenance cannot be overridden in changes');
 const item={...structuredClone(base),...structuredClone(changes),id,name,derivedFrom:base.id,origin:'campaign',status:'draft'};
 // sourceRow describes the base item, not the custom version.
 item.baseSource={source:item.source,sourceRow:item.sourceRow};delete item.source;delete item.sourceRow;
 validateEquipment({schemaVersion:'1.0.0',items:[item]},traits);return item;
}
