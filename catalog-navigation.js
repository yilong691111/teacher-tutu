/* Visitor-facing grouping only; stored categories and content are never rewritten. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./category-model.js'):root.TutuCategories,node?require('./content-models.js'):root.TutuContent);if(node)module.exports=api;else root.TutuCatalogNavigation=api;})(typeof window==='undefined'?globalThis:window,function(categories,content){
 'use strict';
 const topics=[{id:'all',label:'全部貼圖'},{id:'festive',label:'節慶祝福'},{id:'daily',label:'校園日常'},{id:'idioms',label:'成語學習'},{id:'other',label:'其他主題'}];
 const categoryOf=item=>categories.category(item,'lineProducts');
 const products=site=>(Array.isArray(site.lineProducts)?site.lineProducts:[]).filter(p=>p&&p.published!==false&&typeof p.id==='string'&&/^\d{1,20}$/.test(p.id)&&p.url===`https://store.line.me/stickershop/product/${p.id}/zh-Hant`&&typeof p.title==='string'&&p.title.trim()&&content.safeImage(p.image));
 function topicFor(p){const text=`${categoryOf(p)} ${p.title||''} ${p.series||''}`;if(/成語/.test(text))return 'idioms';if(/萬聖|生日|節慶|兒童節|新年|跨年|賀歲|感恩|聖誕|端午|中秋|春節|元宵|清明|七夕|母親節|父親節|教師節|國慶|光復|雙十|復活|情人節/.test(text))return 'festive';if(/日常|校園|教學|上課|考試|讀書|工作|熬夜|加班|單字|英文|角色|班導|午餐|放學/.test(text))return 'daily';return 'other';}
 const topicOptions=items=>topics.map(t=>({...t,count:items.filter(p=>t.id==='all'||topicFor(p)===t.id).length})).filter(t=>t.id==='all'||t.count>0);
 function filterProducts(items,state={}){const q=(state.query||'').trim().toLocaleLowerCase();return items.filter(p=>(!state.topic||state.topic==='all'||topicFor(p)===state.topic)&&(!state.category||categoryOf(p)===state.category)&&`${p.title} ${categoryOf(p)} ${p.series||''}`.toLocaleLowerCase().includes(q));}
 const categoryOptions=(site,items,topic)=>categories.publicNames({...site,lineProducts:filterProducts(items,{topic})},'lineProducts');
 function gallerySeries(site,category='全部'){return [...new Set((site.gallery||[]).filter(w=>w.published!==false&&(category==='全部'||categories.category(w,'gallery')===category)&&typeof w.series==='string'&&w.series.trim()).map(w=>w.series))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));}
 const seriesState=(site,category,selected)=>{const options=gallerySeries(site,category);return {options,value:options.includes(selected)?selected:'全部'};};
 return {products,categoryOf,topicFor,topicOptions,filterProducts,categoryOptions,gallerySeries,seriesState};
});
