import data from './engine/core-options-data.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids=new Set(data.domains.map(d=>d.id));
const domainName=id=>data.domains.find(d=>d.id===id)?.name??id;
export const activeDomainKeys=['cleric-domain-1','cleric-domain-2','inquisitor-domain'];
export const divineClasses=c=>['cleric','inquisitor','paladin'].filter(id=>c.builder?.classOrder?.includes(id));

// Older characters retain their active domains and favoured weapon. No new domain is chosen for them.
export function deityState(c){
 const b=c.builder??{},d=c.deity??{};
 const domains=d.domains??[...new Set(activeDomainKeys.map(k=>b.classOptions?.[k]).filter(Boolean))];
 return {...d,domains:[...domains],sacredConcerns:[...(d.sacredConcerns??[])],oaths:{...(d.oaths??{})},missions:{...(d.missions??{})}};
}
export function validateDeity(c){
 const d=c.deity;if(d===undefined)return;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(d))throw Error('Invalid deity setup.');
 if(d.favoredWeaponId!==undefined&&typeof d.favoredWeaponId!=='string')throw Error('Invalid deity weapon.');
 if(d.domains!==undefined&&(!Array.isArray(d.domains)||d.domains.length>3||d.domains.some(v=>v!==''&&!ids.has(v))||new Set(d.domains.filter(Boolean)).size!==d.domains.filter(Boolean).length))throw Error('Choose three different deity domains.');
 if(d.sacredConcerns!==undefined&&(!Array.isArray(d.sacredConcerns)||d.sacredConcerns.some(v=>typeof v!=='string')))throw Error('Sacred concerns must be text lines.');
 for(const key of ['oaths','missions'])if(d[key]!==undefined&&(!object(d[key])||Object.entries(d[key]).some(([id,v])=>!ids.has(id)||typeof v!=='string')))throw Error('Invalid deity '+key+'.');
 if(d.domains)for(const key of activeDomainKeys){const value=c.builder?.classOptions?.[key];if(value&&!d.domains.includes(value))throw Error('Active domains must belong to the deity.');}
 const b=c.builder?.classOptions;
 if(b?.['cleric-domain-1']&&b['cleric-domain-1']===b['cleric-domain-2'])throw Error('Choose two different cleric domains.');
}
export function setDeityField(c,rules,key,value){
 if(!divineClasses(c).length)throw Error('Choose a cleric, inquisitor or paladin level first.');
 const d=deityState(c),b={...c.builder.classOptions};
 if(typeof value!=='string')throw Error('Enter text for this deity choice.');
 if(key==='name'){c.builder.identity??={};c.builder.identity.deity=value;return;}
 if(key==='weapon'){
  if(value&&!rules.equipment.items.some(i=>i.kind==='weapon'&&i.id===value))throw Error('Choose an available favoured weapon.');
  d.favoredWeaponId=value;
 }else if(/^domain\.[0-2]$/.test(key)){
  const index=Number(key.split('.')[1]);
  if(value&&(!ids.has(value)||d.domains.some((v,i)=>i!==index&&v===value)))throw Error('Choose a different deity domain.');
  while(d.domains.length<3)d.domains.push('');
  d.domains[index]=value;
  for(const k of activeDomainKeys)if(b[k]&&!d.domains.includes(b[k]))delete b[k];
 }else if(key.startsWith('active.')){
  const k=key.slice(7),cls=k.startsWith('cleric-')?'cleric':'inquisitor';
  if(!activeDomainKeys.includes(k)||!divineClasses(c).includes(cls)||value&&!d.domains.includes(value))throw Error('Choose one of your deity domains.');
  b[k]=value;
  if(b['cleric-domain-1']&&b['cleric-domain-1']===b['cleric-domain-2'])throw Error('Choose two different cleric domains.');
 }else if(key.startsWith('oath.')||key.startsWith('mission.')){
  const [kind,id]=key.split('.'),cls=kind==='oath'?'paladin':'inquisitor';
  if(!divineClasses(c).includes(cls)||!d.domains.includes(id)||!ids.has(id)||kind==='mission'&&b['inquisitor-domain']!==id)throw Error('Choose the relevant domain first.');
  d[kind==='oath'?'oaths':'missions'][id]=value;
 }else if(/^concern\.\d+$/.test(key)){
  const index=Number(key.split('.')[1]);if(index>=d.sacredConcerns.length)throw Error('Unknown sacred concern.');d.sacredConcerns[index]=value;
 }else throw Error('Unknown deity choice.');
 validateDeity({...c,deity:d,builder:{...c.builder,classOptions:b}});
 c.deity=d;c.builder.classOptions=b;
}
export function changeSacredConcern(c,action,index){
 if(!divineClasses(c).length)throw Error('Choose a divine class first.');
 const d=deityState(c);
 if(action==='add')d.sacredConcerns.push('');
 else if(action==='remove'&&Number.isInteger(index)&&index>=0&&index<d.sacredConcerns.length)d.sacredConcerns.splice(index,1);
 else throw Error('Unknown sacred concern action.');
 c.deity=d;
}
export function deityIssues(c){
 const classes=divineClasses(c);if(!classes.length)return [];
 const d=deityState(c),b=c.builder.classOptions??{},issues=[];
 if(!c.builder.identity?.deity?.trim())issues.push('Name your deity.');
 if(d.domains.filter(Boolean).length!==3)issues.push('Choose three deity domains.');
 if(!d.favoredWeaponId)issues.push('Choose your deity’s favoured weapon.');
 if(classes.includes('cleric')&&['cleric-domain-1','cleric-domain-2'].some(k=>!b[k]||!d.domains.includes(b[k])))issues.push('Choose two deity domains for cleric benefits.');
 if(classes.includes('inquisitor')&&(!b['inquisitor-domain']||!d.domains.includes(b['inquisitor-domain'])||!d.missions[b['inquisitor-domain']]?.trim()))issues.push('Choose your inquisitor domain and write its mission statement.');
 if(classes.includes('paladin')&&(d.domains.filter(Boolean).length!==3||d.domains.filter(Boolean).some(id=>!d.oaths[id]?.trim())))issues.push('Write a paladin oath for each of your three domains.');
 return issues;
}
const select=(label,key,value,items)=>`<label>${esc(label)}<select data-field="deity.${esc(key)}"><option value="">Choose…</option>${items.map(([id,name])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
const text=(label,key,value)=>`<label>${esc(label)}<textarea data-field="deity.${esc(key)}">${esc(value)}</textarea></label>`;
export function renderDeitySetup(c,rules){
 const classes=divineClasses(c);if(!classes.length)return '';
 const d=deityState(c),b=c.builder.classOptions??{},chosen=d.domains.filter(Boolean).map(id=>[id,domainName(id)]);
 let html=`<section class="deity-setup"><h3>Deity & faith</h3><label>Deity name<input data-field="deity.name" value="${esc(c.builder.identity?.deity)}"></label><p>Choose three domains for your deity. Your class determines which grant benefits.</p>`;
 for(let i=0;i<3;i++)html+=select('Deity domain '+(i+1),'domain.'+i,d.domains[i],data.domains.filter(x=>x.id===d.domains[i]||!d.domains.includes(x.id)).map(x=>[x.id,x.name]));
 html+=select('Deity’s favoured weapon','weapon',d.favoredWeaponId,rules.equipment.items.filter(i=>i.kind==='weapon').map(i=>[i.id,i.name]));
 html+='<h4>Other sacred concerns</h4><p>Optional beliefs and practices, with no mechanical benefit. Add as many or as few as you wish.</p>';
 d.sacredConcerns.forEach((v,i)=>{html+=`<div>${text('Sacred concern '+(i+1),'concern.'+i,v)}<button type="button" data-sacred-remove="${i}" aria-label="Remove sacred concern ${i+1}">Remove</button></div>`;});
 html+='<button type="button" data-sacred-add>Add sacred concern</button>';
 if(classes.includes('cleric')){html+='<h4>Cleric domains</h4><p>Two domains grant powers and domain spell choices. The third is flavour only.</p>';for(const [i,k]of ['cleric-domain-1','cleric-domain-2'].entries())html+=select('Cleric benefit domain '+(i+1),'active.'+k,b[k],chosen.filter(([id])=>id!==b['cleric-domain-'+(i===0?2:1)]));}
 if(classes.includes('inquisitor')){html+='<h4>Inquisitor calling</h4><p>One domain grants powers, but no domain spells or slots.</p>'+select('Inquisitor benefit domain','active.inquisitor-domain',b['inquisitor-domain'],chosen);if(chosen.some(([id])=>id===b['inquisitor-domain']))html+=text(domainName(b['inquisitor-domain'])+' mission statement','mission.'+b['inquisitor-domain'],d.missions[b['inquisitor-domain']]);}
 if(classes.includes('paladin')){html+='<h4>Paladin oaths</h4><p>Swear one oath for each domain. Oaths form your code; non-lawful deities are permitted. Your DM adjudicates conflicts, breaches and falling. These domains grant no domain powers or spells.</p>';for(const [id,name]of chosen)html+=text(name+' oath','oath.'+id,d.oaths[id]);}
 return html+'</section>';
}
export function renderDeitySummary(c){
 const classes=divineClasses(c);if(!classes.length)return '';
 const d=deityState(c),b=c.builder.classOptions??{};
 let html=`<h3>Deity & faith</h3><p><strong>${esc(c.builder.identity?.deity||'Deity not named')}</strong></p><p>Domains: ${esc(d.domains.filter(Boolean).map(domainName).join(', '))}</p><p>Favoured weapon: ${esc(d.favoredWeaponId?.replaceAll('-',' ')||'Not selected')}</p>`;
 if(d.sacredConcerns.some(x=>x.trim()))html+='<p>Other sacred concerns (no mechanical benefit):</p><ul>'+d.sacredConcerns.filter(x=>x.trim()).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
 if(classes.includes('inquisitor')&&b['inquisitor-domain'])html+=`<p><strong>${esc(domainName(b['inquisitor-domain']))} mission:</strong> ${esc(d.missions[b['inquisitor-domain']]??'')}</p>`;
 if(classes.includes('paladin'))html+='<p>Oath conflicts and falling are adjudicated by the DM.</p>'+d.domains.filter(Boolean).map(id=>`<p><strong>${esc(domainName(id))} oath:</strong> ${esc(d.oaths[id]??'')}</p>`).join('');
 return html;
}
