import {hasAdditionalTraits,additionalTraitOptions,BACKGROUNDS} from './backgrounds.mjs';
import {choicePicker} from './choice-picker.mjs';
export function renderAdditionalTraits(c){
 if(!hasAdditionalTraits(c))return '';
 let html='<h4>Additional Traits</h4><p>Add two traits to this background, from different unused trait lists.</p>';
 for(let i=0;i<2;i++){
  const value=c.background?.traits?.[i]??'',trait=BACKGROUNDS.find(t=>t.id===value);
  html+=choicePicker({label:'Additional trait '+(i+1),value,name:trait?.name,field:'background.trait.'+i,placeholder:'Choose a trait',groups:[{items:[{id:'',name:'Choose a trait',description:'Clear this selection.'},...additionalTraitOptions(c.background,i)]}]});
 }
 return html;
}
