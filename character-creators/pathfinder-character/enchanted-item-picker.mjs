import {addCraftedItem} from './crafted-items.mjs';
import {addOwnedTechnology} from './owned-item-properties.mjs';
import {choicePicker} from './choice-picker.mjs';
import {PURCHASED_MAGIC_EFFECTS,purchasedEffectFits,purchasedEffectSelectable} from './engine/purchased-effects.mjs';
import {MINOR_ADAPTATIONS,validateAdaptationBase} from './engine/minor-adaptations.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const canEnhanceItem=item=>!!item&&['weapon','armor','shield'].includes(item.kind)&&!item.traits?.includes('double')&&item.id!=='unarmed-strike';
export function purchasedEffects(item,bonus){
 if(!canEnhanceItem(item))return [];
 const magic=Object.entries(PURCHASED_MAGIC_EFFECTS).filter(([id,e])=>purchasedEffectSelectable(id)&&(!item.tech||id==='keen')&&e.cost<=bonus&&purchasedEffectFits(id,item)).map(([id,e])=>({id,...e}));
 if(!item.tech)return magic;
 return [...magic,...Object.entries(MINOR_ADAPTATIONS).filter(([id,e])=>{try{validateAdaptationBase({slot:item.kind,adaptations:[id]},item);return e.enhancementCost<=bonus;}catch{return false;}}).map(([id,e])=>({id,...e,cost:e.enhancementCost}))];
}
export function renderEnchantedChoice(item,view){
 if(!canEnhanceItem(item))return '';
 const effects=purchasedEffects(item,view.enhancement??1),selected=effects.find(e=>e.id===view.effect);
 return `<div class="enchanted-item-choice"><label class="combat-toggle"><input type="checkbox" data-enchanted-version ${view.enchanted?'checked':''}> ${item.tech?'Enhanced':'Enchanted'} version</label>${view.enchanted?`<label>Enhancement bonus<select data-enchanted-bonus>${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===(view.enhancement??1)?'selected':''}>+${n}</option>`).join('')}</select></label>${choicePicker({label:'Special effect (optional)',value:view.effect||'none',name:selected?selected.name+' (+'+selected.cost+' effect)':'None',field:'equipmentEffect',placeholder:'Find an effect',groups:[{label:'No special effect',items:[{id:'none',name:'None',description:'Keep only the enhancement bonus.'}]},...[...new Set(effects.map(e=>e.cost))].sort((a,b)=>a-b).map(cost=>({label:'+'+cost+' effect — requires +'+cost+' or higher',items:effects.filter(e=>e.cost===cost).map(e=>({id:e.id,name:e.name+' (+'+e.cost+' effect)',description:e.text+(e.manual?' Resolve this effect at the table.':'')}))}))]})}${view.effect==='bane'?`<label>Bane target (creature type; include humanoid/outsider subtype)<input data-bane-target maxlength="100" value="${esc(view.effectTarget??'')}" placeholder="e.g. undead, humanoid (orc)"></label>`:''}<p>One special effect at most. Its cost must be equal to or less than +${view.enhancement??1}.${selected?' '+esc(selected.text):''}</p>${selected?.source?`<p><a href="${esc(selected.source)}" target="_blank" rel="noopener">Full effect rules</a>${selected.manual?' · Resolve this effect at the table.':''}</p>`:''}`:''}</div>`;
}
export function addEnhancedBase(c,rules,itemId,enhancement,effect='',effectTarget=''){
 const item=rules.equipment.items.find(x=>x.id===itemId);
 if(!canEnhanceItem(item))throw Error('Choose a single weapon, armour or shield.');
 if(!Number.isInteger(enhancement)||enhancement<1||enhancement>5)throw Error('Choose an enhancement bonus from +1 to +5.');
 const selected=purchasedEffects(item,enhancement).find(e=>e.id===effect);
 if(typeof effect!=='string'||effect&&!selected)throw Error('Choose one compatible special effect costing no more than the enhancement bonus.');
 if(item.tech&&(!effect||effect==='keen'))return addOwnedTechnology(c,rules,itemId,{enhancement,keen:effect==='keen'});
 const next=structuredClone(c),design={id:crypto.randomUUID(),name:`+${enhancement} ${selected?selected.name+' ':''}${item.name}`,description:`${item.tech?'Enhanced':'Enchanted'} ${item.name.toLowerCase()}.${selected?' '+selected.text:''}`,purchased:true,technology:!!item.tech,slot:item.kind,baseId:item.id,basePrice:item.cost?.gp??0,weight:item.weightLb??item.weight?.lb??0,casterLevel:Math.max(3,enhancement*3,selected?.casterLevel??0),missing:0,accelerated:false,requirements:'Already owned equipment',priceOverride:null,effects:[{kind:item.kind==='weapon'?'weapon':'armor',target:'',value:enhancement,detail:''}]};
 if(effect==='bane'){design.magicEffectTarget=effectTarget.trim();design.name+=' ('+design.magicEffectTarget+')';design.description+=' Chosen foe: '+design.magicEffectTarget+'.';}if(selected?.manual)design.description+=' Resolve this effect at the table; see full effect rules.';
 if(effect){if(item.tech)design.adaptations=[effect];else design.magicEffect=effect;}
 addCraftedItem(next,design);return next;
}
