/* Pure category, batch and guarded Undo rules for publishable collections. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuCategories=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const defaults={gallery:['萬聖節','生日祝福','12年國教七年級成語','賀新年','成語','日常','角色','其他'],lineProducts:['萬聖節','生日祝福','12年國教七年級常用成語','日常']};
 const checkKey=key=>{if(!Object.hasOwn(defaults,key))throw new Error('不支援這個分類清單。');};
 const category=(item,key)=>(typeof item.category==='string'?item.category.trim():'')||(key==='gallery'?'其他':'日常');
 function name(value){if(typeof value!=='string'||!value.trim()||value.trim().length>100||['全部','全部作品','全部貼圖'].includes(value.trim()))throw new Error('分類名稱不可空白、超過 100 字或使用「全部」。');return value.trim();}
 function names(site,key){checkKey(key);return [...new Set([...(site.categoryLists?.[key]??defaults[key]),...(site[key]||[]).map(x=>category(x,key))])];}
 function validate(site){
  const r=site.categoryLists;if(r===undefined)return site;
  if(!r||typeof r!=='object'||Array.isArray(r))throw new Error('分類資料必須是清單設定。');
  for(const [key,list] of Object.entries(r)){checkKey(key);if(!Array.isArray(list)||list.length>200)throw new Error('分類必須是清單，最多 200 個。');const seen=new Set();for(const value of list){const n=name(value);if(n!==value)throw new Error('分類名稱前後不可有空白。');if(seen.has(n))throw new Error('分類名稱重複。');seen.add(n);}}
  return site;
 }
 const withNames=(site,key,list,items=site[key]||[])=>{const next={...site,[key]:items,categoryLists:{...(site.categoryLists||{}),[key]:list}};validate(next);return next;};
 function categoryAction(site,key,action,from,to){
  checkKey(key);from=name(from);let list=names(site,key),items=site[key]||[];const index=list.indexOf(from);
  if(action==='add'){if(index>=0)throw new Error('這個分類已存在。');return withNames(site,key,[...list,from]);}
  if(index<0)throw new Error('這個分類已不存在，請重新整理清單。');
  if(action==='rename'||action==='merge'){
   to=name(to);if(from===to)throw new Error('請輸入不同的分類名稱。');if(action==='rename'&&list.includes(to))throw new Error('目標分類已存在，請改用合併。');if(action==='merge'&&!list.includes(to))throw new Error('合併目標分類不存在。');
   items=items.map(item=>category(item,key)===from?{...item,category:to}:item);list=[...new Set(list.map(n=>n===from?to:n))];
  }else if(action==='remove'){
   if(items.some(item=>category(item,key)===from))throw new Error('這個分類仍有作品使用，請先合併或移到其他分類。');list=list.filter(n=>n!==from);
  }else if(action==='up'||action==='down'){
   const next=index+(action==='up'?-1:1);if(next>=0&&next<list.length)[list[index],list[next]]=[list[next],list[index]];
  }else throw new Error('不支援這個分類操作。');
  return withNames(site,key,list,items);
 }
 function batch(site,key,ids,patch={},position=''){
  checkKey(key);if(!Array.isArray(ids)||!ids.length)throw new Error('請先勾選要調整的作品。');const selected=new Set(ids),items=site[key]||[];
  if(ids.some(id=>!items.some(item=>item.id===id)))throw new Error('勾選的作品已不存在，請重新選取。');
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('批次欄位不正確。');
  const allowed=key==='gallery'?['category','published','featured']:['category','published'];for(const field of Object.keys(patch))if(!allowed.includes(field))throw new Error('不支援這個批次欄位。');
  if(patch.category!==undefined&&(!names(site,key).includes(name(patch.category))||patch.category!==name(patch.category)))throw new Error('請先新增目標分類。');
  for(const field of ['published','featured'])if(Object.hasOwn(patch,field)&&typeof patch[field]!=='boolean')throw new Error('批次欄位必須是勾選狀態。');
  if(!['','top','bottom'].includes(position))throw new Error('排序位置不正確。');
  let next=items.map(item=>selected.has(item.id)?{...item,...patch}:item);
  if(position){const chosen=next.filter(x=>selected.has(x.id)),rest=next.filter(x=>!selected.has(x.id));next=position==='top'?[...chosen,...rest]:[...rest,...chosen];}
  return {...site,[key]:next};
 }
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function checkpoint(before,after,key){checkKey(key);return structuredClone({key,before:before[key]||[],after:after[key]||[],beforeNames:before.categoryLists?.[key],afterNames:after.categoryLists?.[key],hadRegistry:before.categoryLists!==undefined});}
 function undo(site,token){
  checkKey(token.key);if(!equal(site[token.key]||[],token.after)||!equal(site.categoryLists?.[token.key],token.afterNames))throw new Error('這份清單已有其他修改，無法復原；請使用備份還原。');
  const next={...site,[token.key]:structuredClone(token.before)},registry={...(site.categoryLists||{})};
  if(token.beforeNames===undefined)delete registry[token.key];else registry[token.key]=structuredClone(token.beforeNames);
  if(!token.hadRegistry&&!Object.keys(registry).length)delete next.categoryLists;else next.categoryLists=registry;
  return next;
 }
 const visibleSelection=(ids,items)=>{const visible=new Set(items.map(x=>x.id));return [...new Set(ids)].filter(id=>visible.has(id));};
 function publicNames(site,key){
  const items=(site[key]||[]).filter(x=>x.published!==false);let list=names(site,key);
  if(key==='lineProducts'){if(site.categoryLists?.[key]===undefined)list=[...new Set(items.map(x=>category(x,key)))];return list.filter(n=>items.some(x=>category(x,key)===n));}
  return list.filter(n=>items.some(x=>category(x,key)===n));
 }
 const mutationReady=state=>state.formsReady===true&&state.publishReady===true&&!state.busy&&!state.pending;
 return {names,category,validate,categoryAction,batch,checkpoint,undo,visibleSelection,publicNames,mutationReady};
});
