// Effective feature levels never replace actual class levels or spellcasting levels.
export const classCounts=c=>c.classes&&Object.keys(c.classes).length?c.classes:c.builder?.classOrder?c.builder.classOrder.reduce((o,id)=>(id&&(o[id]=(o[id]??0)+1),o),{}):c.classes??{};
export const characterLevel=c=>Object.values(classCounts(c)).reduce((a,b)=>a+b,0);
export function practicedCount(c,id){
 const cls=id==='practiced-smite'?'paladin':'sorcerer',minimum=cls==='paladin'?4:2,counts=classCounts(c);
 if((counts[cls]??0)<minimum)return 0;
 if(cls==='paladin'&&(c.builder?.archetypes?.paladin??[]).includes('oath-of-loyalty'))return 0;
 if(cls==='sorcerer'&&!c.builder?.classOptions?.['sorcerer-bloodline'])return 0;
 if(c.activeFeatCounts)return c.activeFeatCounts[id]??0;
 const used=new Set();return (c.feats??[]).filter(f=>f.featId===id).reduce((sum,f)=>{
  if(f.creatorSlot){const at=f.creatorSlot==='starting'?1:Number(f.creatorSlot.match(/^level-(\d+)$/)?.[1]);if(!at||at%2!==1||at>characterLevel(c)||used.has(f.creatorSlot))return sum;used.add(f.creatorSlot);if((c.builder?.classOrder??[]).slice(0,at).filter(x=>x===cls).length<minimum)return sum;}
  return sum+(f.creatorSlot?1:Math.max(1,Math.min(100,f.count??1)));
 },0);
}
export const smiteLevel=c=>Math.min(characterLevel(c),(classCounts(c).paladin??0)+4*practicedCount(c,'practiced-smite'));
export const bloodlineLevel=c=>Math.min(characterLevel(c),(classCounts(c).sorcerer??0)+4*practicedCount(c,'practiced-bloodline')+(c.builder?.classOptions?.['bloodline-robe']==='worn'?4:0));
export function wizardrySummary(c){
 if(!(c.builder?.archetypes?.paladin??[]).includes('oath-against-wizardry')||!classCounts(c).paladin)return null;
 const level=smiteLevel(c),cha=Math.floor(((c.abilities?.cha??10)-10)/2);
 return {level,dc:10+level+cha,maximumSpellLevel:Math.min(7,1+Math.floor((level-1)/3)),maximumBurns:Math.min(4,1+Math.floor((Math.max(1,c.bab??classCounts(c).paladin)-1)/5))};
}
