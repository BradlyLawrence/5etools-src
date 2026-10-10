export const normalize = value => String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const bareName = value => value.replace(/\s*\([^)]*\)/g,'').trim();
export function filterEntries(data,kind,query='',category='') {
 const entries=kind==='feats'?data.feats:kind==='services'?data.services.items:kind==='classes'?data.classes.items:kind==='races'?data.races.items:data.equipment.items;
 return entries.filter(e=>{
  const tags=kind==='feats'?(e.index?.themes??[]):[e.kind,e.proficiency,e.category].filter(Boolean);
  const searchable=normalize([e.name,e.id,e.description,e.searchText??'',...tags,...(e.index?.chains??[]),...(e.index?.topics??[]),...(e.traits??[])].join(' '));
  return (!category||tags.includes(category))&&normalize(query).split(' ').every(w=>searchable.includes(w));
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export function branches(data,feat){return data.feats.filter(e=>(e.index?.chains??[]).some(c=>normalize(c)===normalize(bareName(feat.name))));}
export function prerequisiteText(p,names){
 if(p.kind==='feat')return names.get(p.featId)?.name??p.featId;
 if(p.kind==='bab')return `Base attack bonus +${p.minimum}`;
 if(p.kind==='ability')return `${p.ability.toUpperCase()} ${p.minimum}`;
 return Object.entries(p).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' · ');
}
