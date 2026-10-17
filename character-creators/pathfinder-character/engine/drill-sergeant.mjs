import {archetypeIds} from './archetypes.mjs';
import martial from './martial-options-data.mjs';
import feats from './feat-progression-data.mjs';
export const drillLevel=c=>archetypeIds(c).includes('drill-sergeant')?(c.classes.fighter??0):0;
export function drillSummary(c,w,activeFeats,catalogue){const n=drillLevel(c);if(!n)return null;
 const known=activeFeats.filter(f=>f.active&&feats.teamwork.includes(f.featId)),bonusIds=new Set((c.feats??[]).filter(f=>[2,9,17].filter(l=>l<=n).some(l=>f.creatorSlot==='drill-sergeant-teamwork-'+l)).map(f=>f.featId));
 const group=martial.weaponGroups.find(g=>g.id===c.builder?.classOptions?.['fighter-training-5']),training=n>=5?1+Math.floor((n-5)/4):0,weaponMatches=!!group&&(group.weapons.includes(w?.id)||w?.tech?.family===group.id);
 return {tactician:n>=2,usesPerDay:n>=2?1+Math.floor(n/5):0,durationRounds:3+Math.floor(n/2),action:n>=9?'swift':'standard',sharedFeatCount:n>=17?2:1,shareableFeats:[...new Set(known.filter(f=>n>=17||bonusIds.has(f.featId)).map(f=>f.featId))].map(id=>({id,name:catalogue.find(f=>f.id===id)?.name??id})),trainingGroup:group?.name??null,trainerAvailable:n>=13,trainerActive:n>=13&&weaponMatches,allyTrainingBonus:n>=13&&weaponMatches?Math.floor(training/2):0};}
