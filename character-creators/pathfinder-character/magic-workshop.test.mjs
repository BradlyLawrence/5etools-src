import {craftingDay,precisionRigBonus} from './engine/crafting.mjs';
import {inventoryAction} from './inventory.mjs';
import {recoverWithBoiler} from './engine/boilers.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {priceMagicItem,validateMagicItem,nextMark,upgradeDifference,gadgetDesign,TECH_FORMULAE,techMinimumLevel} from './engine/magic-items.mjs';
import {readDesigns,saveDesign,parseDesign,exportDesign,KEY} from '../pathfinder/crafting/storage.mjs';
import {addCraftedItem,craftedAction,renderCrafted} from './crafted-items.mjs';
import {newCharacter} from './character.mjs';import {equip,equipmentSheet} from './equipment.mjs';import {parseCharacter,exportCharacter,saveCharacter,readRoster} from './roster.mjs';
const rules=JSON.parse(await readFile(new URL('./rules.json',import.meta.url),'utf8'));
const effect=(kind,value,more={})=>({kind,value,target:'',detail:'',casterLevel:1,daily:0,components:0,duration:'hours',...more});
const design=(effects=[effect('deflection',1)],more={})=>({id:'design-one',name:'Test item',description:'A crafted item.',slot:'ring1',baseId:'',basePrice:0,weight:0,casterLevel:1,missing:0,accelerated:false,requirements:'',priceOverride:null,effects,...more});
const make=()=>{const c=newCharacter();c.builder.classOrder=['fighter'];c.builder.targetLevel=1;return c;};
const use=(c,d,id)=>{addCraftedItem(c,d,id);craftedAction(c,rules,id,'equip');};
test('known formula prices separate base and materials; time, components and zero-level spells',()=>{
 let p=priceMagicItem(design([effect('weapon',1)],{slot:'weapon',baseId:'longsword',basePrice:15}));assert.equal(p.market,2315);assert.equal(p.materials,1315);assert.equal(p.workRequired,1000);
 p=priceMagicItem(design([effect('scroll',0)],{slot:'slotless'}));assert.equal(p.market,12.5);assert.equal(p.materials,6.25);assert.equal(p.workRequired,7);
 p=priceMagicItem(design([effect('wand',4,{casterLevel:7,components:250})],{slot:'slotless'}));assert.equal(p.market,33500);assert.equal(p.materials,23000);
 p=priceMagicItem(design([effect('continuous',1,{duration:'rounds',daily:1})],{casterLevel:3,missing:2,accelerated:true}));assert.equal(p.market,1600);assert.equal(p.dc,23);assert.equal(p.workRequired,800);
 assert.equal(priceMagicItem(design([effect('bonusSpell',1)],{slot:'slotless'})).market,1000);
});
test('different body-slot powers have surcharge; slotless doubles; overrides remain explicit',()=>{
 const d=design([effect('deflection',2),effect('resistance',1)]);assert.equal(priceMagicItem(d).market,9500);d.slot='slotless';assert.equal(priceMagicItem(d).market,18000);d.priceOverride=20000;assert.equal(priceMagicItem(d).materials,10000);assert.equal(priceMagicItem(d).estimate,18000);
 assert.throws(()=>priceMagicItem(design([effect('potion',4)],{slot:'slotless'})));assert.throws(()=>priceMagicItem(design([effect('scroll',1)],{slot:'slotless',missing:1})));assert.throws(()=>validateMagicItem(design([effect('custom',NaN)])));
});
test('private saves and JSON roundtrip do not modify other tools; corrupt storage stays untouched',()=>{
 const map=new Map([['lotr','unchanged']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const d=design();saveDesign(storage,d);assert.deepEqual(readDesigns(storage),[d]);assert.deepEqual(parseDesign(exportDesign(d)),d);assert.equal(map.get('lotr'),'unchanged');assert.throws(()=>parseDesign({fileType:'pf1-character',schemaVersion:1,item:d}));map.set(KEY,'bad');assert.throws(()=>saveDesign(storage,d));assert.equal(map.get(KEY),'bad');
});
test('character copies are independent, preserve weapon feats and export with the character',()=>{
 const c=make();equip(c,rules,'weaponId','longsword');const baseline=equipmentSheet(c,rules);const d=design([effect('weapon',2)],{slot:'weapon',baseId:'longsword'});use(c,d,'sword');d.effects[0].value=5;
 let s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,baseline.stats.attack.total+2);assert.equal(s.stats.damage.total,baseline.stats.damage.total+2);
 c.feats=[{featId:'weapon-focus',weaponId:'longsword'}];s=equipmentSheet(c,rules);assert.equal(s.stats.attack.total,baseline.stats.attack.total+3);
 assert.deepEqual(parseCharacter(exportCharacter(c)).craftedItems,c.craftedItems);equip(c,rules,'weaponId','longsword');assert.equal(c.craftedItems[0].equipped,false);assert.equal(equipmentSheet(c,rules).stats.damage.total,baseline.stats.damage.total);
});
test('armour enhancement and masterwork penalty apply; same-slot replacement and typed bonuses do not stack',()=>{
 const c=make();equip(c,rules,'armorId','leather');const base=equipmentSheet(c,rules).stats.ac.total;
 use(c,design([effect('armor',2)],{slot:'armor',baseId:'leather'}),'armour');assert.equal(equipmentSheet(c,rules).stats.ac.total,base+2);
 use(c,design([effect('deflection',1)]),'ring-one');use(c,design([effect('deflection',3)],{slot:'ring2'}),'ring-two');assert.equal(equipmentSheet(c,rules).stats.ac.total,base+5);
 use(c,design([effect('resistance',1)]),'new-ring');assert.equal(c.craftedItems.find(i=>i.instanceId==='ring-one').equipped,false);assert.equal(equipmentSheet(c,rules).stats['save.will'].total,1);
});
test('ability and skill bonuses calculate while active, escape descriptions, and never mutate rules',()=>{
 const c=make(),before=JSON.stringify(rules),base=equipmentSheet(c,rules);use(c,design([effect('ability',2,{target:'str'}),effect('skill',3,{target:'perception'})],{slot:'belt',description:'<img src=x onerror=alert(1)>'}),'belt');const s=equipmentSheet(c,rules);assert.equal(s.effectiveAbilities.str,base.effectiveAbilities.str+2);assert.equal(s.stats['skill.perception'].total,base.stats['skill.perception'].total+3);assert.match(renderCrafted(c),/&lt;img/);assert.equal(JSON.stringify(rules),before);craftedAction(c,rules,'belt','equip');assert.equal(equipmentSheet(c,rules).effectiveAbilities.str,base.effectiveAbilities.str);
});

test('a stale character editor cannot overwrite a workshop addition',()=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const c=make();saveCharacter(storage,c,'one');const snapshot=JSON.stringify(c),copy=structuredClone(c);addCraftedItem(copy,design(),'added');saveCharacter(storage,copy,'one');assert.throws(()=>saveCharacter(storage,c,'one',snapshot),/another tab/);assert.equal(readRoster(storage).characters[0].character.craftedItems.length,1);});

test('tech spell items use magic prices and enforce alchemist formula levels and crafter limits',()=>{for(const kind of ['scroll','continuous']){const f=TECH_FORMULAE.find(f=>f.levels.alchemist===2),cl=techMinimumLevel(2);assert.equal(cl,4);const e=effect(kind,2,{formulaId:f.id,casterLevel:cl});const d=design([e],{slot:'slotless',technology:true,techLevel:cl,casterLevel:cl});assert.deepEqual(priceMagicItem(d),priceMagicItem({...d,technology:false}));assert.deepEqual(parseDesign(exportDesign(d)),d);assert.throws(()=>priceMagicItem({...d,techLevel:cl-1}));assert.throws(()=>priceMagicItem({...d,effects:[{...e,formulaId:'not-an-alchemist-formula'}]}));assert.throws(()=>priceMagicItem({...d,effects:[{...e,value:1}]}));assert.throws(()=>priceMagicItem({...d,effects:[{...e,casterLevel:cl-1}]}));assert.throws(()=>priceMagicItem({...d,effects:[{...e,daily:1}]}));}});

test('minor adaptations cost fixed amounts, consume enhancement slots and reject duplicates',()=>{
 const d=design([effect('weapon',2)],{technology:true,techLevel:6,slot:'weapon',baseId:'longsword',adaptations:['trip','disarm']});
 assert.equal(priceMagicItem(d).market,8395);
 assert.throws(()=>priceMagicItem({...d,adaptations:['trip','trip']}));assert.doesNotThrow(()=>priceMagicItem({...d,adaptations:['trip','brace','deadly']}));
 assert.throws(()=>priceMagicItem({...d,technology:false}));assert.throws(()=>priceMagicItem({...d,adaptations:['unknown']}));
});
test('adapted weapon traits calculate, do not stack native traits, and turn off when unequipped',()=>{
 const c=make();equip(c,rules,'weaponId','longsword');const baseline=equipmentSheet(c,rules);
 const d=design([effect('weapon',5)],{technology:true,techLevel:6,slot:'weapon',baseId:'longsword',adaptations:['blocking','disarm','distracting','deadly','brace']});use(c,d,'adapted');
 let s=equipmentSheet(c,rules);assert.equal(s.stats['maneuver.disarm.check'].total,baseline.stats['maneuver.disarm.check'].total+7);assert.equal(s.stats['skill.feint'].total,s.stats['skill.bluff'].total+2);assert.equal(s.stats['coupDeGrace.dcBonus'].total,4);assert.equal(s.stats.damage.total,baseline.stats.damage.total+5);assert.ok(s.equipment.traits.includes('brace'));
 c.equipment.fightingDefensively=true;s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total,baseline.stats.ac.total+3);assert.equal(s.stats.attack.total,baseline.stats.attack.total+1);
 equip(c,rules,'shieldId','shield-heavy-steel');s=equipmentSheet(c,rules);assert.equal(s.stats.ac.total,baseline.stats.ac.total+4);
 c.equipment.fightingDefensively=false;craftedAction(c,rules,'adapted','equip');s=equipmentSheet(c,rules);assert.equal(s.stats['coupDeGrace.dcBonus'].total,0);assert.equal(s.stats['skill.feint'].total,s.stats['skill.bluff'].total);
 const sickle=design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'sickle',adaptations:['trip']});addCraftedItem(c,sickle,'native');assert.throws(()=>craftedAction(c,rules,'native','equip'),/already has/);
});
test('adapted steam weapons preserve separate fuel, enhancement, feats and saved traits',()=>{
 const c=make();c.builder.classOrder=Array(7).fill('ironwright');c.builder.targetLevel=7;
 const d=design([effect('weapon',1)],{technology:true,techLevel:7,slot:'weapon',baseId:'steam-axe',adaptations:['disarm']});use(c,d,'steam');const saved=c.craftedItems[0].techInstanceId;
 assert.equal(c.techEquipment.selectedInstanceId,saved);assert.equal(c.techEquipment.items[0].enhancement,1);const s=equipmentSheet(c,rules);assert.ok(s.equipment.traits.includes('disarm'));assert.equal(s.technology.items[0].maximum,6);
 const p=equipmentSheet(c,rules,'pressure-strike');assert.ok(p.equipment.traits.includes('disarm'));assert.equal(p.stats.attack.total,s.stats.attack.total+1);
 assert.deepEqual(parseCharacter(exportCharacter(c)).craftedItems,c.craftedItems);craftedAction(c,rules,'steam','equip');craftedAction(c,rules,'steam','equip');assert.equal(c.techEquipment.items.length,1);assert.equal(c.techEquipment.items[0].reservoir,4);
});

test('elemental modifications price, validate, export and follow equipped weapons',()=>{
 for(const element of ['acid','cold','electricity','fire','sonic']){
  const c=make(),d=design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'longbow',adaptations:['elemental-'+element]});
  assert.equal(priceMagicItem(d).market,5300);use(c,d,'element');
  let sheet=equipmentSheet(c,rules);assert.deepEqual(sheet.equipment.elementalDamage,[{type:element,dice:'1d6',multipliesOnCritical:false}]);
  assert.deepEqual(parseCharacter(exportCharacter(c)).craftedItems,c.craftedItems);
  craftedAction(c,rules,'element','equip');assert.deepEqual(equipmentSheet(c,rules).equipment.elementalDamage,[]);
 }
 const invalid=design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'longsword',adaptations:['resist-fire-1']});assert.throws(()=>priceMagicItem(invalid),/match/);
});
test('resistances use highest equipped rating; tech armour enhancement is applied once',()=>{
 const c=make();
 const techBase=rules.equipment.items.find(x=>x.kind==='armor'&&x.tech);
 const d=design([effect('armor',2)],{technology:true,techLevel:1,slot:'armor',baseId:techBase.id,adaptations:['resist-fire-3','resist-cold-2']});
 assert.equal(priceMagicItem(d).market,5470);use(c,d,'resist-armour');
 let sheet=equipmentSheet(c,rules);assert.deepEqual(sheet.equipment.energyResistance,{fire:3,cold:2});
 const ac=sheet.stats.ac.total;
 assert.equal(c.techEquipment.items.find(x=>x.instanceId===c.craftedItems[0].techInstanceId).enhancement,2);
 const plain=structuredClone(c);plain.craftedItems=[];assert.equal(equipmentSheet(plain,rules).stats.ac.total,ac);
 const shield=rules.equipment.items.find(x=>x.kind==='shield'&&!x.tech);
 use(c,design([effect('armor',1)],{technology:true,techLevel:1,slot:'shield',baseId:shield.id,adaptations:['resist-fire-1']}),'resist-shield');
 assert.equal(equipmentSheet(c,rules).equipment.energyResistance.fire,3);
 craftedAction(c,rules,'resist-armour','equip');assert.equal(equipmentSheet(c,rules).equipment.energyResistance.fire,1);
 const repeated={...d,adaptations:['resist-fire-1','resist-fire-3']};assert.throws(()=>priceMagicItem(repeated),/one resistance/);
});

test('defensive and counter modifications use agreed tier prices and one slot per family',()=>{
 const armor=(adaptations,value=1)=>design([effect('armor',value)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',adaptations});
 const weapon=(adaptations,value=1)=>design([effect('weapon',value)],{technology:true,techLevel:1,slot:'weapon',baseId:'longsword',adaptations});
 for(let n=1;n<=5;n++)assert.equal(priceMagicItem(armor(['dr-magic-'+n])).market,1150+500*n*n);
 for(let n=1;n<=3;n++){
  assert.equal(priceMagicItem(armor(['fortified-'+n])).market,1150+3000*n*n);
  assert.equal(priceMagicItem(weapon(['penetrating-'+n])).market,2300+1000*n*n);
 }
 assert.equal(priceMagicItem(weapon(['precision-breach'])).market,8300);
 assert.throws(()=>priceMagicItem(armor(['dr-magic-1','dr-magic-2'],2)),/one rating/);
 assert.throws(()=>priceMagicItem(armor(['fortified-1','fortified-3'],2)),/one rating/);
 assert.throws(()=>priceMagicItem(weapon(['penetrating-1','penetrating-3'],2)),/one rating/);
 assert.throws(()=>priceMagicItem(weapon(['penetrating-1','precision-breach'])),/enhancement cost/);
 assert.throws(()=>priceMagicItem(armor(['penetrating-1'])),/match/);
 assert.throws(()=>priceMagicItem(weapon(['fortified-1'])),/match/);
 const upgraded=priceMagicItem(armor(['dr-magic-3'])).market-priceMagicItem(armor(['dr-magic-1'])).market;assert.equal(upgraded,4000);
});
test('equipped defences choose highest source and weapon counters survive character roundtrip',()=>{
 const c=make();
 use(c,design([effect('armor',2)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',adaptations:['dr-magic-3','fortified-2']}),'defence');
 const shield=rules.equipment.items.find(x=>x.kind==='shield'&&!x.tech);
 use(c,design([effect('armor',2)],{technology:true,techLevel:1,slot:'shield',baseId:shield.id,adaptations:['dr-magic-1','fortified-1']}),'shield');
 use(c,design([effect('weapon',2)],{technology:true,techLevel:1,slot:'weapon',baseId:'longsword',adaptations:['penetrating-2','precision-breach']}),'counter');
 let sheet=equipmentSheet(c,rules);assert.deepEqual(sheet.equipment.damageReduction,{amount:3,bypass:'magic'});assert.equal(sheet.equipment.fortificationPercent,50);assert.equal(sheet.equipment.drPenetration,2);assert.equal(sheet.equipment.fortificationReduction,25);assert.equal(sheet.equipment.bypassesMagicDR,true);
 assert.deepEqual(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment,sheet.equipment);
 craftedAction(c,rules,'defence','equip');sheet=equipmentSheet(c,rules);assert.equal(sheet.equipment.damageReduction.amount,1);assert.equal(sheet.equipment.fortificationPercent,25);
 craftedAction(c,rules,'counter','equip');sheet=equipmentSheet(c,rules);assert.equal(sheet.equipment.drPenetration,0);assert.equal(sheet.equipment.fortificationReduction,0);assert.equal(sheet.equipment.bypassesMagicDR,false);
});

test('gun modifications scale original capacity and range without altering reload or touch AC',()=>{
 for(let tier=1;tier<=3;tier++){
 const c=make();c.builder.classOrder=['gunslinger','gunslinger'];c.builder.targetLevel=2;c.builder.gunslinger={primary:'pistol'};
 const d=design([effect('weapon',2)],{technology:true,techLevel:1,slot:'weapon',baseId:'pistol-4',adaptations:['expanded-magazine-'+tier,'extended-barrel-'+tier]});
 assert.equal(priceMagicItem(d).market,8320+1000*tier*tier);use(c,d,'gun');let s=equipmentSheet(c,rules);
 assert.equal(s.equipment.capacity,[6,8,10][tier-1]);assert.equal(s.equipment.rangeIncrementFt,[35,45,50][tier-1]);assert.equal(s.equipment.reloadAction,'swift');assert.equal(s.equipment.firearmReload.roundsLoaded,s.equipment.capacity);assert.equal(s.equipment.proficient,true);
 assert.deepEqual(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment,s.equipment);
 craftedAction(c,rules,'gun','equip');equip(c,rules,'weaponId','pistol-4');s=equipmentSheet(c,rules);assert.equal(s.equipment.capacity,4);assert.equal(s.equipment.rangeIncrementFt,30);
 }
 const c=make();use(c,design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'handcannon',adaptations:['extended-barrel-3']}),'cannon');let s=equipmentSheet(c,rules);assert.equal(s.equipment.rangeIncrementFt,35);assert.equal(s.equipment.firearm.touchACRangeFt,20);assert.equal(s.equipment.capacity,1);
 for(const baseId of ['rifle','handcannon','light-trenchgun','longbow','repeating-heavy-crossbow']){const bad=make();addCraftedItem(bad,design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId,adaptations:['expanded-magazine-1']}),'bad');assert.throws(()=>craftedAction(bad,rules,'bad','equip'),/compatible gun/);}
 const rifle=make();rifle.builder.classOrder=['gunslinger','gunslinger'];rifle.builder.targetLevel=2;rifle.builder.gunslinger={primary:'rifle'};use(rifle,design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'double-rifle',adaptations:['expanded-magazine-3']}),'rifle');s=equipmentSheet(rifle,rules);assert.equal(s.equipment.capacity,5);assert.equal(s.equipment.firearmReload.roundsLoaded,2);
 assert.equal(rules.equipment.items.find(x=>x.id==='pistol-4').reload.capacity,4);
 const noShield=equipmentSheet(rifle,rules).stats.ac.total;equip(rifle,rules,'shieldId',rules.equipment.items.find(x=>x.kind==='shield'&&!x.tech&&x.id!=='buckler').id);assert.equal(equipmentSheet(rifle,rules).stats.ac.total,noShield);
});

test('Channeling and Disruptive prices, slot limits and equipment restrictions',()=>{
 const d=design([effect('weapon',2)],{technology:true,techLevel:1,slot:'weapon',baseId:'longsword',adaptations:['channeling','disruptive-1']});
 for(let n=1;n<=3;n++){d.adaptations=['channeling','disruptive-'+n];assert.equal(priceMagicItem(d).market,8320+500+2000*n*n);assert.deepEqual(parseDesign(exportDesign(d)),d);}
 assert.throws(()=>priceMagicItem({...d,adaptations:['disruptive-1','disruptive-2']}),/one rating/);
 assert.throws(()=>priceMagicItem({...d,effects:[effect('weapon',1)]}),/enhancement cost/);
 assert.throws(()=>priceMagicItem({...d,slot:'armor',baseId:'leather',effects:[effect('armor',2)]}),/match/);
});
test('casting modifications follow the equipped weapon without changing spell failure or own concentration',()=>{
 for(const baseId of ['longsword','pistol-4','steam-axe']){
 const c=make();equip(c,rules,'armorId','full-plate');equip(c,rules,'weaponId',baseId);const baseline=equipmentSheet(c,rules);
 use(c,design([effect('weapon',2)],{technology:true,techLevel:1,slot:'weapon',baseId,adaptations:['channeling','disruptive-3']}),'casting');
 let s=equipmentSheet(c,rules);assert.equal(s.equipment.somaticWhileWielding,true);assert.equal(s.equipment.damageConcentrationDCBonus,6);assert.equal(s.equipment.arcaneFailurePercent,baseline.equipment.arcaneFailurePercent);assert.equal(s.stats['concentration.bonus'].total,baseline.stats['concentration.bonus'].total);
 assert.ok(s.equipment.traitRules.some(x=>x.name==='Channeling'));assert.ok(s.equipment.traitRules.some(x=>x.name==='Disruptive III'));
 const copy=parseCharacter(exportCharacter(c));assert.equal(equipmentSheet(copy,rules).equipment.damageConcentrationDCBonus,6);
 craftedAction(c,rules,'casting','equip');s=equipmentSheet(c,rules);assert.equal(s.equipment.somaticWhileWielding,false);assert.equal(s.equipment.damageConcentrationDCBonus,0);
 }
});

test('cheap armour adaptations price correctly and reject incompatible slots and duplicate camouflage',()=>{
 const armour=(mods,value=1)=>design([effect('armor',value)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',adaptations:mods});
 for(const [id,cost] of [['gauntleted',20],['concealing-woodland',50],['heat-protection',25],['cold-protection',25],['insulated',50]]){
 assert.equal(priceMagicItem(armour([id])).market,1150+cost);
 assert.throws(()=>priceMagicItem({...armour([id]),slot:'weapon',baseId:'longsword',effects:[effect('weapon',1)]}),/match/);
 assert.throws(()=>priceMagicItem({...armour([id]),slot:'shield',baseId:'buckler'}),/match/);
 }
 assert.throws(()=>priceMagicItem(armour(['concealing-woodland','concealing-urban'],2)),/one rating/);
 assert.throws(()=>priceMagicItem(armour(['heat-protection','cold-protection'])),/enhancement cost/);
});
test('armour utility effects stay conditional, gauntlets do not inherit weapon or armour enhancements',()=>{
 const c=make();equip(c,rules,'armorId','leather');const before=equipmentSheet(c,rules);
 const d=design([effect('armor',5)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',adaptations:['gauntleted','concealing-woodland','heat-protection','cold-protection','insulated']});use(c,d,'utility-armour');
 use(c,design([effect('weapon',3)],{slot:'weapon',baseId:'longsword'}),'enchanted-sword');
 let s=equipmentSheet(c,rules);assert.equal(s.equipment.unarmedLethal,true);assert.equal(s.equipment.insulatedArmour,true);assert.deepEqual(s.equipment.environmentalSaveBonuses,{heat:2,cold:2});assert.deepEqual(s.equipment.conditionalStealth,[{environment:'woodland',sense:'sight',bonus:2,bonusType:'circumstance'}]);
 assert.deepEqual(s.equipment.energyResistance,{});assert.equal(s.stats['skill.stealth'].total,before.stats['skill.stealth'].total);assert.equal(s.stats['save.fortitude'].total,before.stats['save.fortitude'].total);assert.ok(!s.feats.some(f=>f.featId==='improved-unarmed-strike'&&f.active));
 const plain=make();equip(plain,rules,'armorId','leather');equip(plain,rules,'weaponId','gauntlet');const gauntlet=equipmentSheet(plain,rules);assert.equal(s.equipment.gauntletAttack.attack,gauntlet.stats.attack.total);assert.equal(s.equipment.gauntletAttack.damageBonus,gauntlet.stats.damage.total);assert.deepEqual(s.equipment.gauntletAttack.dice,gauntlet.equipment.damageDice);
 assert.deepEqual(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment,s.equipment);
 craftedAction(c,rules,'utility-armour','equip');s=equipmentSheet(c,rules);assert.equal(s.equipment.unarmedLethal,false);assert.equal(s.equipment.insulatedArmour,false);assert.deepEqual(s.equipment.environmentalSaveBonuses,{});assert.deepEqual(s.equipment.conditionalStealth,[]);assert.equal(s.equipment.gauntletAttack,undefined);
});

test('Mark 2 keeps a frozen baseline, calculates upgrade differences and exports through Mark 3',()=>{
 const original=design([effect('armor',1)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',basePrice:10,adaptations:['heat-protection']});
 const before=JSON.stringify(original),second=nextMark(original,'second-mark');assert.equal(nextMark({...original,name:'Armour Mk2'},'named-mark').name,'Armour — Mark 3');assert.equal(second.mark,2);assert.equal(second.name,'Test item — Mark 2');assert.equal(upgradeDifference(second).materialsDue,0);
 second.effects[0].value=2;second.adaptations.push('impact-capacitor');const difference=upgradeDifference(second);assert.equal(difference.marketDue,3520);assert.equal(difference.materialsDue,1760);assert.equal(JSON.stringify(original),before);
 const imported=parseDesign(exportDesign(second));assert.deepEqual(upgradeDifference(imported),difference);
 const third=nextMark(imported,'third-mark');assert.equal(third.mark,3);assert.equal(third.name,'Test item — Mark 3');assert.equal(third.upgradeFrom.upgradeFrom,undefined);assert.equal(upgradeDifference(third).marketDue,0);
 assert.throws(()=>priceMagicItem({...second,baseId:'full-plate'}),/same base/);assert.throws(()=>priceMagicItem({...second,upgradeFrom:{...original,upgradeFrom:original}}),/baseline/);
 const lower=nextMark(original,'lower-mark');lower.adaptations=[];assert.equal(upgradeDifference(lower).marketDue,0);assert.equal(upgradeDifference(lower).materialsDue,0);assert.equal(upgradeDifference(lower).marketDifference,-25);
});
test('Impact Capacitor costs one slot, scales with armour enhancement and does not add constant damage',()=>{
 const c=make();equip(c,rules,'weaponId','longsword');equip(c,rules,'armorId','leather');const before=equipmentSheet(c,rules);
 const d=design([effect('armor',3)],{technology:true,techLevel:1,slot:'armor',baseId:'leather',adaptations:['impact-capacitor']});assert.equal(priceMagicItem(d).market,9650);use(c,d,'capacitor');
 let s=equipmentSheet(c,rules);assert.equal(s.equipment.impactCapacitorCapacity,3);assert.equal(s.stats.damage.total,before.stats.damage.total);assert.match(s.equipment.traitRules.find(t=>t.name==='Impact Capacitor').text,/Capacity: 3 damage/);
 assert.equal(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment.impactCapacitorCapacity,3);
 craftedAction(c,rules,'capacitor','equip');assert.equal(equipmentSheet(c,rules).equipment.impactCapacitorCapacity,0);
});

test('gadget presets have fixed prices, valid slots, private JSON and Mark upgrades',()=>{
 for(const [id,price] of [['omni-tool',100],['masterwork-omni-tool',250],['darkvision-goggles-30',3000],['darkvision-goggles-60',12000]]){const d=gadgetDesign(id,'gadget');assert.equal(priceMagicItem(d).market,price);assert.deepEqual(parseDesign(exportDesign(d)),d);assert.equal(d.adaptations,undefined);}
 const upgrade=nextMark(gadgetDesign('darkvision-goggles-30','thirty'),'sixty');upgrade.effects[0].target='darkvision-goggles-60';assert.equal(upgradeDifference(upgrade).marketDue,9000);assert.equal(upgradeDifference(upgrade).materialsDue,4500);
 assert.throws(()=>priceMagicItem({...upgrade,slot:'slotless'}));assert.throws(()=>priceMagicItem({...gadgetDesign('omni-tool','tool'),effects:[{kind:'gadget',value:2,target:'omni-tool',detail:''}]}));
});
test('goggles use the best racial/item range, obey eye slots and disappear on unequip',()=>{
 const c=make();use(c,gadgetDesign('darkvision-goggles-30','thirty'),'eyes-one');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,30);
 c.builder.raceId='dwarves';assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,60);c.builder.raceId='humans';
 use(c,gadgetDesign('darkvision-goggles-60','sixty'),'eyes-two');assert.equal(c.craftedItems.find(x=>x.instanceId==='eyes-one').equipped,false);assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,60);
 assert.equal(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment.darkvisionFt,60);craftedAction(c,rules,'eyes-two','equip');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,0);
});
test('omni-tools grant conditional handheld craft support without stacking or boosting laboratory work',()=>{
 const c=make(),before=equipmentSheet(c,rules);use(c,gadgetDesign('omni-tool','ordinary'),'ordinary');assert.equal(equipmentSheet(c,rules).equipment.handheldCraftToolBonus,0);
 use(c,gadgetDesign('masterwork-omni-tool','master'),'master');use(c,gadgetDesign('masterwork-omni-tool','another'),'another');const sheet=equipmentSheet(c,rules);assert.equal(sheet.equipment.handheldCraftToolBonus,2);assert.equal(sheet.stats['crafting.skillBonus'].total,before.stats['crafting.skillBonus'].total);assert.ok(sheet.equipment.traitRules.some(t=>t.name==='Masterwork omni-tool'));
 craftedAction(c,rules,'master','equip');craftedAction(c,rules,'another','equip');assert.equal(equipmentSheet(c,rules).equipment.handheldCraftToolBonus,0);
});

test('boiler models price and split recovery atomically with capacity and campaign cooldown limits',()=>{
 for(const [points,price] of [[2,1000],[4,4000],[8,16000]])assert.equal(priceMagicItem(gadgetDesign('camp-boiler-'+points,'boiler')).market,price);
 const c=make();equip(c,rules,'weaponId','steam-axe');const axe=c.techEquipment.items[0];axe.reservoir=0;axe.damageTaken=1;axe.mechanismBroken=true;
 const armour=rules.equipment.items.find(i=>i.kind==='armor'&&i.tech);equip(c,rules,'armorId',armour.id);const suit=c.techEquipment.items.find(i=>i.itemId===armour.id);suit.reservoir=1;
 addCraftedItem(c,gadgetDesign('camp-boiler-4','boiler-design'),'boiler');
 const event={instanceId:'boiler',completionHour:8,restConfirmed:true,allocations:[{instanceId:axe.instanceId,points:2},{instanceId:suit.instanceId,points:2}]};
 const updated=recoverWithBoiler(c,rules,event);assert.equal(axe.reservoir,0);assert.equal(updated.techEquipment.items.find(i=>i.instanceId===axe.instanceId).reservoir,2);assert.equal(updated.techEquipment.items.find(i=>i.instanceId===suit.instanceId).reservoir,3);assert.equal(updated.techEquipment.items[0].damageTaken,1);assert.equal(updated.techEquipment.items[0].mechanismBroken,true);
 assert.throws(()=>recoverWithBoiler(updated,rules,{...event,completionHour:31}),/24 hours/);
 const restored=parseCharacter(exportCharacter(updated));assert.equal(restored.craftedItems[0].boilerLastRecoveryHour,8);assert.throws(()=>recoverWithBoiler(restored,rules,event),/24 hours/);
 const again=recoverWithBoiler(restored,rules,{...event,completionHour:32,allocations:[{instanceId:axe.instanceId,points:2}]});assert.equal(again.techEquipment.items[0].reservoir,4);
 const party=recoverWithBoiler(c,rules,{...event,allocations:[],externalPoints:4});assert.equal(party.craftedItems[0].boilerLastRecoveryHour,8);assert.equal(party.techEquipment.items[0].reservoir,0);assert.throws(()=>recoverWithBoiler(c,rules,{...event,externalPoints:1}),/total/);
 const before=JSON.stringify(c);assert.throws(()=>recoverWithBoiler(c,rules,{...event,restConfirmed:false}),/Confirm/);assert.throws(()=>recoverWithBoiler(c,rules,{...event,allocations:[{instanceId:axe.instanceId,points:4},{instanceId:suit.instanceId,points:1}]}),/total/);assert.throws(()=>recoverWithBoiler(c,rules,{...event,allocations:[{instanceId:suit.instanceId,points:4}]}),/capacity/);assert.throws(()=>recoverWithBoiler(c,rules,{...event,allocations:[{instanceId:axe.instanceId,points:1.5}]}),/whole/);assert.throws(()=>recoverWithBoiler(c,rules,{...event,allocations:[{instanceId:'missing',points:1}]}),/owned/);assert.throws(()=>recoverWithBoiler(c,rules,{...event,allocations:[{instanceId:axe.instanceId,points:1},{instanceId:axe.instanceId,points:1}]}),/once/);assert.equal(JSON.stringify(c),before);
 assert.match(renderCrafted(updated,false,rules),/data-boiler-recover="boiler"/);assert.match(renderCrafted(updated,true,rules),/Last recovery: campaign day 1, hour 8/);
});

test('ordinary utility tools price, carry, import and keep their bonuses conditional',()=>{
 for(const [id,price] of [['work-lamp',25],['inspection-lens',50],['portable-winch',75]]){const d=gadgetDesign(id,'utility');assert.equal(d.technology,false);assert.equal(priceMagicItem(d).market,price);assert.equal(priceMagicItem(d).materials,price/2);assert.equal(priceMagicItem(d).dc,null);assert.deepEqual(parseDesign(exportDesign(d)),d);assert.equal(rules.equipment.items.find(x=>x.id===id).cost.gp,price);}
 const c=make(),before=equipmentSheet(c,rules);inventoryAction(c,rules,'add','inspection-lens');let s=equipmentSheet(c,rules);assert.equal(s.equipment.inspectionBonus,2);assert.equal(s.stats['skill.disable-device'].total,before.stats['skill.disable-device'].total);assert.equal(s.stats['skill.perception'].total,before.stats['skill.perception'].total);assert.match(s.equipment.traitRules.find(t=>t.name==='Inspection lens').text,/pick an accessible lock or open a safe/);
 inventoryAction(c,rules,'add','inspection-lens');assert.equal(equipmentSheet(c,rules).equipment.inspectionBonus,2);assert.equal(equipmentSheet(parseCharacter(exportCharacter(c)),rules).equipment.inspectionBonus,2);
 inventoryAction(c,rules,'remove','inspection-lens');inventoryAction(c,rules,'remove','inspection-lens');assert.equal(equipmentSheet(c,rules).equipment.inspectionBonus,0);
 use(c,gadgetDesign('inspection-lens','lens'),'crafted-lens');assert.equal(equipmentSheet(c,rules).equipment.inspectionBonus,2);craftedAction(c,rules,'crafted-lens','equip');assert.equal(equipmentSheet(c,rules).equipment.inspectionBonus,0);
});

test('catalogue gadgets add independent equipment copies with fixed half-price crafting',()=>{
 const c=make();
 for(const id of ['omni-tool','masterwork-omni-tool','darkvision-goggles-30','darkvision-goggles-60','camp-boiler-2','camp-boiler-4','camp-boiler-8','work-lamp','inspection-lens','portable-winch']){
  const item=rules.equipment.items.find(i=>i.id===id);assert.ok(item);assert.equal(item.craftingCostGp,item.cost.gp/2);
  inventoryAction(c,rules,'add',id);assert.equal(priceMagicItem(gadgetDesign(id,'fixed')).materials,item.cost.gp/2);
 }
 assert.equal(c.craftedItems.length,7);assert.equal(c.carriedEquipment['inspection-lens'],1);
 const goggles=c.craftedItems.find(i=>i.design.effects[0].target==='darkvision-goggles-30');craftedAction(c,rules,goggles.instanceId,'equip');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,30);
 inventoryAction(c,rules,'add','camp-boiler-2');const boilers=c.craftedItems.filter(i=>i.design.effects[0].target==='camp-boiler-2');assert.equal(boilers.length,2);assert.notEqual(boilers[0].instanceId,boilers[1].instanceId);
 assert.match(renderCrafted(c,false,rules),/Recover up to 2 reservoir points/);assert.equal(parseCharacter(exportCharacter(c)).craftedItems.length,8);
 craftedAction(c,rules,goggles.instanceId,'remove');assert.equal(equipmentSheet(c,rules).equipment.darkvisionFt,0);
});

test('campaign crafting scales enhancement and integration without increasing progress multiplier',()=>{
 const mk1=design([effect('weapon',1)],{technology:true,techLevel:1,slot:'weapon',baseId:'drive-sword',basePrice:350,adaptations:['elemental-fire']});
 const mk2={...mk1,effects:[effect('weapon',2)],adaptations:['elemental-fire','penetrating-2']};
 let p=priceMagicItem(mk1);assert.equal(p.dc,15);assert.equal(p.workRequired,2500);assert.equal(p.materials,3150);assert.equal(p.progressMultiplier,15);
 p=priceMagicItem(mk2);assert.equal(p.dc,25);assert.equal(p.workRequired,7510);assert.equal(p.materials,8160);assert.equal(p.progressMultiplier,15);
 assert.equal(priceMagicItem({...mk2,techLevel:20}).dc,25);
 assert.equal(priceMagicItem({...mk2,effects:[effect('weapon',3)]}).dc,30);
 const rush=priceMagicItem({...mk2,accelerated:true});assert.equal(rush.dc,30);assert.equal(rush.progressMultiplier,20);assert.equal(rush.workRequired,7510);
 assert.equal(priceMagicItem(design([effect('weapon',3)],{slot:'weapon',baseId:'longsword'})).dc,20);
 const magic=priceMagicItem(design([effect('weapon',1)],{slot:'weapon',baseId:'longsword'}));
 const tech=priceMagicItem({...mk1,adaptations:[]});assert.equal(magic.workRequired,tech.workRequired);assert.equal(magic.dc,tech.dc);
});
test('daily work treats exact success and five-point failure correctly, including rushing and bounds',()=>{
 const plan={dc:20,progressMultiplier:20,workRequired:2500};
 assert.equal(craftingDay(plan,{roll:20,bonus:10}).change,600);
 assert.equal(craftingDay(plan,{roll:10,bonus:10}).change,400);
 assert.equal(craftingDay(plan,{roll:6,bonus:10,progress:500}).outcome,'No progress');
 assert.equal(craftingDay(plan,{roll:5,bonus:10,progress:500}).progress,100);
 assert.equal(craftingDay(plan,{roll:5,bonus:10,progress:100}).progress,0);
 assert.equal(craftingDay(plan,{roll:20,bonus:10,progress:2400}).progress,2500);
 assert.throws(()=>craftingDay(plan,{roll:21,bonus:10}));
 for(const specialist of [false,true]){
  assert.equal(precisionRigBonus({technology:true,rushing:true,specialist}),specialist?10:5);
  assert.equal(precisionRigBonus({technology:false,rushing:true,specialist}),specialist?4:2);
  assert.equal(precisionRigBonus({technology:true,rushing:false,specialist}),specialist?4:2);
 }
 const rig=rules.technology.families.flatMap(f=>f.actions).find(a=>a.id==='precision-rig');assert.equal(rig.quickCraftTechnologyOnly,true);assert.equal(rig.cost,3);
});

test('six minor adaptations fit a masterwork weapon, retain integration and grant no magical damage',()=>{
 const d=design([effect('weapon',0)],{technology:true,slot:'weapon',baseId:'longsword',basePrice:15,adaptations:['deadly','brace','trip','blocking','distracting','disarm']});
 const p=priceMagicItem(d);assert.equal(p.market,780);assert.equal(p.dc,35);assert.equal(p.integrationDC,25);assert.equal(p.workRequired,233);
 assert.throws(()=>priceMagicItem({...d,adaptations:[...d.adaptations,'elemental-fire']}),/enhancement cost/);
 const c=make();equip(c,rules,'weaponId','longsword');const base=equipmentSheet(c,rules);use(c,d,'masterwork');const sheet=equipmentSheet(c,rules);assert.equal(sheet.stats.attack.total,base.stats.attack.total+1);assert.equal(sheet.stats.damage.total,base.stats.damage.total);assert.ok(sheet.equipment.traits.includes('disarm'));
 assert.deepEqual(parseDesign(exportDesign(d)),d);
});

test('pair integration adds price, half materials and work, with only new pairs charged on upgrade',()=>{
 const ids=['deadly','brace','trip','blocking','distracting','disarm'];
 for(let n=0;n<=6;n++){
  const d=design([effect('weapon',0)],{technology:true,slot:'weapon',baseId:'longsword',basePrice:15,adaptations:ids.slice(0,n)});
  const p=priceMagicItem(d),parts=[20,20,25,25,25,50].slice(0,n).reduce((a,b)=>a+b,0),fee=n<2?0:20*n*(n-1)/2;
  assert.equal(p.market,315+parts+fee);assert.equal(p.materials,315+(parts+fee)/2);assert.equal(p.workRequired,Math.ceil((parts+fee)/2));
  assert.equal(p.lines.find(l=>l.name==='Modification integration')?.price??0,fee);
 }
 const first=design([effect('weapon',0)],{technology:true,slot:'weapon',baseId:'longsword',basePrice:15,adaptations:ids.slice(0,5)});
 const second=nextMark(first,'six-minors');second.adaptations.push('disarm');
 const delta=upgradeDifference(second);assert.equal(delta.marketDue,150);assert.equal(delta.materialsDue,75);
 assert.equal(priceMagicItem(second).workRequired-priceMagicItem(first).workRequired,75);
 assert.deepEqual(parseDesign(exportDesign(second)),second);
});
