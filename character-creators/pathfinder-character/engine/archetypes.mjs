import barbarianPacks from './barbarian-archetypes-data.mjs';
import packs from './archetypes-data.mjs';
export const FIGHTER_ARCHETYPES=packs;

export const BARBARIAN_ARCHETYPES=barbarianPacks.map(p=>({...p,role:p.role??'Approved campaign barbarian archetype.',features:(p.features??p.approvedFeatures).map(f=>({...f,name:f.name??f.id.replaceAll('-',' ').replace(/\b\w/g,x=>x.toUpperCase()),rulesText:f.rulesText??({'big-game-hunter':'Gain +1 on melee attack rolls and +1 dodge AC against creatures larger than you.','evade-reach':"As a swift action, choose a creature in line of sight. Reduce its reach against you by 5 feet until the end of your turn, increasing by 5 feet at levels 10, 15 and 20.",'massive-weapons':p.mandatoryGrip?.rulesText+' '+p.penaltyRule+' Maximum size difference: one at level 3, two at 9, three at 15; reduce the penalty by 1 at level 3 and every three levels thereafter, to a minimum of zero.','jotungrip':p.jotungrip?.rulesText+' '+p.jotungrip?.offHandStrength?.rulesText,'titans-coordination':p.titansCoordination?.rulesText,'titanic-rage':p.titanicRage?.rulesText}[f.id])??f.name??f.id,replaces:f.replaces??[],alters:f.alters??[],parameters:f.parameters??{},scaling:f.scaling??[]}))}));
const catalogue=cls=>cls==='barbarian'?BARBARIAN_ARCHETYPES:packs;
const classFor=id=>BARBARIAN_ARCHETYPES.some(p=>p.id===id)?'barbarian':'fighter';
export const archetypeIds=(c,cls='fighter')=>c.builder?.archetypes?.[cls]??[];
export const selectedArchetypes=(c,cls='fighter')=>catalogue(cls).filter(p=>archetypeIds(c,cls).includes(p.id));
export const occupiedSlots=p=>[...p.replacements,...p.alterations];
export function conflicts(c,id){const cls=classFor(id),p=catalogue(cls).find(p=>p.id===id);return p?selectedArchetypes(c,cls).filter(x=>x.id!==id).flatMap(x=>occupiedSlots(x).filter(s=>occupiedSlots(p).includes(s)).map(slot=>({slot,name:x.name}))):[];}
export function validateArchetypes(c){const a=c.builder?.archetypes;if(a===undefined)return;if(!a||Array.isArray(a)||typeof a!=='object'||Object.keys(a).some(k=>!['fighter','barbarian'].includes(k)))throw Error('Invalid archetype selections.');for(const cls of ['fighter','barbarian']){const ids=a[cls]??[];if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!catalogue(cls).some(p=>p.id===id)))throw Error('Unknown or duplicate '+cls+' archetype.');for(const id of ids)if(conflicts(c,id).length)throw Error('Archetypes replace or alter the same feature.');}}
export function setArchetype(c,id,enabled){const cls=classFor(id);if(!catalogue(cls).some(p=>p.id===id))throw Error('Unknown archetype.');if(enabled&&conflicts(c,id).length)throw Error('This archetype conflicts with a selected archetype.');c.builder.archetypes={...c.builder.archetypes,[cls]:enabled?[...new Set([...archetypeIds(c,cls),id])]:archetypeIds(c,cls).filter(x=>x!==id)};}
export const replacedBarbarianSlot=(c,id)=>selectedArchetypes(c,'barbarian').some(p=>occupiedSlots(p).includes(id));
export function barbarianProgression(c){return Array.from({length:20},(_,i)=>{
 const level=i+1,features=[],add=(id,label)=>{if(!replacedBarbarianSlot(c,id))features.push({id,label,origin:'Barbarian'});};
 if(level===1){add('proficiencies','Barbarian proficiencies');add('class-skills','Barbarian class skills');add('rage','Rage');add('fast-movement','Fast movement');}
 if(level%2===0)add('rage-powers','Rage power');
 if(level===2)add('uncanny-dodge','Uncanny dodge');if(level===5)add('improved-uncanny-dodge','Improved uncanny dodge');
 if(level%3===0)add('trap-sense','Trap sense +'+level/3);
 if([7,10,13,16,19].includes(level))add('damage-reduction','DR '+(1+(level-7)/3)+'/—');
 for(const [n,id,label] of [[11,'greater-rage','Greater rage'],[14,'indomitable-will','Indomitable will'],[17,'tireless-rage','Tireless rage'],[20,'mighty-rage','Mighty rage']])if(level===n&&!(n===17&&archetypeIds(c,'barbarian').includes('titan-mauler')))add(id,label);
 for(const p of selectedArchetypes(c,'barbarian')){
  if(p.id==='titan-mauler'){for(const label of p.progression[i].features.filter(x=>!['Rage power','Greater rage','Mighty rage'].includes(x)&&!x.startsWith('Damage reduction')&&!x.startsWith('Normal barbarian')&&x!=='Rage'))features.push({id:p.id+'-'+level,label,origin:p.name});}
  else if(p.id==='savage-technologist'){for(const f of p.features.filter(f=>f.level===level))features.push({id:f.id,label:f.name,origin:p.name});if([11,20].includes(level))features.push({id:'savage-rage',label:level===11?'Rage: +4 Str / +6 Dex':'Rage: +4 Str / +8 Dex',origin:p.name});}
  else for(const f of p.progression[i].features.filter(f=>f.origin==='archetype'))features.push({...f,origin:p.name});
 }
 return {level,bab:Array.from({length:1+Math.floor(i/5)},(_,j)=>level-5*j),fortitude:2+Math.floor(level/2),reflex:Math.floor(level/3),will:Math.floor(level/3),features};
});}
export const replacedFighterSlot=(c,id)=>selectedArchetypes(c).some(p=>p.replacements.includes(id));
export const alteredFighterSlot=(c,id)=>selectedArchetypes(c).some(p=>p.alterations.includes(id));
export function fighterProgression(c){return Array.from({length:20},(_,i)=>{const level=i+1,features=[];const add=(id,label)=>{if(!replacedFighterSlot(c,id)&&!alteredFighterSlot(c,id))features.push({id,label,origin:'Fighter'});};if(level===1)add('proficiencies','Fighter proficiencies');if(level===1||level%2===0)add('bonus-feat-'+level,'Bonus combat feat');if(level%4===2)add('bravery','Bravery +'+(1+Math.floor(level/4)));if([3,7,11,15].includes(level))add('armor-training-'+(1+(level-3)/4),'Armour training '+(1+(level-3)/4));if([5,9,13,17].includes(level))add('weapon-training-'+(1+(level-5)/4),'Weapon training '+(1+(level-5)/4));if(level===19)add('armor-mastery','Armour mastery');if(level===20)add('weapon-mastery','Weapon mastery');for(const p of selectedArchetypes(c))for(const f of p.progression[i].features.filter(f=>f.origin==='archetype'))features.push({...f,origin:p.name});return {level,bab:Array.from({length:1+Math.floor(i/5)},(_,j)=>level-5*j),fortitude:2+Math.floor(level/2),reflex:Math.floor(level/3),will:Math.floor(level/3),features};});}
export function archetypeGrants(c){const n=c.classes?.fighter??0;return selectedArchetypes(c).flatMap(p=>p.features.filter(f=>f.level<=n).flatMap(f=>(f.parameters.grantsFeats??(f.parameters.grantsFeat?[f.parameters.grantsFeat]:[])).map(featId=>({featId,name:p.name,level:f.level}))));}
export function archetypeSkills(c){return (c.classes?.fighter??0)>0?selectedArchetypes(c).flatMap(p=>p.features.filter(f=>f.level<=c.classes.fighter).flatMap(f=>f.parameters.addsClassSkills??[])):[];}

export function priorStandStill(c){const order=c.builder?.classOrder??[];let count=0;const earned=order.findIndex(id=>id==='fighter'&&++count===13)+1;
 return (c.feats??[]).some(f=>{if(f.featId!=='stand-still'||f.creatorSlot==='brawler-stand-still-replacement')return false;if(!f.creatorSlot)return true;if(!earned)return false;const id=f.creatorSlot;if(['starting','human','fighter-starting'].includes(id))return true;if(id.startsWith('level-'))return Number(id.slice(6))<earned;const m=id.match(/^(.+)-bonus-(\d+)$/);if(m){let n=0;const at=order.findIndex(cls=>cls===m[1]&&++n===Number(m[2]))+1;return at>0&&at<earned;}return false;});
}
