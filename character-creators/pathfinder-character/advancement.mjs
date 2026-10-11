export const HIT_DICE={barbarian:12,fighter:10,paladin:10,ranger:10,cavalier:10,gunslinger:10,ironwright:10,bard:8,cleric:8,druid:8,monk:8,rogue:8,alchemist:8,inquisitor:8,wizard:6,sorcerer:6};
export function favoredClasses(c){return [...new Set(c.builder.favoredClasses??[])].filter(Boolean).slice(0,c.builder.raceId==='half-elves'?2:1);}
export function favoredBonus(c,index){return favoredClasses(c).includes(c.builder.classOrder[index])?c.builder.favoredRewards?.[index]??'': '';}
export function hitPoints(c,abilities,featBonus=0){
 const con=Math.floor((abilities.con-10)/2),issues=[];
 const rows=c.builder.classOrder.map((classId,i)=>{
  if(!classId)return null;const die=HIT_DICE[classId],choice=c.builder.hpChoices?.[i],mode=i===0?'max':choice?.mode??'average';
  const roll=mode==='max'?die:mode==='average'?die/2+1:choice?.roll;
  const valid=Number.isInteger(roll)&&roll>=1&&roll<=die;if(!valid)issues.push(`Enter a roll from 1 to ${die} for level ${i+1}.`);
  const favored=favoredBonus(c,i)==='hp'?1:0;
  return {level:i+1,classId,die,mode,roll:valid?roll:null,con,favored,total:valid?Math.max(1,roll+con)+favored:null};
 }).filter(Boolean);
 return {rows,issues,featBonus,total:rows.some(x=>x.total===null)?null:rows.reduce((n,x)=>n+x.total,0)+featBonus};
}
export function validateAdvancement(b){
 if(b.favoredClasses!==undefined&&(!Array.isArray(b.favoredClasses)||b.favoredClasses.length>2||b.favoredClasses.some(x=>x!==''&&!HIT_DICE[x])))throw Error('Invalid favoured classes.');
 if(b.favoredRewards!==undefined&&(!Array.isArray(b.favoredRewards)||b.favoredRewards.length>20||b.favoredRewards.some(x=>!['','hp','skill'].includes(x))))throw Error('Invalid favoured class rewards.');
 if(b.hpChoices!==undefined&&(!Array.isArray(b.hpChoices)||b.hpChoices.length>20||b.hpChoices.some(x=>x!==null&&(!x||!['max','average','roll'].includes(x.mode)||x.roll!==undefined&&(!Number.isInteger(x.roll)||x.roll<1||x.roll>12)))))throw Error('Invalid hit point choices.');
}
