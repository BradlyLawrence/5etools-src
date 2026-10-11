export const MINOR_ADAPTATIONS={
 deadly:{name:'Deadly',price:20,text:'Increase the Fortitude save DC of a coup de grace with this weapon by 4. This does not increase damage.'},
 brace:{name:'Brace',price:20,text:'A successful readied attack with this weapon against a charging creature deals double damage.'},
 trip:{name:'Trip',price:25,text:'If you would be tripped during your own trip attempt with this weapon, you can drop it to avoid being tripped.'},
 blocking:{name:'Blocking',price:25,text:'Gain a +1 shield bonus to AC when fighting defensively with this weapon. This does not stack with another shield bonus.'},
 distracting:{name:'Distracting',price:25,text:'Gain +2 on Bluff checks to feint while wielding this weapon.'},
 disarm:{name:'Disarm',price:50,text:'Gain +2 on combat manoeuvre checks to disarm using this weapon.'}
};
export const ELEMENTS=['acid','cold','electricity','fire','sonic'];
for(const element of ELEMENTS){
 const name=element[0].toUpperCase()+element.slice(1);
 MINOR_ADAPTATIONS['elemental-'+element]={name:name+' damage',price:3000,slots:['weapon'],element,dice:'1d6',text:'This weapon deals an additional 1d6 '+element+' damage on a hit. These dice do not multiply on a critical hit.'};
 for(const value of [1,2,3,5])MINOR_ADAPTATIONS['resist-'+element+'-'+value]={name:name+' resistance '+value,price:100*value*value,slots:['armor','shield'],element,resistance:value,text:'While equipped, resist '+value+' '+element+' damage. Resistance to the same energy type does not stack.'};
}
for(let rating=1;rating<=5;rating++)MINOR_ADAPTATIONS['dr-magic-'+rating]={name:'DR '+rating+'/magic',price:500*rating*rating,slots:['armor','shield'],group:'dr-magic',damageReduction:rating,text:'Reduce physical damage from each hit by '+rating+'. Magical weapons and tech-enhanced weapons bypass this protection. This does not reduce energy damage or stack with other damage reduction.'};
for(const [tier,name] of ['Light','Moderate','Heavy'].entries())MINOR_ADAPTATIONS['fortified-'+(tier+1)]={name:name+' Fortification',price:3000*(tier+1)**2,slots:['armor','shield'],group:'fortification',fortification:25*(tier+1),text:'When a critical hit or sneak attack hits you, there is a '+25*(tier+1)+'% chance to negate its extra damage. The ordinary hit still deals damage. Multiple sources of fortification do not stack.'};
for(let rating=1;rating<=3;rating++)MINOR_ADAPTATIONS['penetrating-'+rating]={name:'Penetrating '+rating,price:1000*rating*rating,slots:['weapon'],group:'penetrating',penetration:rating,text:'Attacks with this weapon ignore '+rating+' points of applicable damage reduction. This does not bypass energy resistance, armour AC or object hardness.'};
MINOR_ADAPTATIONS['precision-breach']={name:'Precision Breach',price:6000,slots:['weapon'],fortificationReduction:25,text:'Against attacks with this weapon, reduce the target’s fortification chance by 25 percentage points, to a minimum of 0%. This does not overcome immunity to critical hits or sneak attacks.'};
for(let rating=1;rating<=3;rating++){
 MINOR_ADAPTATIONS['expanded-magazine-'+rating]={name:'Expanded Magazine '+rating,price:500*rating*rating,slots:['weapon'],group:'magazine',capacityBonus:rating*.5,firearmOnly:true,text:'Increase original ammunition capacity by '+rating*50+'%, rounding added rounds up. Requires a firearm with capacity greater than one. Reload actions and rounds loaded per action are unchanged; a cylinder reload still fills the cylinder.'};
 MINOR_ADAPTATIONS['extended-barrel-'+rating]={name:'Extended Barrel '+rating,price:500*rating*rating,slots:['weapon'],group:'barrel',rangeBonus:rating*.25,firearmOnly:true,text:'Increase original range increment by '+rating*25+'%, rounding the result down to the nearest 5 feet. Does not change damage, cone size or the handcannon’s fixed 20-foot touch-AC range.'};
}
MINOR_ADAPTATIONS.channeling={name:'Channeling',price:500,slots:['weapon'],somaticWhileWielding:true,text:'You can use the hand holding this weapon to perform somatic spell components. Material components and focuses still require access. Armour spell failure and attacks of opportunity for casting are unchanged.'};
for(let rating=1;rating<=3;rating++)MINOR_ADAPTATIONS['disruptive-'+rating]={name:'Disruptive '+['I','II','III'][rating-1],price:2000*rating*rating,slots:['weapon'],group:'disruptive',damageConcentrationDCBonus:rating*2,text:'When damage from this weapon forces a concentration check, increase the DC by '+rating*2+'. This applies only to the check caused by that damage, not to later spells or casting defensively.'};
MINOR_ADAPTATIONS.gauntleted={name:'Gauntleted',price:20,slots:['armor'],unarmedLethal:true,text:'Integrated gauntlets let you deal lethal damage with unarmed strikes. This does not grant Improved Unarmed Strike or prevent attacks of opportunity for attacking unarmed. Armour enhancement does not enhance these attacks.'};
for(const environment of ['woodland','underground','urban','desert','mountain','plains','marsh','aquatic'])MINOR_ADAPTATIONS['concealing-'+environment]={name:'Concealing ('+environment+')',price:50,slots:['armor'],group:'concealing',stealthEnvironment:environment,stealthSightBonus:2,text:'Gain a +2 circumstance bonus on Stealth checks against sight in '+environment+' environments. This does not help against hearing or other senses, or allow hiding without suitable cover or concealment.'};
for(const climate of ['heat','cold'])MINOR_ADAPTATIONS[climate+'-protection']={name:(climate==='heat'?'Heat':'Cold')+' Protection',price:25,slots:['armor'],environmentalSave:climate,environmentalSaveBonus:2,text:'Gain a +2 circumstance bonus on saving throws against environmental '+climate+'. This is not energy resistance and does not apply against '+(climate==='heat'?'fire':'cold')+' spells or attacks.'};
MINOR_ADAPTATIONS.insulated={name:'Insulated',price:50,slots:['armor'],insulated:true,text:'This armour does not count as metal when determining electricity spells’ bonuses against metal-equipped targets. Other metal equipment, including a carried weapon, can still qualify. This grants no electricity resistance and does not change other metal restrictions.'};
MINOR_ADAPTATIONS['impact-capacitor']={name:'Impact Capacitor',price:500,slots:['armor'],impactCapacitor:true,text:'When you take damage from a weapon or natural attack, store that much impact, up to this armour’s enhancement bonus. This does not prevent damage. Your next successful melee weapon hit adds the stored amount to its damage, then empties the capacitor. This bonus multiplies on a critical hit. Stored impact dissipates after 1 minute.'};
export const adaptationFitsBase=(a,base)=>!a.firearmOnly||!!base?.firearm&&(!a.capacityBonus||base.reload?.capacity>1)&&(!a.rangeBonus||base.rangeIncrementFt>0);
export const adaptationGroup=a=>a.resistance?'resistance-'+a.element:a.group;
export const adaptationsConflict=(a,b)=>!!adaptationGroup(a)&&adaptationGroup(a)===adaptationGroup(b);
export const adaptationSlots=d=>d.effects?.find(e=>e.kind===(d.slot==='weapon'?'weapon':'armor'))?.value??0;
export const adaptationAllowed=(a,slot)=>a.slots?.includes(slot)??slot==='weapon';
export function validateAdaptationBase(d,base){
 if(!d.adaptations?.length)return;
 if(!base||base.kind!==d.slot||base.traits?.includes('double'))throw Error('Choose matching single weapon, armour or shield equipment.');
 for(const id of d.adaptations){const a=MINOR_ADAPTATIONS[id];
  if(!a||!adaptationAllowed(a,d.slot)||!a.slots&&base.handling==='ranged')throw Error('This adaptation is not available for this equipment.');
  if(!adaptationFitsBase(a,base))throw Error('This firearm modification requires a compatible gun: magazines need multiple shots; barrels need a range increment.');
  if(base.traits?.includes(id))throw Error('This weapon already has '+a.name+'.');
 }
}

// Campaign recipe DCs; integration and enhancement difficulty are calculated separately.
for(const a of Object.values(MINOR_ADAPTATIONS))a.craftingDC=
 a.dice?15:a.penetration?10+5*(a.penetration-1):a.fortificationReduction?20:
 a.resistance?10+5*Math.floor(a.resistance/2):a.damageReduction?10+5*(a.damageReduction-1):
 a.fortification?10+5*(a.fortification/25):a.capacityBonus?10+5*(a.capacityBonus*2-1):
 a.rangeBonus?10+5*(a.rangeBonus*4-1):a.damageConcentrationDCBonus?10+5*(a.damageConcentrationDCBonus/2-1):
 a.somaticWhileWielding||a.impactCapacitor?15:10;

for(const a of Object.values(MINOR_ADAPTATIONS))a.enhancementCost=a.slots?1:0;
export const adaptationCost=d=>(d.adaptations??[]).reduce((n,id)=>n+(MINOR_ADAPTATIONS[id]?.enhancementCost??1),0);
