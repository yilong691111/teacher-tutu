/* Calendar collections and playback rules; no storage, timers or network. */
(function(root,factory){'use strict';const content=typeof module==='object'&&module.exports?require('./content-models.js'):root.TutuContent;const api=factory(content);if(typeof module==='object'&&module.exports)module.exports=api;else root.TutuFestivals=api;})(typeof window==='undefined'?globalThis:window,function(content){
 'use strict';
 const defaults={festivalTitle:'塗塗的日常',festivalSubtitle:'羊年賀歲祝福',festivalDescription:'',festivalTags:'',festivalImage:'assets/works/009.webp',festivalImageAlt:'塗塗節慶作品',festivalButtonText:'看看系列 →',festivalButtonLink:'#gallery'};
 function festivalsFor(site,base=defaults){
  if(site.festivals!==undefined)return site.festivals;
  const s={...defaults,...base,...site.settings};
  return [{id:'legacy-festival',title:s.festivalTitle,subtitle:s.festivalSubtitle,holidayName:s.festivalSubtitle||'節慶系列',eventDate:'',description:s.festivalDescription,tags:s.festivalTags,image:s.festivalImage,imageAlt:s.festivalImageAlt,buttonText:s.festivalButtonText,buttonLink:s.festivalButtonLink,workIds:[],published:true}];
 }
 function validDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.slice(0,4)==='0000')return false;
  const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
 }
 function validateRecord(item){
  if(!item||typeof item.id!=='string'||! /^[\w-]{1,100}$/.test(item.id))throw new Error('節慶系列識別碼不正確。');
  for(const [key,label,max,required] of [['title','主標題',90,true],['subtitle','系列名稱',90,false],['holidayName','節日名稱',90,true],['description','介紹',1500,false],['tags','標籤',500,false],['imageAlt','圖片說明',200,true],['buttonText','按鈕文字',80,true]]){
   const v=item[key];if(v===undefined&&!required)continue;if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('節慶系列'+label+'格式不正確或超過字數限制。');
  }
  if(!(item.id==='legacy-festival'&&item.eventDate==='')&&!validDate(item.eventDate))throw new Error('節慶日期請填寫有效的西元年/月/日。');
  const tags=(item.tags||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(tags.length>8||tags.some(s=>s.length>40))throw new Error('節慶系列最多 8 個標籤，每個最多 40 字。');
  if(!content.safeImage(item.image))throw new Error('節慶系列圖片不正確。');if(!content.safeLink(item.buttonLink))throw new Error('節慶系列連結必須是官網區塊或 HTTPS 網址。');
  if(typeof item.published!=='boolean')throw new Error('節慶系列展示狀態不正確。');
  if(!Array.isArray(item.workIds)||item.workIds.length>100||new Set(item.workIds).size!==item.workIds.length||item.workIds.some(id=>typeof id!=='string'||! /^[\w-]{1,100}$/.test(id)))throw new Error('節慶系列作品選取不正確，最多 100 件且不可重複。');
  if(item.coverWorkId!==undefined&&item.coverWorkId!==''&&(typeof item.coverWorkId!=='string'||! /^[\w-]{1,100}$/.test(item.coverWorkId)))throw new Error('節慶系列封面來源不正確。');
 }
 function validate(site){
  if(site.festivals===undefined)return site;if(!Array.isArray(site.festivals)||site.festivals.length>200)throw new Error('節慶系列必須是清單，最多 200 個系列。');
  const ids=new Set();for(const item of site.festivals){validateRecord(item);if(ids.has(item.id))throw new Error('節慶系列識別碼重複。');ids.add(item.id);}return site;
 }
 function saveFestival(list,originalId,fields){
  const index=originalId?list.findIndex(f=>f.id===originalId):-1;if(originalId&&index<0)throw new Error('這個節慶系列已不存在，請重新開啟。');
  if(originalId&&fields.id!==originalId)throw new Error('不能修改既有節慶系列識別碼。');
  if(list.some((f,i)=>f.id===fields.id&&i!==index))throw new Error('節慶系列識別碼重複。');
  const item={...(index>=0?list[index]:{}),...fields,workIds:[...fields.workIds]};validateRecord(item);
  const next=list.slice();if(index<0)next.push(item);else next[index]=item;validate({festivals:next});return next;
 }
 function ordered(list){return list.slice().sort((a,b)=>(a.eventDate||'9999-99-99').localeCompare(b.eventDate||'9999-99-99')||(a.holidayName||'').localeCompare(b.holidayName||'','zh-Hant')||a.id.localeCompare(b.id));}
 function select(list,filter={}){return ordered(list.filter(f=>f.published!==false&&(!filter.year||f.eventDate.slice(0,4)===String(filter.year))&&(!filter.month||Number(f.eventDate.slice(5,7))===Number(filter.month))&&(!filter.day||Number(f.eventDate.slice(8,10))===Number(filter.day))&&(!filter.holiday||f.holidayName===filter.holiday)));}
 function frames(list,gallery){
  const works=new Map(gallery.filter(w=>w.published!==false&&content.safeImage(w.image)).map(w=>[w.id,w]));
  return list.filter(f=>f.published!==false).flatMap(f=>{
   const result=[],seen=new Set();const add=(image,imageAlt,workTitle,workId='')=>{if(content.safeImage(image)&&!seen.has(image)){seen.add(image);result.push({festival:f,image,imageAlt,workTitle,workId});}};
   const cover=f.coverWorkId?works.get(f.coverWorkId):null;
   if(!f.coverWorkId||cover)add(cover?.image||f.image,f.imageAlt,f.subtitle||f.holidayName);for(const id of f.workIds||[]){const w=works.get(id);if(w)add(w.image,w.title,w.title,w.id);}return result;
  });
 }
 const step=(index,length,delta)=>length?((index+delta)%length+length)%length:0;
 const recoveryId=(site,record)=>record.identity===''&&!Object.hasOwn(record.values,'festival-id')&&site.festivals===undefined?'legacy-festival':record.identity;
 return {festivalsFor,validDate,validate,saveFestival,ordered,select,frames,step,recoveryId};
});
