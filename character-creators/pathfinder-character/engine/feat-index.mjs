import {FEAT_THEMES} from './feat-themes.mjs';
// Search metadata only: never used to grant feats or determine eligibility.
const normalize = value => String(value ?? '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const topics = ['sneak attack', 'feint', 'trip', 'disarm', 'grapple', 'bull rush', 'overrun', 'sunder'];
export function buildFeatIndex(records) {
 const nodes = new Map(), aliases = new Map();
 for (const record of records) {
  const key = normalize(record.name);
  if (!nodes.has(key)) nodes.set(key, {key, name:record.name.replace(/\s*\([^)]*\)/g,''), records:[], parents:new Set(), topics:new Set(), themes:new Set()});
  nodes.get(key).records.push(record); aliases.set(record.id,key);
 }
 for (const node of nodes.values()) for (const record of node.records) {
  for(const [theme,names] of Object.entries(FEAT_THEMES)) if([...names].some(name=>normalize(name)===node.key)) node.themes.add(theme);
  // Saved homebrew has no curated reference entry; derive themes from authored effects.
  if(record.id.startsWith('homebrew:')) for(const effect of record.effects??[]) {
   if((effect.target??'').startsWith('skill.')) node.themes.add('skills');
   if(effect.condition==='melee-only') node.themes.add('melee');
   if(effect.condition==='ranged-only') node.themes.add('ranged');
   if(/^(attack|damage)\./.test(effect.target??'')) node.themes.add('aggressive');
   if(/^(ac|save|saves)(\.|$)/.test(effect.target??'')) node.themes.add('defensive');
  }
  if (Array.isArray(record.prerequisites)) {
   for (const p of record.prerequisites) {if (p.kind === 'feat' && aliases.has(p.featId)) node.parents.add(aliases.get(p.featId));if(p.kind==='feat-count')for(const id of p.featIds)if(aliases.has(id))node.parents.add(aliases.get(id));}
  } else {
   let prerequisites = ` ${normalize(record.text?.match(/Prerequisites?:([^\n]*)/i)?.[1])} `;
   // Longest names first: Improved X is not a direct reference to X.
   for (const key of [...nodes.keys()].sort((a,b)=>b.length-a.length)) if (key !== node.key && prerequisites.includes(` ${key} `)) {
    node.parents.add(key); prerequisites=prerequisites.replaceAll(` ${key} `,' ');
   }
  }
  const text = normalize(`${record.name} ${record.text ?? record.description ?? ''}`);
  for (const topic of topics) if (new RegExp(`\\b${topic}(?:s|ing|ed)?\\b`).test(text)) node.topics.add(topic);
 }
 const result = new Map();
 for (const node of nodes.values()) {
  const ancestors = new Set(), visit = key => {
   if (key === node.key || ancestors.has(key)) return;
   ancestors.add(key); for (const parent of nodes.get(key)?.parents ?? []) visit(parent);
  };
  for (const parent of node.parents) visit(parent);
  const chains = [...ancestors].map(key=>nodes.get(key).name).sort();
  const tags = [...node.topics].sort();
  const themes=[...node.themes].sort();
  const entry = {name:node.name, chains, topics:tags, themes, search:normalize([node.name,...chains,...tags,...themes].join(' '))};
  for (const record of node.records) result.set(record.id,entry);
 }
 return result;
}
export function matchesFeat(entry, query) {
 const words = normalize(query).split(' ').filter(Boolean);
 return words.every(word => entry?.search.includes(word));
}

/** Materialize navigation metadata without modifying mechanical prerequisites. */
export function attachFeatIndexes(records) {
 const index=buildFeatIndex(records);
 for(const record of records){const entry=index.get(record.id);record.index={chains:[...entry.chains],topics:[...entry.topics],themes:[...entry.themes]};}
 return records;
}
