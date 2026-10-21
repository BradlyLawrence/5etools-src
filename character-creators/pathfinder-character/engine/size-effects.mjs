export function sizeEffect(c){
 const step=c.buffs?.some(b=>b.active&&b.id==='enlarge-person')?1:c.buffs?.some(b=>b.active&&b.id==='reduce-person')?-1:0;
 const base=c.equipment?.size??(['gnomes','halflings'].includes(c.builder?.raceId)?'small':'medium');
 const sizes=['tiny','small','medium','large'],size=sizes[sizes.indexOf(base)+step]??base;
 const modifiers={tiny:2,small:1,medium:0,large:-1};
 return {step,base,size,attackDelta:modifiers[size]-modifiers[base],reach:{tiny:0,small:5,medium:5,large:10}[size]};
}
export function sizeAbilityScores(input){const c=structuredClone(input),{step}=sizeEffect(c);c.abilities.str=Math.max(1,c.abilities.str+2*step);c.abilities.dex=Math.max(1,c.abilities.dex-2*step);return c;}
const larger={'1':'1d2','1d2':'1d3','1d3':'1d4','1d4':'1d6','1d6':'1d8','1d8':'2d6','1d10':'2d8','1d12':'3d6','2d4':'2d6','2d6':'3d6','2d8':'3d8','3d6':'4d6','3d8':'4d8','4d6':'6d6','4d8':'6d8','6d6':'8d6','6d8':'8d8','8d6':'12d6','8d8':'12d8'};
const smaller={'1':'0','1d2':'1','1d3':'1d2','1d4':'1d3','1d6':'1d4','1d8':'1d6','1d10':'1d8','1d12':'1d10','2d4':'1d6','2d6':'1d10','2d8':'2d6','3d6':'2d6','3d8':'2d8','4d6':'3d6','4d8':'3d8','6d6':'4d6','6d8':'4d8','8d6':'6d6','8d8':'6d8'};
export function sizeWeaponDice(c,e){
 const {step,base}=sizeEffect(c),damage=e.weapon?.damage;if(!damage)return null;
 if(!step||c.equipment?.thrown||step>0&&c.context.attackType==='ranged')return damage[base];
 if(base==='small'&&step>0)return damage.medium;
 if(base==='medium'&&step<0)return damage.small;
 return damage[base].map(d=>{const next=(step>0?larger:smaller)[d];if(next===undefined)throw Error('Unsupported size-change damage dice: '+d);return next;});
}
