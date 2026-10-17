import {priceMagicItem} from '../../pathfinder-character/engine/magic-items.mjs';
import {migrateBowDesign} from '../../pathfinder-character/engine/bows.mjs';
export const KEY='character-creators/pathfinder/magic-workshop-v1';
export function parseDesign(input){if(input?.fileType!=='pf1-magic-item'||input.schemaVersion!==1)throw Error('Choose a Pathfinder magic-item JSON file.');const item=migrateBowDesign(input.item);priceMagicItem(item);return item;}
export function exportDesign(item){item=migrateBowDesign(item);priceMagicItem(item);return {fileType:'pf1-magic-item',schemaVersion:1,item};}
export function readDesigns(storage){const raw=storage.getItem(KEY);if(!raw)return [];const list=JSON.parse(raw);if(!Array.isArray(list)||list.length>200)throw Error('Saved workshop data could not be read. It has not been replaced.');const migrated=list.map(migrateBowDesign);for(const d of migrated)priceMagicItem(d);return migrated;}
export function saveDesign(storage,item){item=migrateBowDesign(item);priceMagicItem(item);const list=readDesigns(storage),index=list.findIndex(x=>x.id===item.id);if(index<0){if(list.length>=200)throw Error('Workshop is full. Export and remove a design first.');list.push(item);}else list[index]=item;storage.setItem(KEY,JSON.stringify(list));}
export function deleteDesign(storage,id){const list=readDesigns(storage);storage.setItem(KEY,JSON.stringify(list.filter(d=>d.id!==id)));}
