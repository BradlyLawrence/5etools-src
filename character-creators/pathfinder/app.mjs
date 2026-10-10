import {filterEntries,branches,bareName} from './model.mjs';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags=values=>values.map(v=>`<span class="tag">${esc(v)}</span>`).join('');
const json=(title,value)=>`<details><summary>${esc(title)}</summary><pre>${esc(JSON.stringify(value,null,2))}</pre></details>`;
const label=v=>v.charAt(0).toUpperCase()+v.slice(1).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/-/g,' ');
const facts=value=>'<dl>'+Object.entries(value).map(([k,v])=>`<dt>${esc(label(k))}</dt><dd>${esc(typeof v==='string'?label(v):v)}</dd>`).join('')+'</dl>';
const link=(e,kind='feats')=>`<a href="#${kind}/${encodeURIComponent(e.id)}">${esc(e.name)}</a>`;
function specialistText(b){
 const phrases=[];
 if(b.extraDice)phrases.push('Deal an additional '+esc(b.extraDice)+' damage');
 if(b.brutal)phrases.push('the attack gains Brutal '+b.brutal);
 if(b.ignoreHardness)phrases.push('ignore '+b.ignoreHardness+' points of hardness');
 if(b.attackReachBonus)phrases.push('increase reach by '+b.attackReachBonus+' feet for the attack');
 if(b.targets)phrases.push('attack up to '+b.targets+' targets in line');
 if(b.secondaryTargetDamageMultiplier)phrases.push('the second target takes '+(b.secondaryTargetDamageMultiplier===1?'full':'half')+' damage');
 if(b.knockbackFt)phrases.push('push the target up to '+b.knockbackFt+' feet');
 if(b.tripBonus)phrases.push('gain a +'+b.tripBonus+' bonus on the triggered trip attempt');
 if(b.attackBonus)phrases.push('gain a +'+b.attackBonus+' bonus on the attack and its critical confirmation');
 if(b.threatRangeBonus)phrases.push('increase the critical threat range by '+b.threatRangeBonus);
 if(b.criticalMultiplierBonus)phrases.push('increase the critical multiplier by '+b.criticalMultiplierBonus);
 if(b.targetCondition)phrases.push('on a damaging hit, the target is flat-footed until the end of your next turn');
 const text=phrases.join('; ')+'.';return text.charAt(0).toUpperCase()+text.slice(1);
}
let data,names;
function categories(){const entries=$('kind').value==='feats'?data.feats:$('kind').value==='services'?data.services.items:$('kind').value==='classes'?data.classes.items:$('kind').value==='races'?data.races.items:data.equipment.items;const values=[...new Set(entries.flatMap(e=>$('kind').value==='feats'?e.index?.themes??[]:[e.kind,e.proficiency,e.category].filter(Boolean)))].sort();$('category').innerHTML='<option value="">All</option>'+values.map(v=>`<option>${esc(v)}</option>`).join('');}
function list(){const kind=$('kind').value;const entries=filterEntries(data,kind,$('query').value,$('category').value);$('count').textContent=`${entries.length} matching ${kind==='feats'?'feats':kind==='classes'?'classes':kind==='races'?'races':'items'}`;$('results').innerHTML=entries.length?entries.map(e=>`<a href="#${kind}/${encodeURIComponent(e.id)}" aria-current="${location.hash===`#${kind}/${encodeURIComponent(e.id)}`}">${esc(e.name)}<small>${esc(kind==='feats'?(e.index?.themes??[]).join(' · '):[e.proficiency??e.category,e.handling??e.kind].filter(Boolean).join(' · '))}</small></a>`).join(''):'<p>No matches. Try another search or reset the filters.</p>';}
function detail(){let kind,id;try{[kind,id]=location.hash.slice(1).split('/');id=decodeURIComponent(id??'');}catch{return;}if(!id)return;const entries=kind==='feats'?data.feats:kind==='equipment'?data.equipment.items:kind==='services'?data.services.items:kind==='classes'?data.classes.items:kind==='races'?data.races.items:[];const e=entries.find(e=>e.id===id);if(!e){$('detail').innerHTML='<h2>Entry not found</h2><p>This link does not match the published catalogue.</p>';return;}if($('kind').value!==kind){$('kind').value=kind;categories();$('query').value='';}list();let body='';
 if(kind==='feats'){
  const prereqs=e.prerequisites??[];const descendants=branches(data,e);
  body=tags([...(e.index?.themes??[]),...(e.index?.topics??[])]);
  body+=`<p><strong>Repeatable:</strong> ${e.repeatable?esc(e.repeatability?.mode??'Yes'):'No'}${e.parameter?` · Choice: ${esc(e.parameter)}`:''}</p>`;
  body+='<h3>Rules</h3><p class="prose">'+esc(e.description)+'</p>';
  const ancestors=(e.index?.chains??[]).map(n=>data.feats.find(f=>bareName(f.name).toLowerCase()===n.toLowerCase())).filter(Boolean);
  if(ancestors.length)body+='<h3>Feats required along the way</h3><div class="links">'+ancestors.map(e=>link(e)).join('')+'</div>';
  body+='<h3>Other feats that require this feat</h3><div class="links">'+(descendants.length?descendants.map(e=>link(e)).join(''):'No other feats currently require this feat.')+'</div>';
  const grants=data.grants.filter(g=>g.featId===e.id);
  const exceptions=data.prerequisiteExceptions.filter(p=>p.requiresFeatInPrerequisites===e.id||prereqs.some(q=>q.featId===p.requiresFeatInPrerequisites));
  if(grants.length||exceptions.length)body+='<h3>Campaign rules</h3>'+grants.map(g=>`<p>${esc(g.classId.charAt(0).toUpperCase()+g.classId.slice(1))} gains this feat at class level ${g.classLevel}${g.waivePrerequisites?`; waived requirement: ${esc(g.waivePrerequisites.join(', '))}`:''}${g.selectionFrom?`; choice comes from ${esc(label(g.selectionFrom))}`:''}.</p>`).join('')+exceptions.map(p=>`<p>${esc(p.classId.charAt(0).toUpperCase()+p.classId.slice(1))} level ${p.classLevel}+: effective ${esc(p.ability.toUpperCase())} ${p.minimumEffectiveScore} for qualifying combat-feat prerequisites involving Combat Expertise.</p>`).join('');
 }else if(kind==='races'){
  body='<p>'+esc(e.description)+'</p><h3>Racial traits</h3><div class="class-rules">'+e.traitsHtml+'</div>'+(e.backgroundHtml?'<details><summary>Background</summary><p>These descriptions come from the original rulebook. Cultures in our campaign may differ.</p>'+e.backgroundHtml+'</details>':'')+'<h3>Favoured class bonuses</h3><p>When you gain a level in a favoured class, choose +1 hit point or +1 skill rank. Race-specific alternatives have not been added yet.</p><h3>Alternate racial traits</h3><p>'+'No alternate racial traits are currently available.'+'</p>';
  if(e.ancestry?.status==='details-pending')body+='<details><summary>Ancestry options</summary><p>The ancestry choices are not yet available.</p></details>';
 }else if(kind==='classes'){
  if(e.status==='draft'||e.status==='playtest')body+='<p class="tag">'+esc(e.status==='draft'?'Draft — incomplete class':'Campaign playtest')+'</p>';
  const grants=data.grants.filter(g=>g.classId===e.id);
  if(grants.length){body+='<h3>Additional Class Features</h3><ul>'+grants.map(g=>'<li>Level '+g.classLevel+': '+(names.has(g.featId)?link(names.get(g.featId)):esc(g.featId))+(g.waivePrerequisites?' (Intelligence requirement waived)':'')+(g.selectionFrom?' — choose your deity’s favoured weapon':'')+'</li>').join('')+'</ul>';}
  if(e.id==='fighter')body+='<p>For combat feats requiring Combat Expertise, treat Intelligence as at least 13 when checking prerequisites.</p>';
  if(e.campaignHtml)body+='<details open><summary>Alchemy</summary>'+e.campaignHtml+'</details>';
  body+='<div class="class-rules">'+e.rulesHtml+'</div>';
  if(e.id==='ironwright')for(const family of data.technology.families){body+='<h3>'+esc(family.name)+' Specialisation</h3>';for(const action of family.actions)body+='<p><b>'+esc(action.name)+'</b>: '+specialistText(action.specialistBenefits)+'</p>';}
  const related=data.feats.filter(f=>(f.index?.themes??[]).includes(e.id));
  if(related.length)body+='<h3>Related feats</h3><div class="links">'+related.map(f=>link(f)).join('')+'</div>';
 }else if(kind==='services'){
  body='<p class="prose">'+esc(e.description)+'</p>'+facts({Category:e.category,Price:e.cost.text,...(e.weightLb==null?{}:{Weight:e.weightLb+' lb'})});
  if(e.status==='draft')body+='<p>Campaign service — details still to be agreed.</p>';
 }else{
  const family=data.technology?.families.find(f=>f.id===e.tech?.family);
  const stats={Kind:e.kind,Proficiency:e.proficiency==='tech-melee'?'Technological melee weapons':e.proficiency??e.category,Handling:e.handling,'Weapon family':family?.name,Price:e.cost?.text,Weight:e.weightLb==null?'Not set':e.weightLb+' lb','Damage (Small)':e.sourceRow?.damageSmall,'Damage (Medium)':e.sourceRow?.damageMedium,Critical:e.sourceRow?.critical,Range:e.sourceRow?.range,'Damage type':e.sourceRow?.damageType,...(e.defense??{})};
  body='<p class="prose">'+esc(e.description)+'</p><dl>'+Object.entries(stats).filter(([,v])=>v!==undefined).map(([k,v])=>`<dt>${esc(label(k))}</dt><dd>${esc(typeof v==='string'?label(v):v)}</dd>`).join('')+'</dl>';
  for(const id of e.traits??[]){if(id==='reservoir'&&e.tech)continue;const t=data.traits.find(t=>t.id===id);body+=`<h3>${esc(t?.name??id)}</h3><p>${esc(t?.description??'No definition available.')}</p>`;}
  if(e.tech){
   body+=`<h3>Reservoir ${e.tech.reservoirBase}</h3><p>Reservoir represents the amount of fuel an item can hold, whether that's steam, black powder, liquid fuel, or some other magical substance.</p><p>This item has a maximum of ${e.tech.reservoirBase} points +${e.tech.reservoirPerEnhancement} per permanent enhancement bonus.</p><p>Reservoirs can only be refilled through supplies, workshops, or character special abilities.</p><p>Ordinary attacks cost no reservoir. Declare powered actions and spend their points before rolling, including on a miss.</p>`;
   for(const a of family?.actions??[]){
    const description=a.description.replace(' (specialist: full)','');
    body+=`<h3>${esc(a.name)}</h3><p><b>Reservoir Cost</b>: ${a.cost} ${a.cost===1?'point':'points'}.</p><p>${esc(description)}</p>`;
   }
  }
 }
 const source=e.sourceUrl??e.source?.url;
 $('detail').innerHTML=tags([kind==='classes'||kind==='races'?e.category:e.tech?'Campaign technology · playtest':e.referenceId?.startsWith('core:')||e.source?.book==='Core Rulebook'?'Core source · campaign rules apply':'Supplement / campaign entry'])+`<h2>${esc(e.name)}</h2>`+body+(source&&/^https?:\/\//.test(source)?`<p><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Original rules source</a></p>`:'')+json('View entry JSON',e);
}
try{const response=await fetch(new URL('./data/catalogue.json',import.meta.url));if(!response.ok)throw Error(`HTTP ${response.status}`);data=await response.json();names=new Map(data.feats.map(e=>[e.id,e]));categories();list();detail();$('query').addEventListener('input',list);$('category').addEventListener('change',list);$('kind').addEventListener('change',()=>{categories();list();});$('reset').addEventListener('click',()=>{$('query').value='';$('category').value='';list();});window.addEventListener('hashchange',detail);}catch(error){$('count').textContent=`Unable to load the rules: ${error.message}. Open this page through a web server, not as a file.`;}
