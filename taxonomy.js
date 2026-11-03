/* One explicit vocabulary for editing and public filtering. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuTaxonomy=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const topics=[{id:'festive',label:'節慶祝福'},{id:'daily',label:'校園日常'},{id:'idioms',label:'成語學習'},{id:'other',label:'其他主題'}],dimensions={characters:'角色',holidays:'節日',situations:'使用情境'};
 function legacyTopic(p){const text=`${p.category||'日常'} ${p.title||''} ${p.series||''}`;if(/成語/.test(text))return 'idioms';if(/萬聖|生日|節慶|兒童節|新年|跨年|賀歲|感恩|聖誕|端午|中秋|春節|元宵|清明|七夕|母親節|父親節|教師節|國慶|光復|雙十|復活|情人節/.test(text))return 'festive';if(/日常|校園|教學|上課|考試|讀書|工作|熬夜|加班|單字|英文|角色|班導|午餐|放學/.test(text))return 'daily';return 'other';}
 const topicFor=p=>topics.some(t=>t.id===p.catalogTags?.topic)?p.catalogTags.topic:legacyTopic(p);
 function tagsFor(p={}){return p.catalogTags?{topic:topicFor(p),...Object.fromEntries(Object.keys(dimensions).map(k=>[k,Array.isArray(p.catalogTags[k])?[...p.catalogTags[k]]:[]]))}:{topic:legacyTopic(p),characters:[],holidays:[],situations:[]};}
 function check(tags){
  if(!tags||typeof tags!=='object'||Array.isArray(tags)||!topics.some(t=>t.id===tags.topic))throw new Error('貼圖主題設定不正確。');
  for(const key of Object.keys(dimensions))if(!Array.isArray(tags[key])||tags[key].length>12||new Set(tags[key]).size!==tags[key].length||tags[key].some(v=>typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>40||/[\r\n,、，]/.test(v)))throw new Error(dimensions[key]+'標籤最多 12 個，每個 40 字且不可重複。');
  return tags;
 }
 function parse(values){const tags={topic:values.topic};for(const key of Object.keys(dimensions))tags[key]=[...new Set(String(values[key]||'').split(/[,，、\r\n]+/).map(v=>v.trim()).filter(Boolean))];return check(tags);}
 function validate(site){for(const key of ['lineProducts','gallery','festivals'])for(const p of site[key]||[])if(p.catalogTags!==undefined)check(p.catalogTags);return site;}
 const matches=(p,state={})=>{const tags=tagsFor(p);return Object.entries({character:'characters',holiday:'holidays',situation:'situations'}).every(([field,key])=>!state[field]||tags[key].includes(state[field]));};
 const options=(items,key)=>[...new Set(items.filter(p=>p.published!==false).flatMap(p=>tagsFor(p)[key]||[]))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
 const searchText=p=>Object.values(tagsFor(p)).flat().join(' ');
 return {topics,dimensions,topicFor,tagsFor,check,parse,validate,matches,options,searchText};
});
