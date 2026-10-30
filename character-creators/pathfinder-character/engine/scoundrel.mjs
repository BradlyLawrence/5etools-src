import data from './scoundrel-data.mjs';
import {SKILLS} from './skills.mjs';
export const SCOUNDREL_CLASS={id:'scoundrel',name:'Scoundrel (playtest)',status:'playtest',attunement:{base:3,ability:'int',multiclassRule:'highest-class-base',status:'approved'},text:'Campaign class: d8; three-quarter BAB; good Reflex and Will; 8 + Intelligence skill ranks; light armour, no shields. Social check opposition and interrupted preparation/volley resolution require GM adjudication.'};
const opts=c=>c.builder?.classOptions??{};
export const scoundrelLevel=c=>c.classes?.scoundrel??c.builder?.classOrder?.filter(x=>x==='scoundrel').length??0;
export const scoundrelArchetype=c=>data.archetypeDirections.find(x=>x.id===opts(c)['scoundrel-archetype']);
export function scoundrelFeatures(c){
 const n=scoundrelLevel(c);if(!n)return [];
 const a=scoundrelArchetype(c),removed=new Set((a?.features??[]).map(f=>f.parameters.replaces));
 return [...data.features.filter(f=>!removed.has(f.id)),...(a?.features??[])].filter(f=>f.level!=null&&f.level<=n);
}
export const retainsScoundrel=(c,id)=>scoundrelFeatures(c).some(f=>f.id===id);
export const scoundrelTalents=[...data.talents,...data.knacks.map(t=>({...t,minimumClassLevel:2,category:'Technical knack',rulesText:t.description,summary:t.description}))];
export function selectedScoundrelTalents(c){
 const out=[],seen=new Set();for(let n=2;n<=scoundrelLevel(c);n+=2){const t=scoundrelTalents.find(t=>t.id===opts(c)['scoundrel-talent-'+n]);if(!t||t.minimumClassLevel>n||seen.has(t.id)||t.id==='improved-evasion'&&!retainsScoundrel(c,'evasion'))continue;seen.add(t.id);out.push({...t,level:n});}return out;
}
function skillOptions(c){return [...Object.keys(SKILLS).filter(x=>!['craft','perform','profession','artistry','lore'].includes(x)),...Object.keys(c.builder?.skills??{}).filter(x=>x.includes(':')&&SKILLS[x.split(':')[0]])].map(id=>({id,name:id.replaceAll('-', ' '),description:'Expertise does not grant ranks or waive trained-only restrictions. Add a specialty in Skills before choosing it here.'}));}
export function scoundrelSpecs(c){
 const n=scoundrelLevel(c);if(!n)return [];const b=opts(c),out=[{id:'scoundrel-archetype',label:'Scoundrel archetype',options:[{id:'base',name:'Scoundrel',description:data.description},...data.archetypeDirections.map(a=>({id:a.id,name:a.name,description:a.focus}))]}];
 const distinct=(id,label,choices,keys)=>out.push({id,label,options:choices.filter(x=>!keys.some(k=>k!==id&&b[k]===x.id))});
 const talentKeys=Array.from({length:Math.floor(n/2)},(_,i)=>'scoundrel-talent-'+(2+i*2));
 for(let l=2;l<=n;l+=2)distinct('scoundrel-talent-'+l,'Scoundrel talent (level '+l+')',scoundrelTalents.filter(t=>t.minimumClassLevel<=l&&(t.id!=='improved-evasion'||retainsScoundrel(c,'evasion'))).map(t=>({...t,description:t.rulesText})),talentKeys);
 const count=2+Math.floor((n-1)/4),expertKeys=Array.from({length:count},(_,i)=>'scoundrel-expertise-'+(i+1));
 for(const [i,key]of expertKeys.entries())distinct(key,'Expertise skill '+(i+1),skillOptions(c),expertKeys);
 const masteryKeys=Array.from({length:Math.max(0,Math.floor((n-5)/4))},(_,i)=>'scoundrel-mastery-'+(i+1));
 for(const [i,key]of masteryKeys.entries())distinct(key,'Skill mastery '+(i+1),skillOptions(c).filter(x=>expertKeys.some(k=>b[k]===x.id)&&x.id!=='use-magic-device'),masteryKeys);
 if(retainsScoundrel(c,'debilitating-critical')){
  const extra=Math.min(20,(c.feats??[]).filter(f=>f.featId==='extra-debilitating-strike').reduce((sum,f)=>sum+(f.count??1),0));
  const keys=[...[4,10,16].filter(l=>l<=n).map(l=>'scoundrel-strike-'+l),...Array.from({length:extra},(_,i)=>'scoundrel-strike-extra-'+(i+1))],choices=data.features.find(f=>f.id==='debilitating-critical').parameters.options;
  for(const key of keys)distinct(key,'Debilitating strike (level '+key.split('-').at(-1)+')',choices.filter(x=>x.minimumClassLevel<=n).map(x=>({...x,description:x.rulesText})),keys);
 }return out;
}
export function scoundrelSelections(c,prefix){return scoundrelSpecs(c).filter(s=>s.id.startsWith(prefix)).flatMap(s=>s.options.filter(o=>o.id===opts(c)[s.id]));}
export function scoundrelGrants(c){
 const out=[];if(!scoundrelLevel(c))return out;
 out.push({featId:'armor-proficiency-light',level:1,waive:false});
 for(const f of scoundrelFeatures(c))for(const id of [...(f.parameters.bonusFeat?[f.parameters.bonusFeat]:[]),...(f.parameters.bonusFeats??[]),...(f.scaling??[]).filter(s=>s.level<=scoundrelLevel(c)&&s.bonusFeat).map(s=>s.bonusFeat)])out.push({featId:id,level:f.level,waive:!!f.parameters.ignoresGrantPrerequisites||f.id==='called-shots'});
 if(selectedScoundrelTalents(c).some(t=>t.id==='finesse-rogue'))out.push({featId:'weapon-finesse',level:2,waive:true});return out;
}
export function scoundrelFencing(c,e){return retainsScoundrel(c,'fencing-training')&&scoundrelLevel(c)>=3&&e?.weapon?.finesseEligible&&e.weapon.handling!=='ranged'&&e.weapon.handling!=='two-handed'&&!c.equipment?.thrown&&!e.shield&&!c.equipment?.offHand&&c.context?.weapon?.damageMode!=='two-handed'&&c.context?.weapon?.damageMode!=='off-hand';}
export function scoundrelEffects(c,e={},conditions={}){
 const n=scoundrelLevel(c);if(!n)return [];const out=[],add=(target,value,name,bonusType='untyped')=>out.push({kind:'modifier',target,value,name,bonusType,featId:'scoundrel.'+name});
 for(const skill of scoundrelSelections(c,'scoundrel-expertise-'))add('skill.'+skill.id,2+Math.floor((n-1)/4),'Expertise','competence');
 const cha=Math.max(0,Math.floor(((c.abilities?.cha??10)-10)/2));if(retainsScoundrel(c,'read-the-room'))add('initiative',cha,'Read the Room');
 if(retainsScoundrel(c,'confident-defence')&&(!e?.armor||e.armor.category==='light')&&!e?.shield&&!c.equipment?.offHand&&e?.weapon?.handling!=='two-handed'&&!['two-handed','off-hand'].includes(c.context?.weapon?.damageMode)&&!c.context?.deniedDexToAC)add('ac',Math.min(cha,Math.floor(n/2)),'Confident Defence','dodge');
 if(retainsScoundrel(c,'skirmishing-volley')&&e?.weapon?.bow&&conditions['class-option.scoundrel-advancing']){const bonus=n>=15?4:n>=9?3:2;add('attack.all',bonus,'Advancing Volley');add('damage.weapon',bonus,'Advancing Volley');}
 if(retainsScoundrel(c,'practical-technologist')&&conditions['class-option.scoundrel-device']){add('skill.tech-use',2,'Practical Technologist','circumstance');add('skill.disable-device',2,'Practical Technologist','circumstance');}
 if(retainsScoundrel(c,'ambushers-instinct')&&conditions['class-option.scoundrel-ambush'])add('skill.perception',2+2*Math.floor((n-5)/4),'Ambusher’s Instinct');
 return out;
}
export function scoundrelScenarios(c){return [['skirmishing-volley','advancing','Skirmishing Volley: moved 20 ft. and ended closer to this target'],['practical-technologist','device','Operate technology / disable technological mechanism'],['ambushers-instinct','ambush','Notice concealed creatures before combat']].filter(([id])=>retainsScoundrel(c,id)).map(([,id,label])=>({id:'scoundrel-'+id,label,conditions:{['class-option.scoundrel-'+id]:true}}));}
export function scoundrelSummary(c){
 const n=scoundrelLevel(c);if(!n)return null;return {level:n,name:scoundrelArchetype(c)?.name??'Scoundrel',features:scoundrelFeatures(c),talents:selectedScoundrelTalents(c),expertise:scoundrelSelections(c,'scoundrel-expertise-'),mastery:scoundrelSelections(c,'scoundrel-mastery-'),strikes:scoundrelSelections(c,'scoundrel-strike-'),expertiseBonus:2+Math.floor((n-1)/4),strikeDC:10+Math.floor(n/2)+Math.max(...['str','dex'].map(a=>Math.floor(((c.abilities?.[a]??10)-10)/2))),progression:scoundrelArchetype(c)?.progression??data.progression};
}
