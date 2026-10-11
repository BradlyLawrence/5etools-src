import {MINOR_ADAPTATIONS} from './minor-adaptations.mjs';
export function craftingPlan(d,price){
 const enhancement=Math.max(0,...d.effects.filter(e=>['weapon','armor'].includes(e.kind)).map(e=>e.value));
 const other=d.effects.filter(e=>!['weapon','armor','gadget'].includes(e.kind));
 const recipes=(d.adaptations??[]).map(id=>MINOR_ADAPTATIONS[id].craftingDC);
 if(other.length)recipes.push(...other.map(e=>5+Math.max(d.casterLevel,e.casterLevel??1)));
 const recipeDC=Math.max(enhancement?10:0,...recipes,5);
 const enhancementDC=enhancement?5*(enhancement-1):0;
 const integrationDC=5*Math.max(0,recipes.length-1);
 const rushDC=d.accelerated?5:0,missingDC=5*d.missing;
 return {workRequired:Math.ceil(Math.max(0,price.market-price.mundane-price.components)*.5),recipeDC,enhancementDC,integrationDC,rushDC,missingDC,
 dc:recipeDC+enhancementDC+integrationDC+rushDC+missingDC,progressMultiplier:recipeDC+rushDC};
}
export function precisionRigBonus({technology,rushing,specialist=false}){
 return technology&&rushing?(specialist?10:5):(specialist?4:2);
}
export function craftingDay(plan,{roll,bonus,progress=0}){
 if(!Number.isInteger(roll)||roll<1||roll>20||!Number.isFinite(bonus)||!Number.isFinite(progress)||progress<0)throw Error('Enter a d20 roll, total skill bonus and non-negative progress.');
 const result=roll+bonus,success=result>=plan.dc,mishap=!success&&plan.dc-result>=5;
 const change=success?result*plan.progressMultiplier:mishap?-(plan.dc**2):0;
 const next=Math.min(plan.workRequired,Math.max(0,progress+change));
 return {result,outcome:success?'Success':mishap?'Mishap':'No progress',change:next-progress,progress:next,complete:next>=plan.workRequired};
}
