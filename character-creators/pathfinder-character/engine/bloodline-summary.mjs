import {bloodlineLevel,classCounts} from './practiced.mjs';
import data from './core-options-data.mjs';
export function bloodlineSummary(c){
 if(!classCounts(c).sorcerer)return null;
 const id=c.builder?.classOptions?.['sorcerer-bloodline'],def=data.bloodlines.find(x=>x.id===id);if(!def)return null;
 const level=bloodlineLevel(c),cha=Math.floor(((c.abilities?.cha??10)-10)/2);
 const source=def.text.split('Bloodline Powers:')[1]??def.text;
 const powers=[...source.matchAll(/(?:^|\n)([^\n]+?\((?:Su|Sp|Ex)\):[\s\S]*?)(?=\n[^\n]+?\((?:Su|Sp|Ex)\):|$)/g)].map(m=>m[1]);
 return {id,name:def.name,level,robe:c.builder?.classOptions?.['bloodline-robe']==='worn',powers:powers.filter((_,i)=>level>=[1,3,9,15,20][i]),draconic:id==='draconic'?{claws:(level>=7?'1d6':'1d4')+(level>=11?' + 1d6 ancestry energy':''),clawRounds:Math.max(0,3+cha),magicClaws:level>=5,resistance:level>=20?'immune':level>=9?10:level>=3?5:0,naturalArmor:level>=15?4:level>=9?2:level>=3?1:0,breath:level>=9?{dice:level+'d6',dc:10+Math.floor(level/2)+cha,uses:level>=20?3:level>=17?2:1}:null,wings:level>=15,powerOfWyrms:level>=20}:null};
}
