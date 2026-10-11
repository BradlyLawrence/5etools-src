export const ANCESTRIES=Object.fromEntries([['black','acid','line'],['copper','acid','line'],['blue','electricity','line'],['bronze','electricity','line'],['brass','fire','line'],['red','fire','cone'],['gold','fire','cone'],['white','cold','cone'],['silver','cold','cone'],['green','acid','cone']].map(([id,energy,shape])=>[id,{energy,shape}]));
export const ALTERNATES=[
 {id:'armoured-scales',race:'dragonborn',name:'Armoured Scales',replaces:['breath-weapon'],text:'+1 natural armour bonus to AC.',effects:[['ac',1,'natural-armor']]},
 {id:'draconic-claws',race:'dragonborn',name:'Draconic Claws',replaces:['breath-weapon'],text:'Two primary claw attacks, each dealing 1d4 slashing damage.',effects:[]},
 {id:'keen-senses',race:'dragonborn',name:'Keen Senses',replaces:['energy-resistance'],text:'Darkvision 60 feet and +2 racial bonus to Perception.',effects:[['skill.perception',2]]},
 {id:'versatile-breath',race:'dragonborn',name:'Versatile Breath',replaces:['energy-resistance'],requires:['breath-weapon'],text:'Choose a 15-foot cone or 30-foot line each time you breathe. Energy type is unchanged.',effects:[]},
 {id:'dual-minded',race:'half-elves',name:'Dual Minded',replaces:['adaptability'],text:'+2 Will saves.',effects:[['save.will',2,'racial']]},
 {id:'integrated',race:'half-elves',name:'Integrated',replaces:['adaptability'],text:'+1 Bluff, Disguise and Knowledge (local).',effects:[['skill.bluff',1],['skill.disguise',1],['skill.knowledge-local',1]]},
 {id:'outrider',race:'halflings',name:'Outrider',replaces:['sure-footed'],text:'+2 Handle Animal and Ride.',effects:[['skill.handle-animal',2],['skill.ride',2]]},
 {id:'rock-climber',race:'half-orcs',name:'Rock Climber',replaces:['intimidating'],text:'+1 Acrobatics and Climb.',effects:[['skill.acrobatics',1],['skill.climb',1]]},
 {id:'sacred-tattoo',race:'half-orcs',name:'Sacred Tattoo',replaces:['orc-ferocity'],text:'+1 luck bonus to all saves.',effects:[['save.fortitude',1,'luck'],['save.reflex',1,'luck'],['save.will',1,'luck']]},
 {id:'academician',race:'gnomes',name:'Academician',replaces:['obsessive'],text:'+2 to one Knowledge skill.',choice:'knowledge',effects:[]},
 {id:'silent-hunter',race:'elves',name:'Silent Hunter',replaces:['elven-magic'],text:'Moving Stealth penalty reduced by 5; running Stealth uses a −20 penalty. Apply when relevant.',effects:[]},
 {id:'craftsman',race:'dwarves',name:'Craftsman',replaces:['greed'],text:'+2 Craft or Profession checks creating metal or stone objects. Apply when relevant.',effects:[]},
 {id:'eye-for-talent',race:'humans',name:'Eye for Talent',replaces:['bonus-feat'],text:'+2 Sense Motive. An acquired companion, mount, cohort or familiar gains +2 to one ability of your choice.',effects:[['skill.sense-motive',2]]}
];
export function racialTraits(c){return ALTERNATES.filter(x=>x.race===c.builder?.raceId&&c.builder?.racialAlternates?.includes(x.id));}
export const replacedTrait=(c,id)=>racialTraits(c).some(x=>x.replaces.includes(id));
export function racialEffects(c){
 const rows=racialTraits(c).flatMap(x=>x.effects.map(([target,value,type])=>({kind:'modifier',target,value,bonusType:type??'racial',featId:'race.'+x.id,name:x.name})));
 const choice=c.builder?.racialSkill;
 if(c.builder?.raceId==='gnomes'&&choice){const academic=racialTraits(c).some(x=>x.id==='academician');if(academic?choice.startsWith('knowledge-'):/^(craft|profession):/.test(choice))rows.push({kind:'modifier',target:'skill.'+choice,value:2,bonusType:'racial',featId:'race.skill',name:academic?'Academician':'Obsessive'});}
 return rows;
}
export function validateRacial(b){
 if(b.racialAlternates!==undefined&&(!Array.isArray(b.racialAlternates)||b.racialAlternates.some(id=>!ALTERNATES.some(x=>x.id===id&&x.race===b.raceId))))throw Error('Invalid alternate racial trait.');
 const replaced=(b.racialAlternates??[]).flatMap(id=>ALTERNATES.find(x=>x.id===id).replaces);
 if(new Set(replaced).size!==replaced.length)throw Error('Two alternate traits cannot replace the same racial trait.');
 if(b.draconicAncestry!==undefined&&b.draconicAncestry!==''&&!ANCESTRIES[b.draconicAncestry])throw Error('Invalid draconic ancestry.');
 if((b.racialAlternates??[]).includes('versatile-breath')&&replaced.includes('breath-weapon'))throw Error('Versatile Breath requires the breath weapon.');
 if(b.racialSkill!==undefined&&typeof b.racialSkill!=='string')throw Error('Invalid racial skill choice.');
}

export function dragonbornFeatures(c){
 if(c.builder?.raceId!=='dragonborn')return null;
 validateRacial(c.builder);
 const ancestry=ANCESTRIES[c.builder.draconicAncestry],level=Object.values(c.classes??{}).reduce((a,b)=>a+b,0),con=Math.floor((c.abilities.con-10)/2);
 const traits=c.builder.racialAlternates??[];
 return {ancestry:c.builder.draconicAncestry??null,darkvisionFt:traits.includes('keen-senses')?60:null,
 resistance:ancestry&&!replacedTrait(c,'energy-resistance')?{energy:ancestry.energy,value:5}:null,
 breath:ancestry&&!replacedTrait(c,'breath-weapon')?{energy:ancestry.energy,shapes:traits.includes('versatile-breath')?['15-foot cone','30-foot line']:[ancestry.shape==='cone'?'15-foot cone':'30-foot line'],damage:(1+Math.floor(level/5))+'d6',dc:10+Math.floor(level/2)+con,usesPerDay:1,action:'standard',save:'Reflex half'}:null,
 claws:traits.includes('draconic-claws')?{count:2,damage:'1d4',type:'slashing',category:'primary natural attacks'}:null};
}
