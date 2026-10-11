import {selectableSpecs} from './selectable-abilities.mjs';
import {martialSpecs,martialIssues} from './martial-options.mjs';
import {dragonbornFeatures} from './racial.mjs';
import data from './core-options-data.mjs';
export {data as CORE_OPTIONS};
export function coreChoiceSpecs(classes){
 const specs=[],add=(id,label,options)=>specs.push({id,label,options});
 if(classes.cleric){add('cleric-domain-1','First domain',data.domains);add('cleric-domain-2','Second domain',data.domains);}
 if(classes.inquisitor)add('inquisitor-domain','Domain',data.domains);
 if(classes.sorcerer)add('sorcerer-bloodline','Bloodline',data.bloodlines);
 if(classes.druid)add('druid-bond','Nature bond',[{id:'companion',name:'Animal companion'},{id:'domain',name:'Domain'}]);
 if(classes.ranger>=2)add('ranger-style','Combat style',[{id:'archery',name:'Archery'},{id:'two-weapon',name:'Two-weapon combat'}]);
 if(classes.ranger>=4)add('ranger-bond','Hunter’s bond',[{id:'companion',name:'Animal companion'},{id:'allies',name:'Hunting companions'}]);
 if(classes.paladin>=5)add('paladin-bond','Divine bond',[{id:'weapon',name:'Weapon'},{id:'mount',name:'Mount'}]);
 if(classes.wizard){add('wizard-school','Arcane school',data.schools);add('wizard-bond','Arcane bond',[{id:'familiar',name:'Familiar'},{id:'object',name:'Bonded object'}]);}
 return specs;
}
export function dependentSpecs(c){
 const b=c.builder?.classOptions??{},specs=[...coreChoiceSpecs(c.classes),...martialSpecs(c),...selectableSpecs(c)],add=(id,label,options)=>specs.push({id,label,options});
 if(c.classes.druid&&b['druid-bond']==='domain')add('druid-domain','Nature domain',data.domains.filter(x=>['air','animal','earth','fire','plant','water','weather'].includes(x.id)));
 for(const cls of ['druid','ranger'])if(c.classes[cls]>=(cls==='ranger'?4:1)&&b[cls+'-bond']==='companion')add(cls+'-companion','Animal companion',data.companions.filter(x=>cls!=='ranger'||['badger-wolverine','bird-eagle-hawk-owl','camel','cat-small-cheetah-leopard','dog','horse','pony','snake-viper','wolf'].includes(x.id)));
 if(c.classes.cavalier)add('cavalier-mount','Mount',data.companions.filter(x=>['horse','pony'].includes(x.id)));
 if(c.classes.paladin>=5&&b['paladin-bond']==='mount')add('paladin-mount','Mount',data.companions.filter(x=>['horse','pony'].includes(x.id)));
 if(c.classes.wizard&&b['wizard-school']&&b['wizard-school']!=='universalist')for(const n of [1,2])add('wizard-opposition-'+n,'Opposition school '+n,data.schools.filter(x=>x.id!=='universalist'&&x.id!==b['wizard-school']));
 if(c.classes.wizard&&b['wizard-bond']==='object')add('wizard-object','Bonded object',['amulet','ring','staff','wand','weapon'].map(id=>({id,name:id})));
 if(c.classes.wizard&&b['wizard-bond']==='familiar')add('wizard-familiar','Familiar',['bat','cat','hawk','lizard','owl','rat','raven','snake','toad','weasel'].map(id=>({id,name:id})));
 if(c.classes.sorcerer&&b['sorcerer-bloodline']==='draconic')add('bloodline-dragon','Dragon ancestry',['black','blue','green','red','white','brass','bronze','copper','gold','silver'].map(id=>({id,name:id})));
 if(c.classes.sorcerer&&b['sorcerer-bloodline']==='arcane')add('bloodline-knowledge','Bloodline class skill',['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'].map(x=>({id:'knowledge-'+x,name:'Knowledge ('+x+')'})));
 if(c.classes.wizard&&b['wizard-bond']==='familiar')add('familiar-distance','Familiar location',[{id:'near',name:'Within 1 mile'},{id:'away',name:'More than 1 mile away'}]);
 if(c.classes.sorcerer&&b['sorcerer-bloodline']==='elemental')add('bloodline-element','Element',['air','earth','fire','water'].map(id=>({id,name:id})));
 if(c.classes.wizard&&b['wizard-school']==='abjuration'){
  add('abjuration-energy','Energy resistance',['acid','cold','electricity','fire','sonic'].map(id=>({id,name:id})));
  add('protective-ward','Protective ward',[{id:'off',name:'Inactive'},{id:'on',name:'Within your active ward'}]);
 }
 for(const [cls,domains] of selectedDomains(c)){
  if(domains.includes('animal')&&c.classes[cls]>=4)add(cls+'-domain-companion','Animal domain companion',data.companions);
  if(domains.includes('protection'))add(cls+'-protection-transferred','Resistant touch',[{id:'self',name:'Resistance bonus retained'},{id:'transferred',name:'Resistance bonus transferred to an ally'}]);
 }
 return specs;
}
export function selectedDomains(c){
 const b=c.builder?.classOptions??{};
 return [['cleric',[b['cleric-domain-1'],b['cleric-domain-2']]],['druid',b['druid-bond']==='domain'?[b['druid-domain']]:[]],['inquisitor',[b['inquisitor-domain']]]].filter(([cls])=>c.classes[cls]>0);
}
export function optionEffects(c){
 const b=c.builder?.classOptions??{},effects=[],add=(target,value,id,type='untyped')=>effects.push({kind:'modifier',target,value,bonusType:type,featId:'class-option.'+id,name:id});
 for(const [cls,ids]of [['cleric',['cleric-domain-1','cleric-domain-2']],['druid',b['druid-bond']==='domain'?['druid-domain']:[]],['inquisitor',['inquisitor-domain']]]){
  const level=c.classes[cls]??0;if(!level)continue;
  const chosen=new Set(ids.map(id=>b[id]));
  if(chosen.has('travel'))add('speed.bonus',10,cls+' travel domain');
  if(chosen.has('protection')&&b[cls+'-protection-transferred']!=='transferred')for(const save of ['fortitude','reflex','will'])add('save.'+save,1+Math.floor(level/5),cls+' protection domain','resistance');
 }
 const wizard=c.classes.wizard??0;
 if(wizard&&b['wizard-school']==='divination')add('initiative',Math.max(1,Math.floor(wizard/2)),'Forewarned');
 if(wizard&&b['wizard-school']==='enchantment')for(const skill of ['bluff','diplomacy','intimidate'])add('skill.'+skill,2+Math.floor(wizard/5),'Enchanting Smile','enhancement');
 if(wizard&&b['wizard-school']==='abjuration'&&b['protective-ward']==='on')add('ac',1+Math.floor(wizard/5),'Protective ward','deflection');
 const sorcerer=c.classes.sorcerer??0;
 if(sorcerer>=3&&b['sorcerer-bloodline']==='draconic')add('ac',sorcerer>=15?4:sorcerer>=9?2:1,'Dragon resistances','natural-armor');
 if(sorcerer>=15&&b['sorcerer-bloodline']==='elemental'&&b['bloodline-element']==='fire')add('speed.bonus',30,'Elemental movement');
 if(wizard&&b['wizard-bond']==='familiar'&&b['familiar-distance']==='near'){
  const f=b['wizard-familiar'],bonuses={bat:['skill.fly',3],cat:['skill.stealth',3],lizard:['skill.climb',3],rat:['save.fortitude',2],snake:['skill.bluff',3],toad:['hitPoints.bonus',3],weasel:['save.reflex',2]};
  if(bonuses[f])add(...bonuses[f],'Familiar benefit');
 }
 return effects;
}
export function optionClassSkills(c){
 const b=c.builder?.classOptions??{},out=[];
 if(c.classes.sorcerer){const skill=data.bloodlines.find(x=>x.id===b['sorcerer-bloodline'])?.classSkill;if(skill==='knowledge-any-one'){if(/^knowledge-(arcana|dungeoneering|engineering|geography|history|local|nature|nobility|planes|religion)$/.test(b['bloodline-knowledge']??''))out.push(b['bloodline-knowledge']);}else if(skill)out.push(skill);}
 if(c.classes.cleric&&[b['cleric-domain-1'],b['cleric-domain-2']].includes('knowledge')||c.classes.inquisitor&&b['inquisitor-domain']==='knowledge')out.push(...['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'].map(x=>'knowledge-'+x));
 for(const [,domains] of selectedDomains(c)){if(domains.includes('animal'))out.push('knowledge-nature');if(domains.includes('trickery'))out.push('bluff','disguise','stealth');}
 return out;
}
/** Resistances overlap rather than add; immunity supersedes a numerical resistance. */
export function optionDefenses(c){
 const b=c.builder?.classOptions??{},resistances={},sources=[];
 const add=(energy,value,source)=>{if(!energy)return;const old=resistances[energy]??0;resistances[energy]=old==='immune'||value==='immune'?'immune':Math.max(old,value);sources.push({energy,value,source});};
 const racial=dragonbornFeatures(c)?.resistance;if(racial)add(racial.energy,racial.value,'Dragonborn');
 const energy={air:'electricity',earth:'acid',fire:'fire',water:'cold'};
 for(const [cls,domains] of selectedDomains(c))for(const domain of new Set(domains)){const level=c.classes[cls];if(energy[domain]&&level>=6)add(energy[domain],level>=20?'immune':level>=12?20:10,cls+' '+domain+' domain');}
 const wizard=c.classes.wizard??0;
 if(wizard&&b['wizard-school']==='abjuration'&&['acid','cold','electricity','fire','sonic'].includes(b['abjuration-energy']))add(b['abjuration-energy'],wizard>=20?'immune':wizard>=11?10:5,'Abjuration');
 const level=c.classes.sorcerer??0,bloodline=b['sorcerer-bloodline'];
 if(level>=3){
  if(bloodline==='draconic')add({black:'acid',copper:'acid',green:'acid',blue:'electricity',bronze:'electricity',red:'fire',gold:'fire',brass:'fire',white:'cold',silver:'cold'}[b['bloodline-dragon']],level>=20?'immune':level>=9?10:5,'Draconic bloodline');
  if(bloodline==='elemental')add(energy[b['bloodline-element']],level>=20?'immune':level>=9?20:10,'Elemental bloodline');
  if(bloodline==='celestial')for(const e of ['acid','cold'])add(e,level>=20?'immune':level>=9?10:5,'Celestial bloodline');
  if(bloodline==='infernal')add('fire',level>=20?'immune':level>=9?10:5,'Infernal bloodline');
  if(bloodline==='undead')add('cold',level>=20?'immune':level>=9?10:5,'Undead bloodline');
  if(level>=20&&bloodline==='celestial')for(const e of ['electricity','fire'])add(e,10,'Celestial bloodline');
  if(level>=20&&bloodline==='infernal')for(const e of ['acid','cold'])add(e,10,'Infernal bloodline');
 }
 return {resistances,sources};
}
export function optionIssues(c){
 const b=c.builder?.classOptions??{},issues=[...martialIssues(c)];
 for(const spec of dependentSpecs(c))if(!spec.options.some(x=>x.id===b[spec.id]))issues.push('Choose '+spec.label.toLowerCase()+'.');
 if(c.classes.cleric&&b['cleric-domain-1']&&b['cleric-domain-1']===b['cleric-domain-2'])issues.push('Choose two different cleric domains.');
 if(c.classes.wizard&&b['wizard-school']!=='universalist'&&b['wizard-opposition-1']&&b['wizard-opposition-1']===b['wizard-opposition-2'])issues.push('Choose two different opposition schools.');
 return issues;
}
