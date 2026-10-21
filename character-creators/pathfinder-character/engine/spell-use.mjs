import {spellcasting,spellById,SPELLCASTING} from './spellcasting.mjs';
import {featSlots} from './feat-progression.mjs';

export const METAMAGIC={
 'extend-spell':{name:'Extend Spell',adjustment:1,description:'Double duration; no effect on instantaneous, concentration or permanent spells.'},
 'empower-spell':{name:'Empower Spell',adjustment:2,description:'Increase variable numeric effects by half, including bonuses to those rolls. Does not increase save DC or opposed rolls.'}
};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const check=(x,message)=>{if(!x)throw Error(message);};
const fields=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k));
export function validateSpellUse(state){
 if(state===undefined)return;
 check(fields(state,['version','spent','selections','lastCast'])&&state.version===1,'Invalid spell-use state.');
 check(object(state.spent)&&object(state.selections),'Invalid spell-use pools.');
 for(const [cls,levels] of Object.entries(state.spent)){
  check(Object.hasOwn(SPELLCASTING.classes,cls)&&object(levels),'Invalid spell-use class.');
  for(const [level,n] of Object.entries(levels))check(/^[1-9]$/.test(level)&&Number.isInteger(n)&&n>=0&&n<=1000,'Invalid spent spell slots.');
 }
 for(const [cls,spells] of Object.entries(state.selections)){
  check(Object.hasOwn(SPELLCASTING.classes,cls)&&object(spells),'Invalid spell preferences.');
  for(const [id,feats] of Object.entries(spells))check(spellById(id)&&Array.isArray(feats)&&feats.length<=Object.keys(METAMAGIC).length&&new Set(feats).size===feats.length&&feats.every(f=>Object.hasOwn(METAMAGIC,f)),'Invalid metamagic selection.');
 }
 if(state.lastCast!==undefined&&state.lastCast!==null){const e=state.lastCast;
  check(fields(e,['classId','spellId','slotLevel','spentAfter'])&&Object.hasOwn(SPELLCASTING.classes,e.classId)&&spellById(e.spellId)&&Number.isInteger(e.slotLevel)&&e.slotLevel>=1&&e.slotLevel<=9&&Number.isInteger(e.spentAfter)&&e.spentAfter>0&&e.spentAfter===state.spent[e.classId]?.[e.slotLevel],'Invalid last spell cast.');
 }
}
const initial=c=>{validateSpellUse(c.spellUse);return structuredClone(c.spellUse??{version:1,spent:{},selections:{}});};
export function selectedMetamagic(c,cls,id){return c.spellUse?.selections?.[cls]?.[id]??[];}
export function slotUsage(c,caster,row){const spent=c.spellUse?.spent?.[caster.id]?.[row.level]??0;return {total:row.slots,spent,available:Math.max(0,row.slots-spent)};}
const line=(spell,key)=>spell.text.split('\n').find(x=>x.startsWith(key+' '))?.slice(key.length+1)??'See spell description';
function durationText(spell,level,extended){
 const raw=line(spell,'Duration'),m=raw.match(/^(\d+) (round|min\.|hour|day)s?\/level(.*)$/i);
 if(m)return `${Number(m[1])*level*(extended?2:1)} ${m[2]==='min.'?'minute':m[2]}${Number(m[1])*level*(extended?2:1)===1?'':'s'}${m[3]}`;
 if(extended)return `Twice normal duration: ${raw}`;
 return raw;
}
function rangeText(spell,level){const raw=line(spell,'Range');if(raw.startsWith('close '))return `${25+5*Math.floor(level/2)} ft. (close)`;if(raw.startsWith('medium '))return `${100+10*level} ft. (medium)`;if(raw.startsWith('long '))return `${400+40*level} ft. (long)`;return raw;}
// Explicit, bounded damage previews. Everything else retains its source text.
function damageText(c,spell,level,empowered){
 let dice=null,count=1,unit='';
 if(spell.id==='magic-missile'){dice='1d4 + 1';count=Math.min(5,1+Math.floor((level-1)/2));unit='missiles';}
 if(spell.id==='burning-hands')dice=`${Math.min(5,level)}d4`;
 if(spell.id==='fireball')dice=`${Math.min(10,level)}d6`;
 if(spell.id==='scorching-ray'){dice='4d6';count=Math.min(3,1+Math.floor(Math.max(0,level-3)/4));unit='rays';}
 if(['acid-splash','ray-of-frost'].includes(spell.id))dice='1d3';
 if(!dice)return empowered?'Variable numeric effects × 1.5; resolve the spell’s caps and exceptions from its description.':'See spell description.';
 const opt=c.builder?.classOptions??{},fire=['red','gold','brass'].includes(opt['bloodline-dragon']);
 if(opt['sorcerer-bloodline']==='draconic'&&fire&&['burning-hands','fireball','scorching-ray'].includes(spell.id))dice+=` + ${Number(dice.match(/^\d+/)[0])} (bloodline)`;
 return `${count>1?count+' '+unit+', each ':''}${empowered?'floor(('+dice+') × 1.5)':dice}${unit==='rays'?'; each ray requires a ranged touch attack':''}`;
}
export function spellCastPreview(c,r,cls,id,metamagic=selectedMetamagic(c,cls,id),dcBonus=0){
 validateSpellUse(c.spellUse);
 const caster=spellcasting(c,r).find(x=>x.id===cls),spell=spellById(id);
 check(caster&&spell,'Spell or casting class is unavailable.');
 check(caster.mode==='known','Prepared casting needs its own prepared-use tracker.');
 const row=caster.rows.find(x=>x.available.includes(id));check(row,'This spell is not currently known by this class.');
 check(Array.isArray(metamagic)&&new Set(metamagic).size===metamagic.length,'Invalid metamagic selection.');
 const slots=featSlots(c),owned=new Set(c.feats.filter(x=>!x.creatorSlot||slots.some(s=>s.id===x.creatorSlot&&(!s.allowed||s.allowed.includes(x.featId)))).map(x=>x.featId)),errors=[];
 for(const feat of metamagic)check(Object.hasOwn(METAMAGIC,feat)&&owned.has(feat),'Choose a metamagic feat this character owns.');
 const extend=metamagic.includes('extend-spell'),empower=metamagic.includes('empower-spell'),rawDuration=line(spell,'Duration');
 if(extend&&/instantaneous|concentration|permanent/i.test(rawDuration))errors.push('Extend Spell cannot change this duration.');
 const slotLevel=row.level+metamagic.reduce((n,f)=>n+METAMAGIC[f].adjustment,0),slot=caster.rows.find(x=>x.level===slotLevel),atWill=slotLevel===0;
 if(!row.eligible)errors.push('Casting ability is too low for this spell.');
 if(!atWill&&(!slot||slot.slots<1))errors.push(`No level ${slotLevel} spell slots available to this class.`);
 const usage=slot?slotUsage(c,caster,slot):{total:0,spent:0,available:0};
 if(!atWill&&slot&&usage.available===0)errors.push(`All level ${slotLevel} slots are spent.`);
 let castingTime=line(spell,'Casting Time');
 if(metamagic.length)castingTime=castingTime==='1 standard action'?'1 full-round action':`${castingTime} + 1 full-round action`;
 return {classId:cls,spellId:id,name:spell.name,baseLevel:row.level,slotLevel,atWill,usage,dc:row.dc+dcBonus,casterLevel:caster.casterLevel,castingTime,duration:durationText(spell,caster.casterLevel,extend),range:rangeText(spell,caster.casterLevel),damage:damageText(c,spell,caster.casterLevel,empower),errors,canCast:errors.length===0,metamagic};
}
export function setSpellMetamagic(c,r,cls,id,feats){
 spellCastPreview(c,r,cls,id,feats);const state=initial(c);state.selections[cls]??={};state.selections[cls][id]=[...feats];return {...structuredClone(c),spellUse:state};
}
export function castSpell(c,r,cls,id){
 const p=spellCastPreview(c,r,cls,id);check(p.canCast,p.errors.join(' '));const next=structuredClone(c);
 if(p.atWill)return next;
 const state=initial(c);state.spent[cls]??={};state.spent[cls][p.slotLevel]=(state.spent[cls][p.slotLevel]??0)+1;
 state.lastCast={classId:cls,spellId:id,slotLevel:p.slotLevel,spentAfter:state.spent[cls][p.slotLevel]};next.spellUse=state;return next;
}
export function undoSpellCast(c){const state=initial(c),e=state.lastCast;check(e,'No spell cast to undo.');state.spent[e.classId][e.slotLevel]--;state.lastCast=null;return {...structuredClone(c),spellUse:state};}
export function restoreSpellSlots(c,cls){check(Object.hasOwn(SPELLCASTING.classes,cls),'Unknown casting class.');const state=initial(c);delete state.spent[cls];if(state.lastCast?.classId===cls)state.lastCast=null;return {...structuredClone(c),spellUse:state};}
