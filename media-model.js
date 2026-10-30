/* Shared image catalog and immutable library operations. Image strings remain the public content contract. */
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./content-models.js'):root.TutuContent,node?require('./festival-model.js'):root.TutuFestivals);if(node)module.exports=api;else root.TutuMedia=api;})(typeof window==='undefined'?globalThis:window,function(content,festivals){
 'use strict';
 const fixed=['assets/tutu-hero.webp','assets/tutu-boy.webp','assets/tutu-girl.webp','assets/tutu-original.webp','assets/works/002.webp','assets/works/003.webp','assets/works/009.webp','assets/og-cover.png','assets/icon-192.png','assets/icon-512.png'];
 function validate(site){
  if(site.mediaLibrary===undefined)return site;const list=site.mediaLibrary;if(!Array.isArray(list)||list.length>500)throw new Error('素材庫必須是清單，最多 500 張。');
  const seen=new Set();for(const item of list){if(!item||!content.safeImage(item.image))throw new Error('素材圖片必須是網站內圖片或上傳的圖片。');if(seen.has(item.image))throw new Error('素材圖片重複。');seen.add(item.image);
   for(const [key,max,required] of [['name',120,true],['category',80,false],['alt',200,false]])if(item[key]!==undefined||required){if(typeof item[key]!=='string'||item[key].length>max||(required&&!item[key].trim()))throw new Error('素材名稱、分類或說明格式不正確。');}
   for(const key of ['width','height'])if(item[key]!==undefined&&(!Number.isInteger(item[key])||item[key]<1||item[key]>20000))throw new Error('素材尺寸不正確。');
  }return site;
 }
 function catalog(site,base){
  const map=new Map();const add=(image,name,category,alt,use)=>{if(!content.safeImage(image))return;let item=map.get(image);if(!item){item={image,name:(typeof name==='string'&&name.trim()?name:'未命名圖片').slice(0,120),category:typeof category==='string'?category:'',alt:typeof alt==='string'?alt:'',saved:false,uses:[]};map.set(image,item);}if(use)item.uses.push(use);};
  for(const [key,kind] of [['gallery','作品'],['lineProducts','LINE 貼圖']])for(const x of site[key]||[])add(x.image,x.title,x.category,x.imageAlt,{kind:key,id:x.id,label:`${kind}｜${x.title}${x.published===false?'（已隱藏）':''}`});
  for(const x of content.charactersFor(site))add(x.image,x.name,'人物夥伴',x.imageAlt,{kind:'characters',id:x.id,label:`人物｜${x.name}${x.published===false?'（已隱藏）':''}`});
  const works=new Map((site.gallery||[]).map(x=>[x.id,x]));
  for(const x of festivals.festivalsFor(site,base)){
   const title=x.subtitle||x.holidayName,label=`節慶｜${x.holidayName||title}${x.subtitle&&x.subtitle!==x.holidayName?'｜'+x.subtitle:''}${x.published===false?'（已隱藏）':''}`;
   add(x.image,title,'節慶系列',x.imageAlt,x.coverWorkId?null:{kind:'festivals',id:x.id,label:label+'（封面）'});
   if(x.coverWorkId){const cover=works.get(x.coverWorkId);if(cover)add(cover.image,cover.title,cover.category,cover.imageAlt,{kind:'festivals',id:x.id,label:label+'（連動封面）'});}
   for(const id of x.workIds||[]){const work=works.get(id);if(work)add(work.image,work.title,work.category,work.imageAlt,{kind:'festivals',id:x.id,label:label+'（輪播作品）'});}
  }
  if(site.settings?.festivalImage)add(site.settings.festivalImage,'節慶設定圖片','節慶系列',site.settings.festivalImageAlt,{kind:'settings',id:'festivalImage',label:'舊版節慶設定'});
  for(const image of fixed)add(image,image.split('/').at(-1),'網站固定圖','',{kind:'fixed',id:image,label:'網站固定展示圖片'});
  for(const x of site.mediaLibrary||[]){add(x.image,x.name,x.category,x.alt);const row=map.get(x.image);Object.assign(row,x,{saved:true});}
  return [...map.values()];
 }
 function commit(site,list){const next={...site,mediaLibrary:list};validate(next);return next;}
 function save(site,image,fields){
  const row=catalog(site).find(x=>x.image===image);if(!row)throw new Error('素材已不存在，請重新選取。');const list=(site.mediaLibrary||[]).slice(),i=list.findIndex(x=>x.image===image);
  const item={...(i>=0?list[i]:{}),image,name:String(fields.name??'').trim(),category:String(fields.category??'').trim(),alt:String(fields.alt??'').trim()};if(i<0)list.push(item);else list[i]=item;return commit(site,list);
 }
 function add(site,records){
  if(!Array.isArray(records)||records.length>500)throw new Error('上傳素材必須是清單，最多 500 張。');for(const record of records)validate({mediaLibrary:[record]});const list=(site.mediaLibrary||[]).slice(),images=new Set(catalog(site).map(x=>x.image));for(const item of records)if(!images.has(item.image)){list.push({...item});images.add(item.image);}return commit(site,list);
 }
 function picked(site,images){if(!Array.isArray(images)||!images.length)throw new Error('請先勾選素材。');const rows=catalog(site),result=[...new Set(images)].map(image=>rows.find(x=>x.image===image));if(result.some(x=>!x))throw new Error('素材已不存在，請重新選取。');return result;}
 function batch(site,images,category){if(typeof category!=='string'||category.trim().length>80)throw new Error('素材分類最多 80 字。');let next=site;for(const row of picked(site,images))next=save(next,row.image,{...row,category});return next;}
 function remove(site,images){const rows=picked(site,images);if(rows.some(x=>x.uses.length||!x.saved))throw new Error('只能移除未使用且已儲存在素材庫的圖片；使用中的素材受到保護。');const keys=new Set(images);return commit(site,(site.mediaLibrary||[]).filter(x=>!keys.has(x.image)));}
 const matches=(row,f={})=>(!f.category||row.category===f.category)&&(!f.usage||(f.usage==='used'?row.uses.length>0:row.uses.length===0))&&`${row.name} ${row.category} ${row.alt} ${row.uses.map(x=>x.label).join(' ')}`.toLocaleLowerCase().includes((f.query||'').trim().toLocaleLowerCase());
 const select=(images,rows,filters)=>{const visible=new Set(rows.filter(x=>matches(x,filters)).map(x=>x.image));return [...new Set(images)].filter(x=>visible.has(x));};
 const checkpoint=(before,after)=>structuredClone({before:before.mediaLibrary,after:after.mediaLibrary});
 function undo(site,token){if(JSON.stringify(site.mediaLibrary)!==JSON.stringify(token.after))throw new Error('素材庫已有其他修改，無法直接復原。');const next={...site};if(token.before===undefined)delete next.mediaLibrary;else next.mediaLibrary=structuredClone(token.before);return next;}
 const ready=s=>s.formsReady===true&&s.publishReady===true&&!s.busy&&!s.pending;
 const bytes=image=>image.startsWith('data:')?Math.max(0,Math.floor((image.split(',')[1]||'').replace(/\s/g,'').length*3/4)-(image.endsWith('==')?2:image.endsWith('=')?1:0)):null;
 return {catalog,validate,save,add,batch,remove,matches,select,checkpoint,undo,ready,bytes};
});
