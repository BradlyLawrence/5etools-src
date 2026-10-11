import {ALTERNATES,replacedTrait,ANCESTRIES} from './engine/racial.mjs';
import {favoredClasses,favoredBonus,hitPoints} from './advancement.mjs';
import {SKILLS,skillName} from './skills.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(list,value)=>list.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
export function racialOptions(c){
 const b=c.builder;if(!b.raceId)return '';
 const list=ALTERNATES.filter(x=>x.race===b.raceId);
 let html='<h3>Racial choices</h3>';
 if(b.raceId==='dragonborn')html+=`<label>Draconic ancestry<select data-field="draconicAncestry">${options([['','Choose ancestry'],...Object.entries(ANCESTRIES).map(([id,x])=>[id,skillName(id)+' — '+x.energy+', '+(x.shape==='cone'?'15-foot cone':'30-foot line')])],b.draconicAncestry??'')}</select></label>`;
 if(['half-elves','gnomes'].includes(b.raceId)&&!replacedTrait(c,'adaptability')){
  const academic=b.racialAlternates?.includes('academician');
  const skills=[...new Set([...Object.keys(SKILLS),...Object.keys(b.skills??{})])].filter(id=>b.raceId==='half-elves'?'heal survival perception stealth acrobatics diplomacy fly climb swim bluff disguise disable-device sleight-of-hand handle-animal ride intimidate spellcraft use-magic-device escape-artist sense-motive'.split(' ').includes(id):academic?id.startsWith('knowledge-'):/^(craft|profession):/.test(id));
  html+=`<label>${b.raceId==='half-elves'?'Adaptability — Skill Focus':academic?'Academician — Knowledge skill':'Obsessive — Craft or Profession'}<select data-field="racialSkill">${options([['','Choose a skill'],...skills.map(id=>[id,skillName(id)])],b.racialSkill??'')}</select></label><p>Add Craft or Profession specialties in Background & Choices to select them here.</p>`;
 }
 html+='<h3>Alternate racial traits</h3>';
 if(!list.length)html+='<p>No alternate traits are available for this race yet.</p>';
 for(const trait of list){const checked=b.racialAlternates?.includes(trait.id);const conflict=!checked&&(trait.replaces.some(id=>replacedTrait(c,id))||(trait.requires??[]).some(id=>replacedTrait(c,id))||list.some(other=>b.racialAlternates?.includes(other.id)&&(other.requires??[]).some(id=>trait.replaces.includes(id))));html+=`<div class="racial-option${conflict?' is-unavailable':''}"><label class="racial-option-label"><input type="checkbox" data-field="racialAlternate.${trait.id}" ${checked?'checked':''} ${conflict?'disabled':''}> <span>${trait.name}</span></label><p>${esc(trait.text)} Replaces ${esc(trait.replaces.join(', ').replace(/-/g,' '))}.</p>${conflict?'<p class="racial-conflict">Unavailable with your selected alternate traits.</p>':''}</div>`;}
 if(list.length)html+='<p>Selected alternatives replace the named traits in the standard racial description above. Situational benefits remain listed for use at the table.</p>';
 return html;
}
export function advancementUI(c,r,classes){
 const b=c.builder,chosen=favoredClasses(c),hp=hitPoints(c,r.abilities);
 let html='<h3>Favoured class</h3><p>For each level in a favoured class, choose +1 HP or +1 normal skill rank.</p>';
 for(let i=0;i<(b.raceId==='half-elves'?2:1);i++)html+=`<label>Favoured class${i?' 2':''}<select data-field="favoredClass.${i}">${options([['','Choose a class'],...classes.map(x=>[x.id,x.name])],chosen[i]??'')}</select></label>`;
 html+='<h3>Hit points</h3><p>First level uses the maximum die. Later levels default to the rounded-up average. Constitution is applied at every level, with a minimum of 1 HP per level before favoured-class bonuses.</p>';
 for(const row of hp.rows){const i=row.level-1;html+=`<fieldset><legend>Level ${row.level} — ${esc(row.classId)} (d${row.die})</legend>`;
  if(i)html+=`<label>Hit Die result<select data-field="hpMode.${i}">${options([['average',`Average (${row.die/2+1})`],['max',`Maximum (${row.die})`],['roll','Enter rolled value']],row.mode)}</select></label>`;
  if(row.mode==='roll')html+=`<label>Rolled value<input type="number" min="1" max="${row.die}" data-field="hpRoll.${i}" value="${row.roll??''}"></label>`;
  if(chosen.includes(row.classId))html+=`<label>Favoured-class reward<select data-field="favoredReward.${i}">${options([['','Choose a reward'],['hp','+1 HP'],['skill','+1 skill rank']],favoredBonus(c,i))}</select></label>`;
  html+=`<p>Die ${row.roll??'not entered'} · Constitution ${row.con>=0?'+':''}${row.con} · Favoured class +${row.favored} HP = ${row.total??'incomplete'} HP</p></fieldset>`;
 }
 return html+`<p>HP before feat bonuses: ${hp.total??'incomplete'}.</p>`;
}
