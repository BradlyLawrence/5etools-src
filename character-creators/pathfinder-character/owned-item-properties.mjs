import {techEvent} from './equipment.mjs';
import {reservoirMaximum} from './engine/technology.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ownedItemName=(model,instance)=>[instance?.enhancement?'+'+instance.enhancement:null,instance?.keen?'Keen':null,model?.name??instance?.itemId].filter(Boolean).join(' ');
export function renderItemProperties(model,instance={},adding=false){
 if(!model?.tech)return '';
 const attr=field=>adding?`data-new-item-property="${field}"`:`data-owned-property="${field}" data-owned-instance="${esc(instance.instanceId)}"`;
 return `<details class="owned-item-properties"><summary>${adding?'Item properties (optional)':'Recorded item properties'}</summary><p>${adding?'An ordinary item has enhancement 0 and no Keen property.':'These belong to this owned copy. Change them only to record the item you actually own; this does not purchase or craft an upgrade.'}</p><label>Enhancement<input type="number" min="0" max="5" value="${instance.enhancement??0}" ${attr('enhancement')}></label>${model.damage?.types?.some(x=>['piercing','slashing'].includes(x))?`<label class="combat-toggle"><input type="checkbox" ${instance.keen?'checked':''} ${attr('keen')}> Keen</label>`:''}${['armor','shield'].includes(model.kind)?`<label>Material hardness<select ${attr('material')}>${['steel','mithral','adamantine'].map(m=>`<option ${m===(instance.material??'steel')?'selected':''}>${m}</option>`).join('')}</select></label><p>Material changes hardness only; other material effects and prices remain table-side.</p>`:''}</details>`;
}
export function updateOwnedProperty(c,rules,instanceId,field,value){
 if(!['enhancement','keen','material'].includes(field))throw Error('Not an item property.');
 const next=structuredClone(c);techEvent(next,rules,{type:'update',instanceId,field,value});return next;
}
export function addOwnedTechnology(c,rules,itemId,properties={}){
 const model=rules.equipment.items.find(x=>x.id===itemId);if(!model?.tech)throw Error('Choose technological equipment.');
 const next=structuredClone(c),instanceId=crypto.randomUUID();techEvent(next,rules,{type:'add',itemId,instanceId});
 for(const [field,value] of Object.entries(properties)){if(!['enhancement','keen','material'].includes(field))throw Error('Not an item property.');techEvent(next,rules,{type:'update',instanceId,field,value});}
 const instance=next.techEquipment.items.find(x=>x.instanceId===instanceId);
 techEvent(next,rules,{type:'update',instanceId,field:'reservoir',value:reservoirMaximum(model,instance)});
 return next;
}
